# editor-ruler

[![npm](https://img.shields.io/npm/v/%40devslab%2Feditor-ruler)](https://www.npmjs.com/package/@devslab/editor-ruler)
[![CI](https://github.com/devslab-kr/editor-ruler/actions/workflows/ci.yml/badge.svg)](https://github.com/devslab-kr/editor-ruler/actions/workflows/ci.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178C6?logo=typescript&logoColor=white)
[![License](https://img.shields.io/badge/License-Apache--2.0-blue)](./LICENSE)

**[Docs & live demo](https://devslab-kr.github.io/editor-ruler/)** · [Architecture](docs/ARCHITECTURE.md) · [한국어](README.ko.md)

A **Word-like horizontal ruler** for web rich-text editors — left/right margins and first-line indent with draggable handles, keyboard control, and cm/in/px scales.

**Stable since 1.0.0** — see [Stability](#stability) for what that covers.

Every classic WYSIWYG editor (Froala, TinyMCE, CKEditor 5, Quill, …) ships without a ruler; only heavyweight document-model components (Syncfusion, DevExpress, ONLYOFFICE) have one. `editor-ruler` fills that gap with an **editor-agnostic core** plus thin **per-editor adapters**.

## Packages

| Package | Description |
|---|---|
| [`@devslab/editor-ruler`](packages/editor-ruler) | Core: ruler UI, drag/keyboard handles, unit scales, guides, column markers. Zero dependencies, framework-free. |
| [`@devslab/editor-ruler-froala`](packages/editor-ruler-froala) | [Froala WYSIWYG editor](https://froala.com) plugin adapter. |
| [`@devslab/editor-ruler-tiptap`](packages/editor-ruler-tiptap) | [Tiptap](https://tiptap.dev) extension (v2/v3). |
| [`@devslab/editor-ruler-ckeditor5`](packages/editor-ruler-ckeditor5) | [CKEditor 5](https://ckeditor.com/ckeditor-5/) plugin (`ckeditor5 >= 42`). |

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
<script src="https://cdn.jsdelivr.net/npm/@devslab/editor-ruler@1.0/dist/index.global.js"></script>
<script>
  const ruler = EditorRuler.createRuler(mountElement, { /* same options */ });
</script>
```

The Froala adapter ships the same way — `@devslab/editor-ruler-froala/dist/index.global.js` exposes `EditorRulerFroala.defineRulerPlugin` (core bundled, single file).

Version pinning options:

| URL | Meaning |
|---|---|
| `@1.0.1` | Exact version — never changes, cached longest |
| `@1.0` | Latest `1.0.x` patch — bugfixes auto-applied, no breaking changes (recommended) |
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

## Quick start (CKEditor 5)

```bash
npm install @devslab/editor-ruler-ckeditor5 ckeditor5
```

```ts
import { ClassicEditor, Essentials, Paragraph, Heading } from 'ckeditor5';
import { EditorRulerPlugin } from '@devslab/editor-ruler-ckeditor5';

ClassicEditor.create(element, {
  licenseKey: 'GPL',
  plugins: [Essentials, Paragraph, Heading, EditorRulerPlugin],
  editorRuler: { unit: 'cm' },
});
```

Model attributes down-cast to plain inline CSS; one undo step per drag. See the [package README](packages/editor-ruler-ckeditor5).

`defineRulerPlugin` registers the `ruler` plugin **and** toolbar commands — add what you need to `toolbarButtons`:

- `rulerOptions` — **recommended single button**: one ruler-icon dropdown holding Show/Hide, Vertical Ruler, Lock Guides, Clear Guides, plus cm / inch / px (active states checkmarked)
- `toggleRuler` / `rulerUnit` — the same core functions as separate buttons, for hosts that prefer them split

Froala options: `rulerVisible: false` starts the horizontal ruler hidden (plugin and toolbar stay alive — toggle it on later); `rulerVertical: true` shows the vertical ruler on init; `rulerVerticalGutter: true` reserves the strip's 23px column from the start (like `scrollbar-gutter: stable`) so toggling the vertical ruler never reflows the content; `rulerGuides: false` disables guide lines.

Tiptap and CKEditor 5 support the same controls: `visible: false` starts the ruler hidden (`showRuler`/`hideRuler`/`toggleRuler` commands on Tiptap, the plugin's `show()`/`toggle()` on CKEditor 5), and the **vertical ruler works on all three adapters** — `vertical: true` shows it on init, `verticalGutter: true` reserves its 23px column so toggling never reflows the content (Tiptap: `showVerticalRuler`/`toggleVerticalRuler` commands; CKEditor 5: `showVRuler()`/`toggleVRuler()` plus a Vertical Ruler entry in the toolbar dropdown).

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
- [CKEditor 5 on StackBlitz](https://stackblitz.com/github/devslab-kr/editor-ruler/tree/main/examples/ckeditor5)

Locally:

```bash
pnpm install && pnpm build
# open demo/index.html in a browser (plain contenteditable + the core ruler)
```

## Stability

Stable since **1.0.0**. Breaking changes to the documented API require a major release.

Covered by that promise:

- Every symbol exported from the four packages' entry points, and the options / config each adapter accepts
- The `--edr-*` CSS custom properties used for theming
- The output contract — indentation is written as plain inline CSS (`margin-left` / `margin-right` / `text-indent`, in px)

Deliberately **not** covered, so they can keep improving:

- The injected DOM structure and internal class names (`.edr-vwrap`, `.edr-froala-vmount`, …) — theme with the CSS variables rather than matching internals
- Anything marked `@internal`

## Development

pnpm monorepo. `pnpm build` / `pnpm test` / `pnpm typecheck` run across packages.

`packages/editor-ruler/package.json` is the single source of truth for the version — bump it, then run `pnpm sync:versions` to propagate it to the sibling packages, the `examples/` pins, and the README CDN pins. `pnpm check:versions` reports drift instead of fixing it and runs in CI, so a stale reference fails the build rather than shipping.

## License

[Apache-2.0](LICENSE) © [devslab](https://github.com/devslab-kr)
