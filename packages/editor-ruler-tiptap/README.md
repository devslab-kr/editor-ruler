# @devslab/editor-ruler-tiptap

[![npm](https://img.shields.io/npm/v/%40devslab%2Feditor-ruler-tiptap)](https://www.npmjs.com/package/@devslab/editor-ruler-tiptap)

**[Docs & live demo](https://devslab-kr.github.io/editor-ruler/)** · [한국어](README.ko.md)

[Tiptap](https://tiptap.dev) extension for [`@devslab/editor-ruler`](https://github.com/devslab-kr/editor-ruler) — a Word-like horizontal ruler with margin/first-line-indent drag handles and guide lines above your editor.

```bash
npm install @devslab/editor-ruler-tiptap @tiptap/core
```

```ts
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { EditorRuler } from '@devslab/editor-ruler-tiptap';

new Editor({
  element,
  extensions: [
    StarterKit,
    EditorRuler.configure({
      visible: true,     // false starts the ruler hidden — show it later
                         // with editor.commands.showRuler()
      unit: 'cm',        // 'cm' | 'in' | 'px'
      guides: true,      // drag down from the ruler for guide lines
      guideSnap: 5,      // snap distance in px; 0 disables
      types: ['paragraph', 'heading'],
      language: null,    // null = <html lang> → browser language → en
    }),
  ],
  content: '<p>Hello</p>',
});
```

Indentation is stored as a `rulerIndent` node attribute and rendered as **plain inline CSS** (`<p style="margin-left: 75px">`), so `editor.getHTML()` output is portable and existing inline indentation parses back in. A whole drag gesture is exactly **one undo step** (drag transactions skip history; the release records baseline → final).

Visibility is controlled with the **`showRuler` / `hideRuler` / `toggleRuler` commands** (`editor.commands.toggleRuler()`); the current state is at `editor.storage.editorRuler.visible`. The ruler API is available at `editor.storage.editorRuler.ruler` (`refresh`/`setUnit`/…) and guides at `editor.storage.editorRuler.guides`.

Works with Tiptap v2 and v3 (`@tiptap/core >= 2`).

License: Apache-2.0 © devslab
