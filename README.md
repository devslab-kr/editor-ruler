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
| [`@devslab/editor-ruler`](packages/editor-ruler) | Core: ruler UI, drag/keyboard handles, unit scales, guides, column markers. Zero dependencies, framework-free. |
| [`@devslab/editor-ruler-froala`](packages/editor-ruler-froala) | [Froala WYSIWYG editor](https://froala.com) plugin adapter. |
| [`@devslab/editor-ruler-tiptap`](packages/editor-ruler-tiptap) | [Tiptap](https://tiptap.dev) extension (v2/v3). |
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

## Quick start (Tiptap)

```bash
npm install @devslab/editor-ruler-tiptap @tiptap/core
```

```ts
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { EditorRuler } from '@devslab/editor-ruler-tiptap';

new Editor({ element, extensions: [StarterKit, EditorRuler], content });
```

Indentation is stored as node attributes and rendered as plain inline CSS; a whole drag is one undo step. See the [package README](packages/editor-ruler-tiptap) for options.

`defineRulerPlugin` registers the `ruler` plugin **and** toolbar commands — add what you need to `toolbarButtons`:

- `rulerOptions` — **recommended single button**: one ruler-icon dropdown holding Show/Hide, Vertical Ruler, Lock Guides, Clear Guides, plus cm / inch / px (active states checkmarked)
- `toggleRuler` / `rulerUnit` — the same core functions as separate buttons, for hosts that prefer them split

Froala options: `rulerVertical: true` shows the vertical ruler on init; `rulerGuides: false` disables guide lines.

## Features

- Left margin / right margin / first-line indent handles (hanging indent supported)
- **Vertical ruler** (`createVRuler`) — a scale strip for the editor's left edge
- **Guide lines** (`createGuides`) — design-tool convention: drag down from the horizontal ruler for a horizontal guide, right from the vertical ruler for a vertical guide (draggable, lockable, deleted by dropping back on the ruler; purely visual, never in the document HTML)
- Live drag preview + a single undo boundary per gesture (`commit` phase)
- Keyboard accessible: handles are focusable sliders (`←`/`→`, `Shift` for 10px, `Home`/`End`)
- cm / in / px scales, switchable at runtime
- Themeable via CSS custom properties (`--edr-*`), dark-mode aware
- **UI language follows the browser** (`<html lang>` → `navigator.language`; ko/en built in, overridable via `defineRulerPlugin(FE, { language, strings })` and `rulerLanguage`)
- Tab stops are **out of scope** for now — HTML has no native tab-stop model
- Tables & images push like Word: a selection in a table indents the **whole table**, paragraphs inside cells indent individually, and images move with their block
- **Table column markers**: inside a table the ruler shows draggable boundary markers that resize adjacent columns (skipped for tables with merged cells)
- **Guide snapping**: handles and column markers snap to nearby guides during drags (`guideSnap` option, default 5px)
- Output is plain inline CSS — `<p style="margin-left: 75px; text-indent: 38px">` — so exported HTML keeps its layout anywhere

## Demo

Live playground (tabbed per-editor demos): **https://devslab-kr.github.io/editor-ruler/**

One-click sandboxes:

- [Vanilla contenteditable on StackBlitz](https://stackblitz.com/github/devslab-kr/editor-ruler/tree/main/examples/vanilla)
- [Froala on StackBlitz](https://stackblitz.com/github/devslab-kr/editor-ruler/tree/main/examples/froala)
- [Tiptap on StackBlitz](https://stackblitz.com/github/devslab-kr/editor-ruler/tree/main/examples/tiptap)

Locally:

```bash
pnpm install && pnpm build
# open demo/index.html in a browser (plain contenteditable + the core ruler)
```

## Development

pnpm monorepo. `pnpm build` / `pnpm test` / `pnpm typecheck` run across packages. Versioning via [changesets](https://github.com/changesets/changesets).

## License

[Apache-2.0](LICENSE) © [devslab](https://github.com/devslab-kr)
