import { createHash } from 'node:crypto';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readmes = [
  'README.md',
  'README.ko.md',
  'packages/editor-ruler/README.md',
  'packages/editor-ruler/README.ko.md',
  'packages/editor-ruler-froala/README.md',
  'packages/editor-ruler-froala/README.ko.md',
  'packages/editor-ruler-tiptap/README.md',
  'packages/editor-ruler-tiptap/README.ko.md',
  'packages/editor-ruler-ckeditor5/README.md',
  'packages/editor-ruler-ckeditor5/README.ko.md',
  'packages/editor-ruler-summernote/README.md',
  'packages/editor-ruler-summernote/README.ko.md',
];

const assets = {
  'docs/assets/brand/readme-header.png': '0370b5f1acab7bb653be5ebfd76daf33b2aac4dfd5f4a2b40a2df0d117647128',
  'docs/assets/brand/project-mark.svg': 'f8093b935f64fb1abc42c0048e08a44229dd2b6603f159d9968fc9027a0bff3c',
  'docs/assets/brand/project-lockup.svg': 'ce5df5367b8b90c2542f847b2a83694173e659dd2557cb543414d9ec525c22f3',
  'site/favicon.svg': 'f8093b935f64fb1abc42c0048e08a44229dd2b6603f159d9968fc9027a0bff3c',
  'site/favicon.ico': 'b0cbb97ba184aeaaed7590dd727e89f711355aa030a8ca5c169e025599ddc09b',
  'site/apple-touch-icon.png': 'd01612b8259ea9201f8db887835067da7512f57292a7d0f7ba91194d97838c15',
  'site/og.png': '603914387e62f8ef7fb98f7bedaecb8aeffbf743ac28c467759c5c601e2148f7',
};

const expectedSource = 'https://github.com/devslab-kr/oss-brand/releases/tag/v0.2.0';
const expectedGuide = 'https://devslab.kr/brand/open-source/';

function fail(message) {
  console.error(`Brand check failed: ${message}`);
  process.exitCode = 1;
}

async function sha256(relativePath) {
  const data = await readFile(path.join(root, relativePath));
  return createHash('sha256').update(data).digest('hex');
}

try {
  const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  const verify = packageJson.scripts?.verify ?? '';
  const checkBrand = packageJson.scripts?.['check:brand'] ?? '';
  if (!verify.includes('pnpm check:brand')) {
    fail('package.json verify must run pnpm check:brand as a standard quality gate');
  }
  if (!checkBrand.includes('scripts/check-brand-assets.mjs')) {
    fail('package.json check:brand must run the brand checker directly');
  }
  if (checkBrand.includes('pnpm verify') || checkBrand.includes('npm run verify')) {
    fail('package.json check:brand must not recurse into verify');
  }
} catch {
  fail('missing or invalid package.json verification contract');
}

const manifestPath = 'docs/assets/brand/oss-brand.json';
try {
  const manifest = JSON.parse(await readFile(path.join(root, manifestPath), 'utf8'));
  if (manifest.registryId !== 'O01' || manifest.project !== 'editor-ruler') {
    fail(`${manifestPath} must identify editor-ruler as O01`);
  }
  if (manifest.release !== 'v0.2.0' || manifest.source !== expectedSource || manifest.guide !== expectedGuide) {
    fail(`${manifestPath} must pin oss-brand v0.2.0 and the canonical guide`);
  }
} catch {
  fail(`missing or invalid ${manifestPath}`);
}

for (const [relativePath, expectedHash] of Object.entries(assets)) {
  try {
    await access(path.join(root, relativePath));
    const actualHash = await sha256(relativePath);
    if (actualHash !== expectedHash) fail(`${relativePath} checksum does not match oss-brand v0.2.0`);
  } catch {
    fail(`missing ${relativePath}`);
  }
}

let html = '';
try {
  html = await readFile(path.join(root, 'site/index.html'), 'utf8');
  for (const marker of [
    'data-i18n="brand.oss"',
    expectedGuide,
    'data-atmosphere="project"',
    'hero-atmosphere__glow',
    '@media (max-width: 260px)',
    '.top-inner { flex-wrap: wrap; }',
    'og:image:alt',
  ]) {
    if (!html.includes(marker)) fail(`site/index.html is missing ${marker}`);
  }
} catch {
  fail('missing site/index.html');
}

if (!/\.tabs\s*\{[^}]*flex-wrap:\s*wrap;/.test(html)) {
  fail('site/index.html must wrap demo tabs at narrow widths');
}

if (!html.includes('html, body { overflow-x: clip; }')) {
  fail('site/index.html must clip off-canvas editor menus at 260px');
}

function mediaBlock(source, query) {
  const start = source.indexOf(query);
  if (start === -1) return '';
  const braceStart = source.indexOf('{', start);
  if (braceStart === -1) return '';
  let depth = 0;
  for (let index = braceStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(braceStart + 1, index);
    }
  }
  return '';
}

const darkMode = mediaBlock(html, '@media (prefers-color-scheme: dark)');
if (!darkMode) {
  fail('site/index.html must provide a prefers-color-scheme: dark contract');
} else {
  for (const token of [
    '--bg: #0f1216',
    '--ink: #f4f7fb',
    '--muted: #b8c2d1',
    '--line: #415064',
    '--panel: #171d26',
    '--accent: #8aacf8',
    '--oss-accent: #22d3ee',
    '--project-accent: #8aacf8',
    '--action-accent: #1d4ed8',
    '--demo-surface: #111821',
  ]) {
    if (!darkMode.includes(token)) fail(`site/index.html dark contract is missing ${token}`);
  }
  if (!darkMode.includes('rgb(34 211 238 / .10)')) {
    fail('site/index.html dark hero glow must be capped at 10% alpha');
  }
}

for (const relativePath of readmes) {
  try {
    const readme = await readFile(path.join(root, relativePath), 'utf8');
    if (!readme.includes(expectedGuide)) fail(`${relativePath} is missing the canonical OSS brand guide`);
    if (!readme.includes('Open source by DevsLab') && !readme.includes('DevsLab 오픈소스')) {
      fail(`${relativePath} is missing a DevsLab OSS endorsement`);
    }
    if (!readme.includes('readme-header.png')) fail(`${relativePath} is missing the O01 README header`);
  } catch {
    fail(`missing ${relativePath}`);
  }
}

if (!process.exitCode) console.log('Brand check passed: editor-ruler O01 assets and endorsements match oss-brand v0.2.0.');
