# @devslab/editor-ruler-froala

[![npm](https://img.shields.io/npm/v/%40devslab%2Feditor-ruler-froala)](https://www.npmjs.com/package/@devslab/editor-ruler-froala)

**[Docs & live demo](https://devslab-kr.github.io/editor-ruler/)** · [한국어](README.ko.md)

[Froala WYSIWYG editor](https://froala.com) adapter for [`@devslab/editor-ruler`](https://github.com/devslab-kr/editor-ruler) — adds a Word-like horizontal ruler (margins + first-line indent) above the editor.

```bash
npm install @devslab/editor-ruler-froala froala-editor
```

```ts
import FroalaEditor from 'froala-editor';
import { defineRulerPlugin } from '@devslab/editor-ruler-froala';

defineRulerPlugin(FroalaEditor); // once, before creating editor instances

new FroalaEditor('#editor', {
  rulerEnabled: true,          // default true — false disables the plugin entirely
  rulerVisible: true,          // start with the ruler shown; false starts it
                               // hidden (plugin + toolbar stay alive — the
                               // user toggles it on when they want it)
  rulerUnit: 'cm',             // 'cm' | 'in' | 'px'
  rulerVertical: false,        // show the vertical ruler on init
  rulerVerticalGutter: false,  // reserve the vertical ruler's 23px column up
                               // front (scrollbar-gutter: stable style), so
                               // toggling it never reflows the content
  rulerGuides: true,           // guide lines (drag out of a ruler)
  toolbarButtons: ['bold', 'italic', '|', 'rulerOptions'], // optional toolbar dropdown
});
```

If you configure `pluginsEnabled` explicitly, add `'ruler'` to the list.

`defineRulerPlugin` also registers a **`toggleRuler` toolbar command** (ruler icon via `DefineIcon`, active state reflects visibility) — add it to `toolbarButtons` for a show/hide button. The plugin API is available as `editor.ruler` (`show`/`hide`/`toggle`/`isVisible`/`refresh`).

CDN usage — the iife build bundles the core into one file and exposes `EditorRulerFroala`:

```html
<script src="https://cdn.jsdelivr.net/npm/@devslab/editor-ruler-froala@0.16/dist/index.global.js"></script>
<script>
  EditorRulerFroala.defineRulerPlugin(FroalaEditor);
</script>
```

The ruler reflects the paragraph(s) under the current selection; dragging a handle updates their `margin-left` / `margin-right` / `text-indent` inline styles and records a single Froala undo step per gesture.

Note: this package is an independent open-source project by [devslab](https://github.com/devslab-kr) and is not affiliated with Froala. Froala itself requires its own license.

License: Apache-2.0 © devslab
