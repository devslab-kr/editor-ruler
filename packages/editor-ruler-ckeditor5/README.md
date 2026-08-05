# @devslab/editor-ruler-ckeditor5

[![npm](https://img.shields.io/npm/v/%40devslab%2Feditor-ruler-ckeditor5)](https://www.npmjs.com/package/@devslab/editor-ruler-ckeditor5)

**[Docs & live demo](https://devslab-kr.github.io/editor-ruler/)** · [한국어](README.ko.md)

[CKEditor 5](https://ckeditor.com/ckeditor-5/) plugin for [`@devslab/editor-ruler`](https://github.com/devslab-kr/editor-ruler) — a Word-like horizontal ruler with margin/first-line-indent drag handles and guide lines above the editable.

```bash
npm install @devslab/editor-ruler-ckeditor5 ckeditor5
```

```ts
import { ClassicEditor, Essentials, Paragraph, Heading, Bold, Italic } from 'ckeditor5';
import { EditorRulerPlugin } from '@devslab/editor-ruler-ckeditor5';
import 'ckeditor5/ckeditor5.css';

ClassicEditor.create(document.querySelector('#editor'), {
  licenseKey: 'GPL',
  plugins: [Essentials, Paragraph, Heading, Bold, Italic, EditorRulerPlugin],
  toolbar: ['heading', '|', 'bold', 'italic', '|', 'editorRuler'], // ruler-icon dropdown
  editorRuler: {
    unit: 'cm',     // 'cm' | 'in' | 'px'
    guides: true,   // drag down from the ruler for guide lines
    guideSnap: 5,   // snap distance in px; 0 disables
    // language: 'ko' — defaults to the editor's UI language, then the browser
  },
});
```

Indentation is stored as model attributes (`rulerMarginLeft` / `rulerMarginRight` / `rulerTextIndent`) and down-cast to **plain inline CSS** (`<p style="margin-left:75px">`), so `getData()` output is portable and existing inline indentation up-casts back in. A whole drag gesture is exactly **one undo step**.

The plugin registers an **`editorRuler` toolbar item** — a ruler-icon dropdown holding Show/Hide, Lock Guides, Clear Guides, and the cm/inch/px unit switch (active states checkmarked; labels localize to the editor UI language, ko/en built in). The full API also lives at `editor.plugins.get('EditorRuler')` (`ruler`, `guides`, `show`/`hide`/`toggle`, `setUnit`, `setGuidesLocked`, `clearGuides`).

Requires `ckeditor5 >= 42` (the unified npm package).

License: Apache-2.0 © devslab (CKEditor 5 itself is GPL/commercial — use your own license key).
