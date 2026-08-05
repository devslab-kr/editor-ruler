# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
`@devslab/editor-ruler` and `@devslab/editor-ruler-froala` are released together
with a shared version number.

## [Unreleased]

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

[Unreleased]: https://github.com/devslab-kr/editor-ruler/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/devslab-kr/editor-ruler/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/devslab-kr/editor-ruler/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/devslab-kr/editor-ruler/releases/tag/v0.1.0
