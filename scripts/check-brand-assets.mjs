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
  'docs/assets/brand/readme-header.png': '4b419a0cb464d95071cccb27717bcadb52bf459408765a8f9c8a025c2b9f6eba',
  'docs/assets/brand/project-mark.svg': 'eeb3d9429f8219263e3c0f7350cbf57600899e5fc43e6f1e2fb197613536fc00',
  'docs/assets/brand/project-lockup.svg': 'd420a6505a8952a382089ff549cd2643420cf8bdaa277cd3d3d244f72df88d9b',
  'site/favicon.svg': 'eeb3d9429f8219263e3c0f7350cbf57600899e5fc43e6f1e2fb197613536fc00',
  'site/favicon.ico': '3cdcb500a12f6508cf9c6b7523e50f462247bac39403d2920d76ba12bd96fc17',
  'site/apple-touch-icon.png': 'b5cd4f6bcbf19029e53f2482f2201bfc59fd9f1bbb3294b43be194f21ee43f31',
  'site/og.png': '31ee7408b3db5ba4c89d1c53d0728c520b1f6f2faca46a1b43fa4b425e08e0da',
};

const expectedSource = 'https://github.com/devslab-kr/oss-brand/releases/tag/v0.1.1';
const expectedGuide = 'https://devslab.kr/brand/open-source/';

function fail(message) {
  console.error(`Brand check failed: ${message}`);
  process.exitCode = 1;
}

async function sha256(relativePath) {
  const data = await readFile(path.join(root, relativePath));
  return createHash('sha256').update(data).digest('hex');
}

const manifestPath = 'docs/assets/brand/oss-brand.json';
try {
  const manifest = JSON.parse(await readFile(path.join(root, manifestPath), 'utf8'));
  if (manifest.registryId !== 'O01' || manifest.project !== 'editor-ruler') {
    fail(`${manifestPath} must identify editor-ruler as O01`);
  }
  if (manifest.release !== 'v0.1.1' || manifest.source !== expectedSource || manifest.guide !== expectedGuide) {
    fail(`${manifestPath} must pin oss-brand v0.1.1 and the canonical guide`);
  }
} catch {
  fail(`missing or invalid ${manifestPath}`);
}

for (const [relativePath, expectedHash] of Object.entries(assets)) {
  try {
    await access(path.join(root, relativePath));
    const actualHash = await sha256(relativePath);
    if (actualHash !== expectedHash) fail(`${relativePath} checksum does not match oss-brand v0.1.1`);
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

if (!process.exitCode) console.log('Brand check passed: editor-ruler O01 assets and endorsements match oss-brand v0.1.1.');
