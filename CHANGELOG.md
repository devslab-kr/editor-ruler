# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
`@devslab/editor-ruler` and `@devslab/editor-ruler-froala` are released together
with a shared version number.

## [Unreleased]

## [0.11.0] - 2026-08-06

### Added

- **`@devslab/editor-ruler-ckeditor5`** — new package: a CKEditor 5 plugin
  (`ckeditor5 >= 42`) mounting the ruler above the editable. Indentation is
  stored as model attributes (`rulerMarginLeft`/`rulerMarginRight`/
  `rulerTextIndent`) and down-cast to plain inline CSS; existing inline
  indentation up-casts back in. Guide lines, guide snapping, and one undo
  step per drag gesture included. Configure via the `editorRuler` editor
  config (`unit`, `guides`, `guideSnap`, `language` — defaults to the
  editor's UI language, then the browser).
- Landing page gains a CKEditor 5 demo tab (CDN modules) and
  `examples/ckeditor5` for one-click StackBlitz.

## [0.10.0] - 2026-08-06

### Added

- **`@devslab/editor-ruler-tiptap`** — new package: a Tiptap extension (v2/v3)
  mounting the ruler above the editor. Indentation lives in a `rulerIndent`
  node attribute on configurable `types` (paragraph/heading by default) and
  renders as plain inline CSS, so `getHTML()` stays portable and existing
  inline indentation parses back in. Guide lines and guide snapping included.
  A whole drag gesture is exactly one undo step (drag transactions skip
  history; release records baseline → final). Options: `types`, `unit`,
  `guides`, `guideSnap`, `language`, `element`.

## [0.9.0] - 2026-08-06

### Added

- **Guide snapping**: margin/indent handles and table column markers snap to a
  nearby vertical guide (within 5px, configurable via
  `RulerOptions.guideSnap`; 0 disables) during pointer drags. Snapping uses the
  handle's *visual position* — the first-line indent handle snaps where the
  triangle sits, not on its relative value. Keyboard adjustments never snap.

## [0.8.0] - 2026-08-06

### Added

- **Word-style table column markers**: with the caret inside a table, the
  horizontal ruler shows a small square marker on every inner column boundary;
  dragging one (or using arrow keys — the markers are accessible sliders)
  resizes the two adjacent columns, live, with one undo step per gesture.
  - Core: `RulerOptions.columns` — `{ get(): number[] | null, onChange(index,
    x, phase), minWidth? }`. Markers never trigger guide creation.
  - Froala adapter: feeds boundaries from the selected table's cell rects and
    writes percentage widths to the affected column's cells in every row.
    Tables with merged cells (colspan/rowspan) show no markers — boundary math
    is ambiguous there.

## [0.7.0] - 2026-08-06

### Added

- `@devslab/editor-ruler-froala` — **everything can be pushed, like Word**:
  - a selection inside a table now indents the **whole `<table>`** (margins on
    the table block; `text-indent` is never written onto tables). Replaces the
    0.1.1 stay-inert behavior. Multiple selected cells dedupe to one table.
  - a bare `<img>` selection resolves to its containing block, so images push
    with their paragraph regardless of how the editor reports the selection.

## [0.6.0] - 2026-08-06

### Added

- **UI language follows the browser**: toolbar titles, dropdown items, and the
  handles' accessible labels localize automatically — explicit option →
  `<html lang>` → browser language → English. Korean and English ship built in.
  - Core: `detectLanguage` / `resolveRulerLabels` / `RULER_LABEL_LOCALES`.
  - Froala: `defineRulerPlugin(FroalaEditor, { language, strings })` for
    overrides at registration time; per-editor handle labels honor
    `rulerLanguage` (new option) or Froala's own `language` option.

## [0.5.0] - 2026-08-05

### Changed (breaking)

- Guide orientation now follows the design-tool convention (Photoshop/Figma):
  dragging from the **horizontal ruler creates a horizontal guide**, and the
  **vertical ruler creates a vertical guide** — 0.4.0 had this inverted and the
  vertical ruler could not create guides at all. Releasing a guide back on its
  source ruler still deletes it.
- `Guides.list()`, the `onChange` payload, and the Froala adapter's
  `getGuides()` now return `{ x: number[], y: number[] }` instead of a flat
  array; `Guides.set()` takes the same shape. `Guides.beginCreate()` takes an
  explicit axis. `createVRuler` accepts a `guides` controller.

## [0.4.0] - 2026-08-05

### Added

- `@devslab/editor-ruler` — **vertical ruler** (`createVRuler`): a scale strip
  for the left edge of the editor (no handles yet — a positional reference like
  Word's vertical ruler), sharing the unit system with the horizontal ruler.
- `@devslab/editor-ruler` — **guide lines** (`createGuides`): press an empty
  spot on the horizontal ruler and drag down to drop a vertical guide over the
  content area (the design-tool pattern). Guides are draggable, deletable by
  releasing them back on the ruler, lockable, and purely visual — they never
  touch the document HTML. `createRuler` accepts a `guides` controller.
- `@devslab/editor-ruler-froala` — new options `rulerVertical` (default false)
  and `rulerGuides` (default true); plugin API gains `toggleVRuler`,
  `isVRulerVisible`, `setGuidesLocked`, `isGuidesLocked`, `clearGuides`,
  `getGuides`. The `rulerOptions` dropdown grows matching items: Vertical
  Ruler, Lock Guides, Clear Guides.

## [0.3.0] - 2026-08-05

### Added

- `@devslab/editor-ruler-froala` — `rulerOptions` **unified toolbar dropdown**
  (recommended): one ruler-icon button holding Show/Hide plus the cm / inch / px
  unit switch, with active states checkmarked on open. Fixes the confusing UI of
  two identical ruler icons sitting side by side; `toggleRuler` and `rulerUnit`
  remain available as separate buttons.

## [0.2.0] - 2026-08-05

### Added

- `@devslab/editor-ruler-froala` — `rulerUnit` **dropdown toolbar command**:
  switches the ruler scale between cm / inch / px at runtime, with the active
  unit checkmarked when the dropdown opens (`refreshOnShow`). Add `'rulerUnit'`
  to `toolbarButtons` next to `'toggleRuler'`. Future ruler options (vertical
  ruler, guide freezing) will live in the same dropdown. Plugin API gains
  `setUnit(unit)` / `getUnit()`.

## [0.1.1] - 2026-08-05

### Fixed

- `@devslab/editor-ruler-froala` — the ruler no longer writes meaningless
  `margin-left`/`margin-right`/`text-indent` inline styles onto table structure
  elements (`td`/`th`/`tr`/`table`). When the selection sits directly on a bare
  table cell the ruler stays inert (no fallback to an unrelated block); real
  block elements *inside* a cell (e.g. a `<p>`) still receive indentation as
  before. Word-style table column markers remain on the roadmap.

## [0.1.0] - 2026-08-05

### Added

- `@devslab/editor-ruler` — editor-agnostic core: Word-like horizontal ruler with
  left/right margin and first-line indent drag handles (hanging indent supported),
  cm/in/px scales switchable at runtime, live drag preview with a single undo
  boundary per gesture (`drag`/`commit` phases), keyboard-accessible ARIA slider
  handles (`←`/`→`, `Shift` ×10, `Home`/`End`), theming via `--edr-*` CSS custom
  properties with dark-mode defaults. Zero dependencies; esm/cjs/iife builds
  (`EditorRuler` global for CDN use).
- `@devslab/editor-ruler-froala` — Froala WYSIWYG editor adapter:
  `defineRulerPlugin(FroalaEditor)` registers a standard `ruler` plugin
  (`rulerEnabled`/`rulerUnit` options) plus a `toggleRuler` toolbar command with a
  ruler icon and active-state reflection. Reflects the paragraphs under the current
  selection, writes `margin-left`/`margin-right`/`text-indent` inline styles, and
  records one Froala undo step per gesture. iife build exposes the
  `EditorRulerFroala` global (core bundled) for CDN use.

[Unreleased]: https://github.com/devslab-kr/editor-ruler/compare/v0.11.0...HEAD
[0.11.0]: https://github.com/devslab-kr/editor-ruler/compare/v0.10.0...v0.11.0
[0.10.0]: https://github.com/devslab-kr/editor-ruler/compare/v0.9.0...v0.10.0
[0.9.0]: https://github.com/devslab-kr/editor-ruler/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/devslab-kr/editor-ruler/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/devslab-kr/editor-ruler/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/devslab-kr/editor-ruler/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/devslab-kr/editor-ruler/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/devslab-kr/editor-ruler/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/devslab-kr/editor-ruler/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/devslab-kr/editor-ruler/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/devslab-kr/editor-ruler/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/devslab-kr/editor-ruler/releases/tag/v0.1.0
