# @devslab/editor-ruler

[![npm](https://img.shields.io/npm/v/%40devslab%2Feditor-ruler)](https://www.npmjs.com/package/@devslab/editor-ruler)

**[문서 & 라이브 데모](https://devslab-kr.github.io/editor-ruler/)** · [English](README.md)

[editor-ruler](https://github.com/devslab-kr/editor-ruler)의 에디터 불문 코어: contenteditable 기반 어느 에디터에나 붙는 Word 스타일 가로 줄자(여백 + 첫 줄 들여쓰기). 의존성 0.

```ts
import { createRuler } from '@devslab/editor-ruler';

const ruler = createRuler(mountElement, {
  unit: 'cm', // 'cm' | 'in' | 'px'
  getMetrics: () => ({ contentWidth, leftMargin, rightMargin, firstLineIndent }), // px
  onChange(change, phase) {
    // { leftMargin? rightMargin? firstLineIndent? } — px 단위
    // phase: 'drag'(실시간) | 'commit'(놓는 순간 — 여기서 undo 스텝 저장)
  },
});

ruler.refresh();      // 메트릭 다시 읽기 (선택/내용 변경 시 호출)
ruler.setUnit('in');  // 눈금 전환
ruler.destroy();
```

핸들은 ARIA 속성을 갖춘 키보드 접근 가능한 슬라이더입니다 (`←`/`→`, `Shift` ×10, `Home`/`End`). 스타일은 CSS 커스텀 프로퍼티로: `--edr-bg`, `--edr-border`, `--edr-fg`, `--edr-handle`, `--edr-handle-active`, `--edr-accent`.

CDN 사용(빌드 도구 없이) — iife 빌드가 전역 `EditorRuler`를 노출합니다:

```html
<script src="https://cdn.jsdelivr.net/npm/@devslab/editor-ruler@0.1/dist/index.global.js"></script>
```

에디터 연동은 어댑터를 사용하세요 (예: [`@devslab/editor-ruler-froala`](https://github.com/devslab-kr/editor-ruler/tree/main/packages/editor-ruler-froala)).

라이선스: Apache-2.0 © devslab
