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
  'docs/assets/brand/readme-header.png': 'ee7fd974ff9d3c75708a6f89319d6692693e4e132d8c9c1d990e1d5278c593a8',
  'docs/assets/brand/project-mark.svg': 'fee6b1859b915d2f0da54e4cb98645c4e7377e239051f8b267b17a8b72d87a98',
  'docs/assets/brand/project-lockup.svg': 'f604e4b61b158424bc0581ab069a80901e9f6e5d7fd44d04530c85162f484cd1',
  'site/favicon.svg': 'fee6b1859b915d2f0da54e4cb98645c4e7377e239051f8b267b17a8b72d87a98',
  'site/favicon.ico': '3bde59d194aa61c5f5b1a4fc2df6da0b1771111a420885f1cf0810ef7e3bf9a3',
  'site/apple-touch-icon.png': '64be9db34cc340ab0bd04e1e45a85822551e4b34a8270dbb2a692f993cc6660b',
  'site/og.png': '1da748b6c01bda7a8b7277a5df2d08d2e32eb16c124fc8d881d9bf78cec10633',
};

const expectedSource = 'https://github.com/devslab-kr/oss-brand/releases/tag/v0.3.0';
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
  if (manifest.release !== 'v0.3.0' || manifest.source !== expectedSource || manifest.guide !== expectedGuide) {
    fail(`${manifestPath} must pin oss-brand v0.3.0 and the canonical guide`);
  }
} catch {
  fail(`missing or invalid ${manifestPath}`);
}

for (const [relativePath, expectedHash] of Object.entries(assets)) {
  try {
    await access(path.join(root, relativePath));
    const actualHash = await sha256(relativePath);
    if (actualHash !== expectedHash) fail(`${relativePath} checksum does not match oss-brand v0.3.0`);
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

if (!process.exitCode) console.log('Brand check passed: editor-ruler O01 assets and endorsements match oss-brand v0.3.0.');
