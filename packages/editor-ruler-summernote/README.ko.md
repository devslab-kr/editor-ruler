# @devslab/editor-ruler-summernote

[![npm](https://img.shields.io/npm/v/%40devslab%2Feditor-ruler-summernote)](https://www.npmjs.com/package/@devslab/editor-ruler-summernote)

**[문서 & 라이브 데모](https://devslab-kr.github.io/editor-ruler/)** · [English](README.md)

**1.0.0부터 안정 버전** — export되는 API는 semver를 따릅니다. [안정성 범위](https://github.com/devslab-kr/editor-ruler#안정성) 참조.

[`@devslab/editor-ruler`](https://github.com/devslab-kr/editor-ruler)의 [Summernote](https://summernote.org) 어댑터 — 에디터 위에 Word 스타일 가로 줄자(여백 + 첫 줄 들여쓰기)를 추가합니다.

```bash
npm install @devslab/editor-ruler-summernote summernote
```

```ts
import $ from 'jquery';
import 'summernote';
import { defineRulerPlugin } from '@devslab/editor-ruler-summernote';

defineRulerPlugin($); // 에디터 초기화 전에 1회

$('#editor').summernote({
  toolbar: [['style', ['bold', 'italic']], ['misc', ['ruler']]],
  ruler: {
    enabled: true,         // 기본 true — false면 플러그인 비활성
    visible: true,         // false면 숨긴 채 시작 — 나중에 토글로 켬
    unit: 'cm',            // 'cm' | 'in' | 'px'
    vertical: false,       // 초기화 시 세로 줄자 표시
    verticalGutter: false, // 세로 줄자의 23px 자리를 미리 예약 —
                           // 토글해도 본문이 리플로우되지 않음
    guides: true,          // 가이드선 (줄자에서 드래그해 생성)
    guideSnap: 5,          // 스냅 거리(px); 0이면 비활성
  },
});
```

`toolbar`에 `'ruler'`를 추가하면 줄자 아이콘 드롭다운이 생깁니다 — 보이기/숨기기·세로 줄자·가이드 잠금/지우기·cm/인치/px 전환이 한 버튼에 들어 있습니다. 플러그인 API는 `$('#editor').data('summernote').modules.ruler`로도 접근합니다 (`show`/`hide`/`toggle`/`isVisible`, `showVRuler`/`toggleVRuler`, `setUnit`, `setGuidesLocked`, `clearGuides`, `refresh`).

줄자는 현재 선택 위치 문단(들)의 상태를 표시하며, 핸들 드래그는 해당 문단의 `margin-left` / `margin-right` / `text-indent` 인라인 스타일을 갱신합니다. 드래그 제스처 전체가 정확히 **undo 1스텝**입니다 — 커밋이 Summernote 자체의 `afterCommand`를 거치고, 히스토리 스냅샷을 찍는 게 바로 그 함수입니다.

**테이블·이미지도 Word처럼 밀립니다** (Froala 어댑터와 동일): 테이블 안 선택은 **테이블 전체**를 들여쓰고(CSS는 셀의 margin을 무시합니다), 셀 안 문단은 개별 들여쓰기, 바로 선택된 `<img>`는 소속 블록으로 정규화됩니다. 테이블 안에서는 줄자에 드래그 가능한 **컬럼 경계 마커**가 뜹니다 (병합 셀 테이블은 경계 계산이 모호해 마커를 생략합니다).

`summernote >= 0.8`과 jQuery peer가 필요합니다.

라이선스: Apache-2.0 © devslab
