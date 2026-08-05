# editor-ruler

> 한국어 문서: [README.ko.md](README.ko.md)

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

## Quick start (Froala)

```bash
npm install @devslab/editor-ruler-froala froala-editor
```

```ts
import FroalaEditor from 'froala-editor';
import { defineRulerPlugin } from '@devslab/editor-ruler-froala';

defineRulerPlugin(FroalaEditor); // once, before creating instances
new FroalaEditor('#editor', { rulerEnabled: true, rulerUnit: 'cm' });
// if you set pluginsEnabled explicitly, include 'ruler'
```

## Features

- Left margin / right margin / first-line indent handles (hanging indent supported)
- Live drag preview + a single undo boundary per gesture (`commit` phase)
- Keyboard accessible: handles are focusable sliders (`←`/`→`, `Shift` for 10px, `Home`/`End`)
- cm / in / px scales, switchable at runtime
- Themeable via CSS custom properties (`--edr-*`), dark-mode aware
- Tab stops are **out of scope** for now — HTML has no native tab-stop model

## Demo

```bash
pnpm install && pnpm build
# open demo/index.html in a browser (plain contenteditable + the core ruler)
```

## Development

pnpm monorepo. `pnpm build` / `pnpm test` / `pnpm typecheck` run across packages. Versioning via [changesets](https://github.com/changesets/changesets).

## License

[Apache-2.0](LICENSE) © [devslab](https://github.com/devslab-kr)
