# @devslab/editor-ruler-froala

[![npm](https://img.shields.io/npm/v/%40devslab%2Feditor-ruler-froala)](https://www.npmjs.com/package/@devslab/editor-ruler-froala)

**[문서 & 라이브 데모](https://devslab-kr.github.io/editor-ruler/)** · [English](README.md)

[`@devslab/editor-ruler`](https://github.com/devslab-kr/editor-ruler)의 [Froala WYSIWYG 에디터](https://froala.com) 어댑터 — 에디터 위에 Word 스타일 가로 줄자(여백 + 첫 줄 들여쓰기)를 추가합니다.

```bash
npm install @devslab/editor-ruler-froala froala-editor
```

```ts
import FroalaEditor from 'froala-editor';
import { defineRulerPlugin } from '@devslab/editor-ruler-froala';

defineRulerPlugin(FroalaEditor); // 에디터 인스턴스 생성 전에 1회

new FroalaEditor('#editor', {
  rulerEnabled: true, // 기본 true
  rulerUnit: 'cm',    // 'cm' | 'in' | 'px'
  toolbarButtons: ['bold', 'italic', '|', 'toggleRuler'], // 툴바 토글 버튼 (선택)
});
```

`pluginsEnabled`를 직접 지정한다면 목록에 `'ruler'`를 추가하세요.

`defineRulerPlugin`은 **`toggleRuler` 툴바 커맨드**도 함께 등록합니다 (`DefineIcon` 줄자 아이콘, 활성 상태가 표시 여부 반영) — 보이기/숨기기 버튼이 필요하면 `toolbarButtons`에 추가하세요. 플러그인 API는 `editor.ruler`로 접근합니다 (`show`/`hide`/`toggle`/`isVisible`/`refresh`).

CDN 사용 — iife 빌드는 코어를 포함한 단일 파일로 전역 `EditorRulerFroala`를 노출합니다:

```html
<script src="https://cdn.jsdelivr.net/npm/@devslab/editor-ruler-froala@0.12/dist/index.global.js"></script>
<script>
  EditorRulerFroala.defineRulerPlugin(FroalaEditor);
</script>
```

줄자는 현재 선택 위치 문단(들)의 상태를 표시하며, 핸들 드래그는 해당 문단의 `margin-left` / `margin-right` / `text-indent` 인라인 스타일을 갱신하고 제스처당 Froala undo 스텝을 1회 기록합니다.

참고: 이 패키지는 [devslab](https://github.com/devslab-kr)의 독립 오픈소스 프로젝트로 Froala와 무관하며, Froala 자체는 별도 라이선스가 필요합니다.

라이선스: Apache-2.0 © devslab
