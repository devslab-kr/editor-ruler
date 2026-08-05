# @devslab/editor-ruler-ckeditor5

[![npm](https://img.shields.io/npm/v/%40devslab%2Feditor-ruler-ckeditor5)](https://www.npmjs.com/package/@devslab/editor-ruler-ckeditor5)

**[문서 & 라이브 데모](https://devslab-kr.github.io/editor-ruler/)** · [English](README.md)

[`@devslab/editor-ruler`](https://github.com/devslab-kr/editor-ruler)의 [CKEditor 5](https://ckeditor.com/ckeditor-5/) 플러그인 — 에디터블 위에 Word 스타일 가로 줄자(여백·첫 줄 들여쓰기 드래그 핸들 + 가이드선)를 추가합니다.

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
  editorRuler: {
    unit: 'cm',     // 'cm' | 'in' | 'px'
    guides: true,   // 줄자에서 아래로 드래그 → 가이드선
    guideSnap: 5,   // 스냅 거리(px); 0이면 비활성
    // language: 'ko' — 기본값은 에디터 UI 언어 → 브라우저 언어
  },
});
```

들여쓰기는 모델 속성(`rulerMarginLeft` / `rulerMarginRight` / `rulerTextIndent`)으로 저장되고 **순수 인라인 CSS**(`<p style="margin-left:75px">`)로 다운캐스트됩니다 — `getData()` 출력이 그대로 이식 가능하고, 기존 인라인 들여쓰기도 업캐스트되어 들어옵니다. 드래그 제스처 전체가 정확히 **undo 1스텝**입니다.

줄자 API는 `editor.plugins.get('EditorRuler').ruler`(`refresh`/`setUnit`/…), 가이드는 `.guides`로 접근합니다.

`ckeditor5 >= 42` (통합 npm 패키지) 필요.

라이선스: Apache-2.0 © devslab (CKEditor 5 자체는 GPL/상용 — 본인의 라이선스 키를 사용하세요).
