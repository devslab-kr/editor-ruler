# editor-ruler

[![npm](https://img.shields.io/npm/v/%40devslab%2Feditor-ruler)](https://www.npmjs.com/package/@devslab/editor-ruler)
[![CI](https://github.com/devslab-kr/editor-ruler/actions/workflows/ci.yml/badge.svg)](https://github.com/devslab-kr/editor-ruler/actions/workflows/ci.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178C6?logo=typescript&logoColor=white)
[![License](https://img.shields.io/badge/License-Apache--2.0-blue)](./LICENSE)

**[Docs & live demo](https://devslab-kr.github.io/editor-ruler/)** · [한국어](README.ko.md)

A **Word-like horizontal ruler** for web rich-text editors — left/right margins and first-line indent with draggable handles, keyboard control, and cm/in/px scales.

Every classic WYSIWYG editor (Froala, TinyMCE, CKEditor 5, Quill, …) ships without a ruler; only heavyweight document-model components (Syncfusion, DevExpress, ONLYOFFICE) have one. `editor-ruler` fills that gap with an **editor-agnostic core** plus thin **per-editor adapters**.

## Packages

| Package | Description |
|---|---|
| [`@devslab/editor-ruler`](packages/editor-ruler) | Core: ruler UI, drag/keyboard handles, unit scales. Zero dependencies, framework-free. |
| [`@devslab/editor-ruler-froala`](packages/editor-ruler-froala) | [Froala WYSIWYG editor](https://froala.com) plugin adapter. |
| `@devslab/editor-ruler-tiptap` | Planned. |
| `@devslab/editor-ruler-ckeditor5` | Planned. |

## Quick start (core, any contenteditable)

```bash
npm install @devslab/editor-ruler
```

```ts
import { createRuler } from '@devslab/editor-ruler';

const ruler = createRuler(mountElement, {
  unit: 'cm',
  getMetrics: () => ({ contentWidth, leftMargin, rightMargin, firstLineIndent }),
  onChange(change, phase) {
    // apply px values to the current paragraph(s); phase === 'commit' on release
  },
});
ruler.refresh(); // call whenever selection or content changes
```

## Quick start (CDN, no build tools)

The iife build exposes an `EditorRuler` global:

```html
<script src="https://cdn.jsdelivr.net/npm/@devslab/editor-ruler@0.1/dist/index.global.js"></script>
<script>
  const ruler = EditorRuler.createRuler(mountElement, { /* same options */ });
</script>
```

The Froala adapter ships the same way — `@devslab/editor-ruler-froala/dist/index.global.js` exposes `EditorRulerFroala.defineRulerPlugin` (core bundled, single file).

Version pinning options:

| URL | Meaning |
|---|---|
| `@0.1.0` | Exact version — never changes, cached longest |
| `@0.1` | Latest `0.1.x` patch — bugfixes auto-applied, no breaking changes (recommended) |
| `@latest` (or no version) | Always the newest release — majors included, so breaking changes can land without warning; jsDelivr caches the alias for up to 12h |

## Quick start (Froala)

```bash
npm install @devslab/editor-ruler-froala froala-editor
```

```ts
import FroalaEditor from 'froala-editor';
import { defineRulerPlugin } from '@devslab/editor-ruler-froala';

defineRulerPlugin(FroalaEditor); // once, before creating instances
new FroalaEditor('#editor', {
  rulerEnabled: true,
  rulerUnit: 'cm',
  toolbarButtons: ['bold', 'italic', '|', 'toggleRuler'], // optional toolbar toggle
});
// if you set pluginsEnabled explicitly, include 'ruler'
```

`defineRulerPlugin` registers the `ruler` plugin **and** a `toggleRuler` toolbar command with a ruler icon (active state reflects visibility) — add it to `toolbarButtons` if you want a show/hide button.

## Features

- Left margin / right margin / first-line indent handles (hanging indent supported)
- Live drag preview + a single undo boundary per gesture (`commit` phase)
- Keyboard accessible: handles are focusable sliders (`←`/`→`, `Shift` for 10px, `Home`/`End`)
- cm / in / px scales, switchable at runtime
- Themeable via CSS custom properties (`--edr-*`), dark-mode aware
- Tab stops are **out of scope** for now — HTML has no native tab-stop model
- Tables: paragraphs **inside** cells indent normally; the ruler never styles table cells themselves (CSS ignores cell margins). Word-style column-width markers are on the roadmap
- Output is plain inline CSS — `<p style="margin-left: 75px; text-indent: 38px">` — so exported HTML keeps its layout anywhere

## Demo

Live playground: **https://devslab-kr.github.io/editor-ruler/**

Locally:

```bash
pnpm install && pnpm build
# open demo/index.html in a browser (plain contenteditable + the core ruler)
```

## Development

pnpm monorepo. `pnpm build` / `pnpm test` / `pnpm typecheck` run across packages. Versioning via [changesets](https://github.com/changesets/changesets).

## License

[Apache-2.0](LICENSE) © [devslab](https://github.com/devslab-kr)
