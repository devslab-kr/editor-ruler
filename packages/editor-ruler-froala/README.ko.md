# @devslab/editor-ruler-froala

> English: [README.md](README.md)

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
});
```

`pluginsEnabled`를 직접 지정한다면 목록에 `'ruler'`를 추가하세요.

줄자는 현재 선택 위치 문단(들)의 상태를 표시하며, 핸들 드래그는 해당 문단의 `margin-left` / `margin-right` / `text-indent` 인라인 스타일을 갱신하고 제스처당 Froala undo 스텝을 1회 기록합니다.

참고: 이 패키지는 [devslab](https://github.com/devslab-kr)의 독립 오픈소스 프로젝트로 Froala와 무관하며, Froala 자체는 별도 라이선스가 필요합니다.

라이선스: Apache-2.0 © devslab
