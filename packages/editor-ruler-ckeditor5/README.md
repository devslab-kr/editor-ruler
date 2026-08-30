# @devslab/editor-ruler-ckeditor5

<p align="center">
  <a href="https://devslab.kr/brand/open-source/"><img src="../../docs/assets/brand/readme-header.png" alt="editor-ruler — Open source by DevsLab" width="100%" /></a>
</p>

**Open source by [DevsLab](https://devslab.kr/)** · [OSS brand guide](https://devslab.kr/brand/open-source/) · Registry O01

[![npm](https://img.shields.io/npm/v/%40devslab%2Feditor-ruler-ckeditor5)](https://www.npmjs.com/package/@devslab/editor-ruler-ckeditor5)

**[Docs & live demo](https://devslab-kr.github.io/editor-ruler/)** · [한국어](README.ko.md)

**Stable since 1.0.0** — the exported API follows semantic versioning; see the [stability scope](https://github.com/devslab-kr/editor-ruler#stability).

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
    visible: true,  // false starts the ruler hidden — the toolbar dropdown
                    // or plugin.show() brings it up later
    vertical: false, // show the vertical ruler strip on init
    verticalGutter: false, // reserve the strip's 23px column up front
                    // (scrollbar-gutter: stable style) — toggling the
                    // vertical ruler never reflows the content
    unit: 'cm',     // 'cm' | 'in' | 'px'
    guides: true,   // drag down from the ruler for guide lines
    guideSnap: 5,   // snap distance in px; 0 disables
    // language: 'ko' — defaults to the editor's UI language, then the browser
  },
});
```

Indentation is stored as model attributes (`rulerMarginLeft` / `rulerMarginRight` / `rulerTextIndent`) and down-cast to **plain inline CSS** (`<p style="margin-left:75px">`), so `getData()` output is portable and existing inline indentation up-casts back in. A whole drag gesture is exactly **one undo step**.

The plugin registers an **`editorRuler` toolbar item** — a ruler-icon dropdown holding Show/Hide, Vertical Ruler, Lock Guides, Clear Guides, and the cm/inch/px unit switch (active states checkmarked; labels localize to the editor UI language, ko/en built in). The full API also lives at `editor.plugins.get('EditorRuler')` (`ruler`, `vruler`, `guides`, `show`/`hide`/`toggle`, `showVRuler`/`hideVRuler`/`toggleVRuler`, `setUnit`, `setGuidesLocked`, `clearGuides`). Dragging right from the vertical ruler drops a vertical guide.

Requires `ckeditor5 >= 42` (the unified npm package).

License: Apache-2.0 © devslab (CKEditor 5 itself is GPL/commercial — use your own license key).
