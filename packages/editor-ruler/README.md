# @devslab/editor-ruler

[![npm](https://img.shields.io/npm/v/%40devslab%2Feditor-ruler)](https://www.npmjs.com/package/@devslab/editor-ruler)

**[Docs & live demo](https://devslab-kr.github.io/editor-ruler/)** · [한국어](README.ko.md)

**Stable since 1.0.0** — the exported API follows semantic versioning; see the [stability scope](https://github.com/devslab-kr/editor-ruler#stability).

Editor-agnostic core of [editor-ruler](https://github.com/devslab-kr/editor-ruler): a Word-like horizontal ruler (margins + first-line indent) for any contenteditable-based editor. Zero dependencies.

```ts
import { createRuler } from '@devslab/editor-ruler';

const ruler = createRuler(mountElement, {
  unit: 'cm', // 'cm' | 'in' | 'px'
  getMetrics: () => ({ contentWidth, leftMargin, rightMargin, firstLineIndent }), // px
  onChange(change, phase) {
    // { leftMargin? rightMargin? firstLineIndent? } in px
    // phase: 'drag' (live) | 'commit' (pointer released — save your undo step here)
  },
});

ruler.refresh();      // re-read metrics (call on selection/content change)
ruler.setUnit('in');  // switch scale
ruler.destroy();
```

Handles are keyboard-accessible sliders (`←`/`→`, `Shift` ×10, `Home`/`End`) with ARIA attributes. Styling via CSS custom properties: `--edr-bg`, `--edr-border`, `--edr-fg`, `--edr-handle`, `--edr-handle-active`, `--edr-accent`.

CDN usage (no build tools) — the iife build exposes an `EditorRuler` global:

```html
<script src="https://cdn.jsdelivr.net/npm/@devslab/editor-ruler@1.1/dist/index.global.js"></script>
```

For editor integrations see the adapters (e.g. [`@devslab/editor-ruler-froala`](https://github.com/devslab-kr/editor-ruler/tree/main/packages/editor-ruler-froala)).

License: Apache-2.0 © devslab
