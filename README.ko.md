# editor-ruler

[![npm](https://img.shields.io/npm/v/%40devslab%2Feditor-ruler)](https://www.npmjs.com/package/@devslab/editor-ruler)
[![CI](https://github.com/devslab-kr/editor-ruler/actions/workflows/ci.yml/badge.svg)](https://github.com/devslab-kr/editor-ruler/actions/workflows/ci.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178C6?logo=typescript&logoColor=white)
[![License](https://img.shields.io/badge/License-Apache--2.0-blue)](./LICENSE)

**[문서 & 라이브 데모](https://devslab-kr.github.io/editor-ruler/)** · [Architecture](docs/ARCHITECTURE.md) · [English](README.md)

웹 리치텍스트 에디터를 위한 **Word 스타일 가로 줄자** — 좌/우 여백과 첫 줄 들여쓰기를 드래그 핸들·키보드로 조절, cm/in/px 눈금 지원.

Froala·TinyMCE·CKEditor 5·Quill 등 범용 WYSIWYG 에디터에는 줄자가 없고, Syncfusion·DevExpress·ONLYOFFICE 같은 무거운 문서형 컴포넌트에만 있습니다. `editor-ruler`는 **에디터 불문 코어** + 얇은 **에디터별 어댑터** 구조로 이 공백을 채웁니다.

## 패키지

| 패키지 | 설명 |
|---|---|
| [`@devslab/editor-ruler`](packages/editor-ruler) | 코어: 줄자 UI, 드래그/키보드 핸들, 단위 눈금, 가이드선, 컬럼 마커. 의존성 0, 프레임워크 무관. |
| [`@devslab/editor-ruler-froala`](packages/editor-ruler-froala) | [Froala WYSIWYG 에디터](https://froala.com) 플러그인 어댑터. |
| [`@devslab/editor-ruler-tiptap`](packages/editor-ruler-tiptap) | [Tiptap](https://tiptap.dev) 확장 (v2/v3). |
| [`@devslab/editor-ruler-ckeditor5`](packages/editor-ruler-ckeditor5) | [CKEditor 5](https://ckeditor.com/ckeditor-5/) 플러그인 (`ckeditor5 >= 42`). |

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
<script src="https://cdn.jsdelivr.net/npm/@devslab/editor-ruler@0.15/dist/index.global.js"></script>
<script>
  const ruler = EditorRuler.createRuler(mountElement, { /* 동일한 옵션 */ });
</script>
```

Froala 어댑터도 동일합니다 — `@devslab/editor-ruler-froala/dist/index.global.js`가 전역 `EditorRulerFroala.defineRulerPlugin`을 노출합니다 (코어 포함 단일 파일).

버전 지정 방식:

| URL | 의미 |
|---|---|
| `@0.15.0` | 정확한 버전 고정 — 절대 안 바뀜, 캐시 최장 |
| `@0.15` | `0.15.x` 최신 패치 — 버그픽스 자동 반영, 브레이킹 없음 (권장) |
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

## 빠른 시작 (Tiptap)

```bash
npm install @devslab/editor-ruler-tiptap @tiptap/core
```

```ts
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { EditorRuler } from '@devslab/editor-ruler-tiptap';

new Editor({ element, extensions: [StarterKit, EditorRuler], content });
```

들여쓰기는 노드 속성으로 저장되고 순수 인라인 CSS로 렌더되며, 드래그 전체가 undo 1스텝입니다. 옵션은 [패키지 README](packages/editor-ruler-tiptap) 참조.

## 빠른 시작 (CKEditor 5)

```bash
npm install @devslab/editor-ruler-ckeditor5 ckeditor5
```

```ts
import { ClassicEditor, Essentials, Paragraph, Heading } from 'ckeditor5';
import { EditorRulerPlugin } from '@devslab/editor-ruler-ckeditor5';

ClassicEditor.create(element, {
  licenseKey: 'GPL',
  plugins: [Essentials, Paragraph, Heading, EditorRulerPlugin],
  editorRuler: { unit: 'cm' },
});
```

모델 속성이 순수 인라인 CSS로 다운캐스트되고, 드래그가 undo 1스텝입니다. [패키지 README](packages/editor-ruler-ckeditor5) 참조.

`defineRulerPlugin`은 `ruler` 플러그인과 **함께** 툴바 커맨드들을 등록합니다 — 필요한 것을 `toolbarButtons`에 추가하세요:

- `rulerOptions` — **권장 단일 버튼**: 줄자 아이콘 드롭다운 하나에 보이기/숨기기 · 세로 줄자 · 가이드 잠금 · 가이드 지우기 + cm / inch / px (활성 상태 체크 표시)
- `toggleRuler` / `rulerUnit` — 핵심 기능을 버튼을 나눠 쓰고 싶을 때

Froala 옵션: `rulerVisible: false`면 가로 줄자를 숨긴 채 시작(플러그인·툴바는 살아 있어 나중에 토글로 켬), `rulerVertical: true`면 초기화 시 세로 줄자 표시, `rulerVerticalGutter: true`면 세로 줄자의 23px 자리를 처음부터 예약해(`scrollbar-gutter: stable`과 같은 발상) 토글해도 본문이 리플로우되지 않음, `rulerGuides: false`면 가이드선 비활성.

Tiptap·CKEditor 5도 숨긴 채 시작을 지원합니다: Tiptap은 `EditorRuler.configure({ visible: false })` + `showRuler`/`hideRuler`/`toggleRuler` 커맨드, CKEditor 5는 `editorRuler: { visible: false }` + 플러그인의 `show()`/`toggle()`. 세로 줄자는 현재 Froala 전용입니다.

## 기능

- 좌측 여백 / 우측 여백 / 첫 줄 들여쓰기 핸들 (내어쓰기(hanging indent) 지원)
- **세로 줄자** (`createVRuler`) — 에디터 좌측의 세로 눈금 스트립
- **가이드선** (`createGuides`) — 디자인 툴 관례 그대로: 가로 줄자에서 아래로 끌면 **가로 가이드**, 세로 줄자에서 오른쪽으로 끌면 **세로 가이드** (이동·잠금 가능, 줄자에 되돌려 놓으면 삭제; 순수 시각 요소로 문서 HTML에 남지 않음)
- 드래그 중 실시간 미리보기 + 제스처당 undo 경계 1회 (`commit` phase)
- 키보드 접근성: 핸들이 포커스 가능한 슬라이더 (`←`/`→`, `Shift`로 10px, `Home`/`End`)
- cm / in / px 눈금, 런타임 전환 가능
- CSS 커스텀 프로퍼티(`--edr-*`)로 테마링, 다크 모드 대응
- **UI 언어가 브라우저를 따라감** (`<html lang>` → `navigator.language`; ko/en 내장, `defineRulerPlugin(FE, { language, strings })`·`rulerLanguage`로 오버라이드)
- 탭 스톱은 현재 **범위 밖** — HTML에는 네이티브 탭 스톱 모델이 없음
- 테이블·이미지도 Word처럼 밀림: 테이블 안에서 드래그하면 **테이블 전체**가 이동, 셀 안 문단은 개별 들여쓰기, 이미지는 소속 블록과 함께 이동
- **테이블 컬럼 마커**: 테이블 안에 커서를 두면 줄자에 컬럼 경계 마커가 떠서 드래그로 인접 두 컬럼 폭 조절 (병합 셀 테이블은 마커 생략)
- **가이드 스냅**: 드래그 중 핸들·컬럼 마커가 가이드 근처에서 착 붙음 (`guideSnap` 옵션, 기본 5px)
- 출력은 순수 인라인 CSS — `<p style="margin-left: 75px; text-indent: 38px">` — 어디로 내보내도 레이아웃 유지

## 데모

라이브 플레이그라운드 (에디터별 탭 데모): **https://devslab-kr.github.io/editor-ruler/**

원클릭 샌드박스:

- [순수 contenteditable — StackBlitz](https://stackblitz.com/github/devslab-kr/editor-ruler/tree/main/examples/vanilla)
- [Froala — StackBlitz](https://stackblitz.com/github/devslab-kr/editor-ruler/tree/main/examples/froala)
- [Tiptap — StackBlitz](https://stackblitz.com/github/devslab-kr/editor-ruler/tree/main/examples/tiptap)
- [CKEditor 5 — StackBlitz](https://stackblitz.com/github/devslab-kr/editor-ruler/tree/main/examples/ckeditor5)

로컬:

```bash
pnpm install && pnpm build
# demo/index.html을 브라우저에서 열기 (순수 contenteditable + 코어 줄자)
```

## 개발

pnpm 모노레포. `pnpm build` / `pnpm test` / `pnpm typecheck`. 버저닝은 [changesets](https://github.com/changesets/changesets).

## 라이선스

[Apache-2.0](LICENSE) © [devslab](https://github.com/devslab-kr)
