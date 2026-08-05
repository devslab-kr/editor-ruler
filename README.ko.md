# editor-ruler

[![npm](https://img.shields.io/npm/v/%40devslab%2Feditor-ruler)](https://www.npmjs.com/package/@devslab/editor-ruler)
[![CI](https://github.com/devslab-kr/editor-ruler/actions/workflows/ci.yml/badge.svg)](https://github.com/devslab-kr/editor-ruler/actions/workflows/ci.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178C6?logo=typescript&logoColor=white)
[![License](https://img.shields.io/badge/License-Apache--2.0-blue)](./LICENSE)

**[문서 & 라이브 데모](https://devslab-kr.github.io/editor-ruler/)** · [English](README.md)

웹 리치텍스트 에디터를 위한 **Word 스타일 가로 줄자** — 좌/우 여백과 첫 줄 들여쓰기를 드래그 핸들·키보드로 조절, cm/in/px 눈금 지원.

Froala·TinyMCE·CKEditor 5·Quill 등 범용 WYSIWYG 에디터에는 줄자가 없고, Syncfusion·DevExpress·ONLYOFFICE 같은 무거운 문서형 컴포넌트에만 있습니다. `editor-ruler`는 **에디터 불문 코어** + 얇은 **에디터별 어댑터** 구조로 이 공백을 채웁니다.

## 패키지

| 패키지 | 설명 |
|---|---|
| [`@devslab/editor-ruler`](packages/editor-ruler) | 코어: 줄자 UI, 드래그/키보드 핸들, 단위 눈금. 의존성 0, 프레임워크 무관. |
| [`@devslab/editor-ruler-froala`](packages/editor-ruler-froala) | [Froala WYSIWYG 에디터](https://froala.com) 플러그인 어댑터. |
| `@devslab/editor-ruler-tiptap` | 예정. |
| `@devslab/editor-ruler-ckeditor5` | 예정. |

## 빠른 시작 (코어 — 아무 contenteditable)

```bash
npm install @devslab/editor-ruler
```

```ts
import { createRuler } from '@devslab/editor-ruler';

const ruler = createRuler(mountElement, {
  unit: 'cm',
  getMetrics: () => ({ contentWidth, leftMargin, rightMargin, firstLineIndent }),
  onChange(change, phase) {
    // px 값을 현재 문단(들)에 적용; 드래그를 놓는 순간 phase === 'commit'
  },
});
ruler.refresh(); // 선택/내용이 바뀔 때마다 호출
```

## 빠른 시작 (CDN — 빌드 도구 없이)

iife 빌드가 전역 `EditorRuler`를 노출합니다:

```html
<script src="https://cdn.jsdelivr.net/npm/@devslab/editor-ruler@0.1/dist/index.global.js"></script>
<script>
  const ruler = EditorRuler.createRuler(mountElement, { /* 동일한 옵션 */ });
</script>
```

Froala 어댑터도 동일합니다 — `@devslab/editor-ruler-froala/dist/index.global.js`가 전역 `EditorRulerFroala.defineRulerPlugin`을 노출합니다 (코어 포함 단일 파일).

버전 지정 방식:

| URL | 의미 |
|---|---|
| `@0.1.0` | 정확한 버전 고정 — 절대 안 바뀜, 캐시 최장 |
| `@0.1` | `0.1.x` 최신 패치 — 버그픽스 자동 반영, 브레이킹 없음 (권장) |
| `@latest` (또는 버전 생략) | 항상 최신 릴리스 — 메이저 포함이라 브레이킹 체인지가 예고 없이 들어올 수 있음; jsDelivr가 별칭을 최대 12시간 캐시 |

## 빠른 시작 (Froala)

```bash
npm install @devslab/editor-ruler-froala froala-editor
```

```ts
import FroalaEditor from 'froala-editor';
import { defineRulerPlugin } from '@devslab/editor-ruler-froala';

defineRulerPlugin(FroalaEditor); // 인스턴스 생성 전에 1회
new FroalaEditor('#editor', {
  rulerEnabled: true,
  rulerUnit: 'cm',
  toolbarButtons: ['bold', 'italic', '|', 'toggleRuler'], // 툴바 토글 버튼 (선택)
});
// pluginsEnabled를 직접 지정한다면 'ruler'를 포함하세요
```

`defineRulerPlugin`은 `ruler` 플러그인과 **함께** 줄자 아이콘이 달린 `toggleRuler` 툴바 커맨드를 등록합니다 (버튼 활성 상태가 표시 여부를 반영) — 보이기/숨기기 버튼이 필요하면 `toolbarButtons`에 추가하세요.

## 기능

- 좌측 여백 / 우측 여백 / 첫 줄 들여쓰기 핸들 (내어쓰기(hanging indent) 지원)
- 드래그 중 실시간 미리보기 + 제스처당 undo 경계 1회 (`commit` phase)
- 키보드 접근성: 핸들이 포커스 가능한 슬라이더 (`←`/`→`, `Shift`로 10px, `Home`/`End`)
- cm / in / px 눈금, 런타임 전환 가능
- CSS 커스텀 프로퍼티(`--edr-*`)로 테마링, 다크 모드 대응
- 탭 스톱은 현재 **범위 밖** — HTML에는 네이티브 탭 스톱 모델이 없음

## 데모

라이브 플레이그라운드: **https://devslab-kr.github.io/editor-ruler/**

로컬:

```bash
pnpm install && pnpm build
# demo/index.html을 브라우저에서 열기 (순수 contenteditable + 코어 줄자)
```

## 개발

pnpm 모노레포. `pnpm build` / `pnpm test` / `pnpm typecheck`. 버저닝은 [changesets](https://github.com/changesets/changesets).

## 라이선스

[Apache-2.0](LICENSE) © [devslab](https://github.com/devslab-kr)
