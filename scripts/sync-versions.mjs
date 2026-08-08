/**
 * Single source of truth for every version string in the repo:
 * `packages/editor-ruler/package.json`. Everything else is derived.
 *
 *   node scripts/sync-versions.mjs            rewrite derived files
 *   node scripts/sync-versions.mjs --check    report drift, exit 1 (CI)
 *
 * Derived surfaces:
 *   1. sibling packages' `version`            → exact
 *   2. examples/ dependency pins              → ^exact
 *   3. README CDN pins + pinning tables       → minor in URLs, exact/minor
 *                                               in the table, `X.Y.x` in prose
 *
 * The examples were the surface that drifted (pinned 0.10.0 while the
 * packages shipped 0.16.0), so the StackBlitz demos installed a version
 * without the features the docs advertise. Hence the CI check.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const check = process.argv.includes('--check');

const corePkgPath = path.join(root, 'packages/editor-ruler/package.json');
const version = JSON.parse(await readFile(corePkgPath, 'utf8')).version;
const minor = version.split('.').slice(0, 2).join('.');

/** [file, transform] pairs; transform returns the corrected contents. */
const edits = [];

// 1. sibling packages take the core's exact version
for (const dir of await readdir(path.join(root, 'packages'))) {
  if (dir === 'editor-ruler') continue;
  edits.push([
    path.join('packages', dir, 'package.json'),
    (text) => text.replace(/("version"\s*:\s*")\d+\.\d+\.\d+(")/, `$1${version}$2`),
  ]);
}

// 2. examples pin the current release as their floor
for (const dir of await readdir(path.join(root, 'examples'))) {
  edits.push([
    path.join('examples', dir, 'package.json'),
    (text) =>
      text.replace(
        /("@devslab\/editor-ruler[a-z0-9-]*"\s*:\s*")\^?\d+\.\d+\.\d+(")/g,
        `$1^${version}$2`,
      ),
  ]);
}

// 3. READMEs: CDN URLs carry the minor pin, the pinning table carries both
const readmes = [
  'README.md',
  'README.ko.md',
  ...(await readdir(path.join(root, 'packages'))).flatMap((d) => [
    path.join('packages', d, 'README.md'),
    path.join('packages', d, 'README.ko.md'),
  ]),
];
for (const file of readmes) {
  edits.push([
    file,
    (text) =>
      text
        // <script src=".../@devslab/editor-ruler-froala@0.16/dist/...">
        .replace(
          /(cdn\.jsdelivr\.net\/npm\/@devslab\/[a-z0-9-]+)@\d+\.\d+(\.\d+)?/g,
          `$1@${minor}`,
        )
        // | `@0.16.0` | Exact version …   (3-part first, so it isn't
        //                                  half-eaten by the 2-part rule)
        .replace(/`@\d+\.\d+\.\d+`/g, `\`@${version}\``)
        // | `@0.16` | Latest …
        .replace(/`@\d+\.\d+`/g, `\`@${minor}\``)
        // … Latest `0.16.x` patch …
        .replace(/`\d+\.\d+\.x`/g, `\`${minor}.x\``),
  ]);
}

const drifted = [];
for (const [rel, transform] of edits) {
  const file = path.join(root, rel);
  let before;
  try {
    before = await readFile(file, 'utf8');
  } catch {
    continue; // optional surface (e.g. a package without a .ko.md)
  }
  const after = transform(before);
  if (after === before) continue;
  drifted.push(rel);
  if (!check) await writeFile(file, after);
}

if (drifted.length === 0) {
  console.log(`All version references match ${version}.`);
} else if (check) {
  console.error(
    `Version references are stale (expected ${version}):\n` +
      drifted.map((f) => `  - ${f}`).join('\n') +
      `\n\nRun \`pnpm sync:versions\` and commit the result.`,
  );
  process.exit(1);
} else {
  console.log(`Synced to ${version}:\n` + drifted.map((f) => `  - ${f}`).join('\n'));
}
