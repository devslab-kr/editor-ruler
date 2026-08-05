# @devslab/editor-ruler-froala

> 한국어: [README.ko.md](README.ko.md)

[Froala WYSIWYG editor](https://froala.com) adapter for [`@devslab/editor-ruler`](https://github.com/devslab-kr/editor-ruler) — adds a Word-like horizontal ruler (margins + first-line indent) above the editor.

```bash
npm install @devslab/editor-ruler-froala froala-editor
```

```ts
import FroalaEditor from 'froala-editor';
import { defineRulerPlugin } from '@devslab/editor-ruler-froala';

defineRulerPlugin(FroalaEditor); // once, before creating editor instances

new FroalaEditor('#editor', {
  rulerEnabled: true, // default true
  rulerUnit: 'cm',    // 'cm' | 'in' | 'px'
});
```

If you configure `pluginsEnabled` explicitly, add `'ruler'` to the list.

The ruler reflects the paragraph(s) under the current selection; dragging a handle updates their `margin-left` / `margin-right` / `text-indent` inline styles and records a single Froala undo step per gesture.

Note: this package is an independent open-source project by [devslab](https://github.com/devslab-kr) and is not affiliated with Froala. Froala itself requires its own license.

License: Apache-2.0 © devslab
