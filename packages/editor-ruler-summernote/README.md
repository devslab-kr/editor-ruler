# @devslab/editor-ruler-summernote

[![npm](https://img.shields.io/npm/v/%40devslab%2Feditor-ruler-summernote)](https://www.npmjs.com/package/@devslab/editor-ruler-summernote)

**[Docs & live demo](https://devslab-kr.github.io/editor-ruler/)** · [한국어](README.ko.md)

**Stable since 1.0.0** — the exported API follows semantic versioning; see the [stability scope](https://github.com/devslab-kr/editor-ruler#stability).

[Summernote](https://summernote.org) adapter for [`@devslab/editor-ruler`](https://github.com/devslab-kr/editor-ruler) — adds a Word-like horizontal ruler (margins + first-line indent) above the editor.

```bash
npm install @devslab/editor-ruler-summernote summernote
```

```ts
import $ from 'jquery';
import 'summernote';
import { defineRulerPlugin } from '@devslab/editor-ruler-summernote';

defineRulerPlugin($); // once, before initializing any editor

$('#editor').summernote({
  toolbar: [['style', ['bold', 'italic']], ['misc', ['ruler']]],
  ruler: {
    enabled: true,         // default true — false disables the plugin
    visible: true,         // false starts it hidden — toggle it on later
    unit: 'cm',            // 'cm' | 'in' | 'px'
    vertical: false,       // show the vertical ruler on init
    verticalGutter: false, // reserve the vertical ruler's 23px column up
                           // front, so toggling never reflows the content
    guides: true,          // guide lines (drag out of a ruler)
    guideSnap: 5,          // snap distance in px; 0 disables
  },
});
```

Adding `'ruler'` to `toolbar` gives you a ruler-icon dropdown holding Show/Hide, Vertical Ruler, Lock Guides, Clear Guides, and the cm/inch/px switch. The plugin API is also reachable at `$('#editor').data('summernote').modules.ruler` (`show`/`hide`/`toggle`/`isVisible`, `showVRuler`/`toggleVRuler`, `setUnit`, `setGuidesLocked`, `clearGuides`, `refresh`).

The ruler reflects the paragraph(s) under the current selection; dragging a handle updates their `margin-left` / `margin-right` / `text-indent` inline styles. A whole drag gesture is exactly **one undo step** — the commit goes through Summernote's own `afterCommand`, which is what records the history snapshot.

**Tables and images push like Word**, the same as the Froala adapter: a selection inside a table indents the **whole `<table>`** (CSS ignores margins on cells), paragraphs inside cells indent individually, and a bare `<img>` resolves to its containing block. Inside a table the ruler shows draggable **column boundary markers** (skipped for tables with merged cells, where the boundary math is ambiguous).

Requires `summernote >= 0.8` and its jQuery peer.

License: Apache-2.0 © devslab
