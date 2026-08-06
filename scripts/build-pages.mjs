import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const outDir = path.join(root, '.pages');
const siteDir = path.join(root, 'site');
const corePkg = JSON.parse(
  await readFile(path.join(root, 'packages/editor-ruler/package.json'), 'utf8'),
);

await rm(outDir, { recursive: true, force: true });
await mkdir(path.join(outDir, 'vendor'), { recursive: true });
await cp(siteDir, outDir, { recursive: true });

// The live playgrounds run on the freshly built bundles.
await cp(
  path.join(root, 'packages/editor-ruler/dist/index.global.js'),
  path.join(outDir, 'vendor', 'editor-ruler.global.js'),
);
await cp(
  path.join(root, 'packages/editor-ruler-froala/dist/index.global.js'),
  path.join(outDir, 'vendor', 'editor-ruler-froala.global.js'),
);
// ESM copies for the import-map-based Tiptap demo.
await cp(
  path.join(root, 'packages/editor-ruler/dist/index.js'),
  path.join(outDir, 'vendor', 'editor-ruler.mjs'),
);
await cp(
  path.join(root, 'packages/editor-ruler-tiptap/dist/index.js'),
  path.join(outDir, 'vendor', 'editor-ruler-tiptap.mjs'),
);
await cp(
  path.join(root, 'packages/editor-ruler-ckeditor5/dist/index.js'),
  path.join(outDir, 'vendor', 'editor-ruler-ckeditor5.mjs'),
);

const indexPath = path.join(outDir, 'index.html');
const index = await readFile(indexPath, 'utf8');
const minor = corePkg.version.split('.').slice(0, 2).join('.');
await writeFile(
  indexPath,
  index
    .replaceAll('__PACKAGE_VERSION__', corePkg.version)
    .replaceAll('__PACKAGE_MINOR__', minor),
);

await writeFile(
  path.join(outDir, 'package.json'),
  JSON.stringify({ name: corePkg.name, version: corePkg.version }, null, 2),
);
