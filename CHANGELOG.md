# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
`@devslab/editor-ruler` and `@devslab/editor-ruler-froala` are released together
with a shared version number.

## [Unreleased]

## [1.1.0] - 2026-08-08

### Added

- **`@devslab/editor-ruler-summernote`** — new package: a [Summernote](https://summernote.org)
  plugin (`summernote >= 0.8`). Register with `defineRulerPlugin($)` and add
  `'ruler'` to `toolbar` for the ruler-icon dropdown (Show/Hide, Vertical
  Ruler, Lock/Clear Guides, cm/inch/px). Options live under the `ruler` key:
  `enabled`, `visible`, `unit`, `vertical`, `verticalGutter`, `guides`,
  `guideSnap`, `language`.

  Summernote is direct-DOM like Froala, so this adapter reuses the same
  behavior rather than approximating it: **whole-table indent and column-width
  markers work here too** — the first adapter besides Froala to have them.
  Commits go through Summernote's own `editor.afterCommand`, which is the
  method that calls `history.recordUndo()`, so a whole drag gesture is exactly
  one undo step.

- Landing page gains a Summernote demo tab (jQuery and Summernote lazy-load
  from a CDN only when the tab is opened) and a Summernote integration
  section; `examples/summernote` added for one-click StackBlitz.

### Changed

- Docs that counted adapters ("all three", "the four packages") are now
  count-free or corrected, and the feature split is stated where it matters:
  the vertical ruler and guides are on every adapter, while whole-table indent
  and column markers are on the direct-DOM adapters (Froala, Summernote).
- README CDN pins bumped `@1.0` → `@1.1`.

## [1.0.1] - 2026-08-08

### Fixed

- The 1.0.0 stability statement only reached the root README, so the npm
  pages — where people actually decide whether to adopt — announced 1.0.0
  without saying what "stable" covers. Each package README now carries the
  commitment up front and links to the full scope. Docs-only release
  (republished because npm versions are immutable).

## [1.0.0] - 2026-08-08

**Stable.** The API is now under semantic versioning: breaking changes to
the documented public surface require a major release. Nothing about the
ruler's behavior changed in this release — **upgrading from 0.16.0 needs no
code changes.**

What the commitment covers:

- Every symbol exported from the four packages' entry points, and the
  options/config each adapter accepts.
- The `--edr-*` CSS custom properties used for theming.
- The output contract: indentation is written as plain inline CSS
  (`margin-left` / `margin-right` / `text-indent` in px), so exported HTML
  stays portable.

What it deliberately does **not** cover, so these can still improve:

- The injected DOM structure and internal class names (`.edr-vwrap`,
  `.edr-froala-vmount`, …). Theme with the CSS variables, not by
  selector-matching internals.
- Anything marked `@internal`.

### Added

- `@devslab/editor-ruler-tiptap` — `RulerStorage` is now **exported**. It is
  the type of `editor.storage.editorRuler`, which the README documents as
  public API, but consumers previously had no way to name it.
- `@devslab/editor-ruler-froala` — `FroalaRulerApi` is now **exported**, for
  the same reason: it types `editor.ruler`.

### Changed

- `@devslab/editor-ruler-tiptap` — the implementation-only fields
  (`setVerticalVisible`, `cleanup`) were moved off the public `RulerStorage`
  type. They were never meant to be called from outside, and freezing them
  into a stable contract would have blocked internal refactors. Runtime
  behavior is unchanged.

### Fixed

- The `examples/` StackBlitz projects still pinned `@devslab/editor-ruler*`
  at `^0.10.0` / `^0.11.0`, so every one-click demo linked from the READMEs
  and the landing page installed a build with no vertical ruler, no gutter,
  and no CKEditor 5 toolbar dropdown. Pins now track the released version.
  (No package changed, so no republish is needed — StackBlitz reads `main`.)

### Changed

- Versions are now **derived, not hand-edited**: `scripts/sync-versions.mjs`
  propagates `packages/editor-ruler/package.json`'s version to the sibling
  packages, the `examples/` pins, and the README CDN pins. `pnpm
  sync:versions` writes, `pnpm check:versions` reports; the check runs inside
  `verify`, on every CI run, and thus in `publish.yml` before anything is
  published — stale references now fail the build instead of shipping.

## [0.16.0] - 2026-08-07

### Added

- **Vertical ruler on every adapter** — the core `createVRuler` strip was
  only wired into Froala; now Tiptap and CKEditor 5 mount it too (flex-wrap
  the editable with the 23px strip beside it, exactly the Froala mechanic),
  including the gutter behavior and vertical-guide dragging:
  - `@devslab/editor-ruler-tiptap` — `vertical` / `verticalGutter` options
    plus `showVerticalRuler` / `hideVerticalRuler` / `toggleVerticalRuler`
    commands; strip handle at `editor.storage.editorRuler.vruler`, state at
    `…verticalVisible`.
  - `@devslab/editor-ruler-ckeditor5` — `editorRuler.vertical` /
    `editorRuler.verticalGutter` config, `showVRuler()` / `hideVRuler()` /
    `toggleVRuler()` / `isVRulerVisible()` plugin API, and a **Vertical
    Ruler entry in the `editorRuler` toolbar dropdown** (ko/en).
  - `verticalGutter: true` reserves the strip's 23px column up front
    (`scrollbar-gutter: stable` style) so toggling never reflows the
    content — same option Froala got in 0.13.0.

### Changed

- README CDN pins bumped `@0.15` → `@0.16`.

## [0.15.0] - 2026-08-06

### Added

- **Start-hidden parity across adapters** — the Froala-only `rulerVisible`
  idea (0.14.0) now exists everywhere:
  - `@devslab/editor-ruler-tiptap` — `visible` option (default true) plus
    **`showRuler` / `hideRuler` / `toggleRuler` commands**; current state at
    `editor.storage.editorRuler.visible`. Typed via Tiptap `Commands` /
    `Storage` module augmentation.
  - `@devslab/editor-ruler-ckeditor5` — `editorRuler.visible` config
    (default true); the existing `show()`/`hide()`/`toggle()` plugin API and
    toolbar dropdown bring it up later. The `editorRuler` config key is now
    typed via `EditorConfig` module augmentation.
  - Note: the vertical ruler (and its `rulerVerticalGutter`) remains
    Froala-only for now.
- Landing page gains a **CKEditor 5 연동 section** (it had Froala and Tiptap
  but never CKEditor 5) and documents the new visibility controls.

### Changed

- README CDN pins bumped `@0.14` → `@0.15`.

## [0.14.0] - 2026-08-06

### Added

- `@devslab/editor-ruler-froala` — **`rulerVisible` option** (default true):
  controls whether the horizontal ruler starts visible with the editor.
  `rulerVisible: false` starts it hidden while keeping the plugin and its
  toolbar commands alive, so users toggle it on when they want it — the
  start-state counterpart to `rulerVertical`, completing the symmetry
  (`rulerEnabled: false` still disables the plugin entirely).

### Changed

- README CDN pins bumped `@0.13` → `@0.14`.

## [0.13.0] - 2026-08-06

### Added

- `@devslab/editor-ruler-froala` — **`rulerVerticalGutter` option** (default
  false): reserves the vertical ruler's 23px column from init, like CSS
  `scrollbar-gutter: stable`. Without it, showing the vertical ruler narrows
  the writable area by 23px (the strip has to take its space from somewhere,
  and the horizontal ruler correctly re-reads the narrower width — e.g.
  820 → ~797); with the gutter on, that space is always reserved, so toggling
  the vertical ruler never reflows the content. Prompted by a field report of
  the width shift — thank you!

### Changed

- README CDN pins bumped `@0.12` → `@0.13`.

## [0.12.3] - 2026-08-06

### Fixed

- `@devslab/editor-ruler-froala` — the vertical ruler sized itself to
  `.fr-element` (which grows with content) instead of `.fr-wrapper` (the
  fixed-height scroll container), so with a fixed editor height and long
  content the strip outgrew the visible editor. It is now capped at the
  wrapper's viewport height, falling back to the content height when the
  wrapper has no fixed layout (`heightMin`-only setups, jsdom). Reported by
  a user running a fixed-height Froala — thank you!

## [0.12.2] - 2026-08-06

### Fixed

- README CDN examples still pinned `@0.1` from the first release — updated to
  the current minor (`@0.12`) across all package READMEs, and the landing
  page's version-pinning note now auto-fills both the exact version and the
  minor pin at build time so it can't go stale again. Docs-only release
  (republished so npmjs shows the corrected READMEs).

## [0.12.1] - 2026-08-06

### Changed

- Search discoverability: compound keywords added to every package
  (`froala-ruler`, `tiptap-ruler`, `ckeditor-ruler`, `horizontal-ruler`, …)
  and the landing site now ships `robots.txt` + `sitemap.xml`. No code
  changes.

## [0.12.0] - 2026-08-06

### Added

- `@devslab/editor-ruler-ckeditor5` — **`editorRuler` toolbar item**: a
  ruler-icon dropdown holding Show/Hide, Lock Guides, Clear Guides, and the
  cm/inch/px unit switch, with active states checkmarked on open and labels
  following the editor UI language (ko/en built in). The plugin API gains
  `show`/`hide`/`toggle`/`isVisible`, `setUnit`/`getUnit`,
  `setGuidesLocked`/`isGuidesLocked`/`clearGuides`.
- Landing demo polish: the Tiptap tab now carries a hand-wired mini toolbar
  (Tiptap is headless — this makes the difference from the bare-core tab
  visible) plus loading placeholders for the CDN-loaded Tiptap and CKEditor
  tabs; the CKEditor demo toolbar includes the new `editorRuler` dropdown.

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

[Unreleased]: https://github.com/devslab-kr/editor-ruler/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/devslab-kr/editor-ruler/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/devslab-kr/editor-ruler/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/devslab-kr/editor-ruler/compare/v0.16.0...v1.0.0
[0.16.0]: https://github.com/devslab-kr/editor-ruler/compare/v0.15.0...v0.16.0
[0.15.0]: https://github.com/devslab-kr/editor-ruler/compare/v0.14.0...v0.15.0
[0.14.0]: https://github.com/devslab-kr/editor-ruler/compare/v0.13.0...v0.14.0
[0.13.0]: https://github.com/devslab-kr/editor-ruler/compare/v0.12.3...v0.13.0
[0.12.3]: https://github.com/devslab-kr/editor-ruler/compare/v0.12.2...v0.12.3
[0.12.2]: https://github.com/devslab-kr/editor-ruler/compare/v0.12.1...v0.12.2
[0.12.1]: https://github.com/devslab-kr/editor-ruler/compare/v0.12.0...v0.12.1
[0.12.0]: https://github.com/devslab-kr/editor-ruler/compare/v0.11.0...v0.12.0
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
