# Architecture

How editor-ruler works, from first principles to code — written as a handover
document for someone joining the project (or building the next adapter).

## 0. The one-sentence insight

> **A ruler is just a UI for visually editing three CSS properties.**

Translate what Word's ruler does into HTML and this is the whole mapping:

| Word ruler gesture | CSS equivalent |
|---|---|
| Left margin (bottom-left ▲) | `margin-left: 60px` |
| Right margin (bottom-right ▲) | `margin-right: 40px` |
| First-line indent (top ▼) | `text-indent: 40px` |
| Hanging indent (▼ left of ▲) | `text-indent: -40px` |

All three are per-block CSS properties with a 1:1 px correspondence. Drag a
handle → a px number changes → write that number into the paragraph's inline
style → done. There is no magic.

(The one thing that does *not* map is tab stops — CSS has no tab-stop model —
which is why we deliberately left them out, and probably why editor vendors
never built a ruler in the first place.)

## 1. Why a core + adapters

```
┌──────────────────────────────────────────────┐
│  @devslab/editor-ruler   (core, zero deps)   │
│  · draws the scale (SVG)                     │
│  · drags three handles (px math, clamping,   │
│    snapping)                                 │
│  · guide lines, table column markers         │
│  · knows nothing about any editor            │
└──────────────┬───────────────────────────────┘
               │  talks through two callbacks only:
               │  getMetrics()  ← "tell me the current state"
               │  onChange()    → "apply these px values"
      ┌────────┼─────────┬──────────────┐
   -froala  -tiptap  -ckeditor5    (your adapter?)
```

The core requires exactly two callbacks from its host:

```ts
const ruler = createRuler(mountElement, {
  // ① "Give me the selected paragraph's state in px" — called on every refresh
  getMetrics: () => ({
    contentWidth: 674,     // width of the editor's writable area
    leftMargin: 60,        // current block's margin-left
    rightMargin: 0,
    firstLineIndent: 40,   // text-indent, relative to the left margin
  }),
  // ② "The user moved a handle — apply this" — called throughout a drag
  onChange: (change, phase) => {
    // change: only what moved, e.g. { leftMargin: 80 }
    // phase:  'drag'   → live preview, fired repeatedly
    //         'commit' → pointer released, the undo boundary
  },
});
```

An adapter's entire job is translating those two callbacks into one editor's
API. That's why every adapter is 200–300 lines and why a new editor is a
weekend project, not a rewrite.

## 2. The core, in code

### 2.1 Coordinates and ticks (`units.ts`)

CSS fixes **1 inch = 96px**, and everything derives from that:

```ts
export const PX_PER_INCH = 96;
export const PX_PER_CM = 96 / 2.54;   // ≈ 37.795px

const TICK_SPECS = {
  cm: { minor: 0.25, mid: 0.5, major: 1 },
  in: { minor: 0.125, mid: 0.5, major: 1 },
  px: { minor: 10,   mid: 50,  major: 100 },
};

// width in px → array of { x, kind, label } — a pure, easily-tested function
export function computeTicks(widthPx, unit) { ... }
```

`renderScale` turns that array into SVG `<line>`/`<text>` elements. SVG is
crisp at any zoom, inspectable in tests, and inherits theme colors via
`currentColor`.

### 2.2 The geometry of three handles (`ruler.ts`)

The central data structure is `HANDLE_SPECS` — each handle declares its
position formula and travel limits:

```ts
const HANDLE_SPECS = [
  { key: 'leftMargin',                        // bottom-left triangle
    sign: 1,                                  // pointer right = value grows
    position: (m) => m.leftMargin,
    min: (m) => Math.max(0, -m.firstLineIndent),
    max: (m, gap) => m.contentWidth - m.rightMargin - gap - Math.max(0, m.firstLineIndent),
  },
  { key: 'firstLineIndent',                   // top triangle
    sign: 1,
    position: (m) => m.leftMargin + m.firstLineIndent,   // relative to margin!
    min: (m) => -m.leftMargin,                // hanging-indent limit
    max: (m, gap) => m.contentWidth - m.leftMargin - m.rightMargin - gap,
  },
  { key: 'rightMargin',
    sign: -1,                                 // ★ pointer right = value SHRINKS
    position: (m) => m.contentWidth - m.rightMargin,
    ...
  },
];
```

Three things worth internalizing:

1. **`sign: -1`** — the right-margin handle sits at
   `contentWidth - rightMargin`, so dragging right must *decrease* the value.
   The first implementation missed this and the handle moved backwards;
   `sign` generalizes the fix.
2. **The indent is relative** — its position is `leftMargin + firstLineIndent`,
   so dragging the left margin carries the indent triangle along automatically,
   exactly like Word.
3. **`min`/`max` clamping** keeps handles from crossing and preserves a
   minimum writable column (`minColumnWidth`, default 48px).

### 2.3 Dragging: the delta approach

```ts
handle.addEventListener('pointerdown', (down) => {
  const startMetrics = readMetrics();   // snapshot at drag start
  const startValue   = startMetrics[spec.key];
  const startX       = down.clientX;

  const onMove = (move) => {
    // ★ start value + pointer delta — works wherever the ruler sits on screen
    const raw = startValue + spec.sign * (move.clientX - startX);
    let value = clamp(raw, lo, hi);
    // guide snapping: if the handle's *visual position* lands within 5px of a
    // vertical guide, solve the value back from the snapped position
    const snapped = snapPosition(spec.position({ ...startMetrics, [spec.key]: value }));
    if (snapped !== null) value = clamp(spec.valueForPosition(startMetrics, snapped), lo, hi);
    applyValue(spec, startMetrics, value, 'drag');
  };
  const onUp = () => {
    applyValue(spec, startMetrics, lastValue, 'commit');  // one undo boundary
    refresh();
  };
  window.addEventListener('pointermove', onMove);  // window-level, so the drag
  window.addEventListener('pointerup', onUp);      // survives leaving the strip
});
```

Why the `'drag'` / `'commit'` split? The screen must follow in real time
(dozens of calls per drag), but the undo stack must record *one drag = one
undo step*. How adapters honor that is §4.

Accessibility lives here too: every handle is a focusable `role="slider"` with
`aria-valuenow`, driveable by keyboard (←/→ = 1px, Shift = 10px, Home/End).

## 3. The easiest adapter: Froala (direct-DOM editors)

Froala edits a plain `contenteditable`, so the adapter is the most literal.

**① Read (`getMetrics`)** — computed style of the selected block:

```ts
function getMetrics() {
  const el = editor.el;                          // the contenteditable
  const contentWidth = el.clientWidth - paddingLeft - paddingRight;
  const block = editor.selection.blocks()[0];
  const style = getComputedStyle(block);
  return {
    contentWidth,
    leftMargin:      parseFloat(style.marginLeft) || 0,
    rightMargin:     parseFloat(style.marginRight) || 0,
    firstLineIndent: parseFloat(style.textIndent) || 0,
  };
}
```

**② Write (`onChange`)** — inline styles on every selected block:

```ts
function applyChange(change, phase) {
  for (const block of selectedBlocks()) {
    if (change.leftMargin !== undefined) block.style.marginLeft = `${change.leftMargin}px`;
    if (change.firstLineIndent !== undefined && block.tagName !== 'TABLE')
      block.style.textIndent = `${change.firstLineIndent}px`;
  }
  if (phase === 'commit') editor.undo.saveStep();   // ③ undo hook: once, on release
}
```

**Target normalization** — deciding *what* gets pushed. Two real-world traps
live here:

```ts
function normalizeBlock(b, el) {
  // Trap 1: CSS ignores margins on table CELLS. With the caret in a cell,
  // selection.blocks() returns the <td>; styling it moves nothing on screen
  // but pollutes the exported HTML. Promote to the <table> — Word's behavior:
  // the ruler indents the table as a block.
  if (TABLE_TAGS.has(b.tagName)) return b.closest('table');

  // Trap 2: selecting an image can report the <img> itself. It's not a block —
  // promote to its containing paragraph.
  if (b.tagName === 'IMG') return b.closest(BLOCK_SELECTOR);

  return b;
}
```

The toolbar uses Froala's official extension points —
`DefineIconTemplate` (SVG icon) + `RegisterCommand('rulerOptions',
{ type: 'dropdown', ... })` — one ruler-icon dropdown holding show/hide,
guide lock/clear, and the cm/inch/px switch.

## 4. The harder adapters: Tiptap & CKEditor 5 (document-model editors)

This is the project's most important conceptual shift.

In Tiptap (ProseMirror) and CKEditor 5, **the DOM is not the source of
truth — the internal document model is**, and the DOM is merely its render.
Write `style` directly onto the DOM and the next render cycle erases it as
"not in the model". Therefore:

> **Store indentation as a node attribute; render it to inline CSS via the
> editor's own serialization rules.**

Tiptap:

```ts
addGlobalAttributes() {
  return [{
    types: ['paragraph', 'heading'],
    attributes: {
      rulerIndent: {
        default: null,
        // model → HTML: attribute renders as inline style
        renderHTML: (attrs) => ({ style: 'margin-left: 60px; text-indent: 40px' }),
        // HTML → model: existing inline styles parse back in (paste, initial load)
        parseHTML: (el) => ({ marginLeft: parseFloat(el.style.marginLeft), ... }),
      },
    },
  }];
}

// onChange → a transaction, never a DOM write
tr.setNodeMarkup(pos, undefined, { ...node.attrs, rulerIndent: next });
view.dispatch(tr);
```

CKEditor 5 is the same philosophy with different vocabulary:
`schema.extend('$block', { allowAttributes: [...] })`, a **downcast**
converter (model attribute → `style`), an **upcast** converter (`style` →
model attribute), and `writer.setAttribute(...)` inside `model.change()`.

### The "one undo step per drag" trick

Dispatching a transaction per pointermove piles dozens of entries onto the
undo stack — Ctrl+Z would rewind 1px at a time. The fix:

```
during 'drag':   transactions carry addToHistory: false
                 (screen moves; history doesn't)
on 'commit':     1) silently restore the baseline (history-free)
                 2) apply the final value on a normal transaction
                 → history holds exactly one step: start → end
```

Why two stages? At commit time the document already holds the final drag
value, so recording it directly is a no-op (or captures the wrong "before"
state). Restoring the baseline first makes the recorded step genuinely span
start → end. CKEditor 5 uses `enqueueChange({ isUndoable: false })` for the
same dance.

## 5. Guides, column markers, and the rest

**Guide lines (`guides.ts`)** — the Photoshop pattern, built as an overlay
*outside the document*: an absolutely-positioned `pointer-events: none` layer
over the editor, with each guide a 1px line inside it. Because guides are not
document DOM, they can never appear in `getHTML()`/`getData()`. Creation
follows the design-tool convention — press an empty spot on the horizontal
ruler and drag down for a horizontal guide (the vertical ruler drags out
vertical guides); release back on the source ruler to discard, drag an
existing guide back onto it to delete. Locking disables both creation and
movement.

**Snapping** — during a handle drag, the handle's *visual position* is
compared against vertical guides; within `guideSnap` px (default 5) the value
is solved back from the snapped position (see §2.3). Keyboard adjustments
never snap — that's the precision path.

**Table column markers** — with the caret inside a table, the adapter reads
cell `getBoundingClientRect()`s and feeds the core an array of boundary
x-coordinates (`columns.get()`). The core renders a small square marker per
inner boundary; dragging one recomputes the two adjacent columns' widths as
**percentages of the table width** and writes them to that column's cells in
every row. Tables with merged cells (colspan/rowspan) get no markers —
boundary math is ambiguous there, and not showing beats guessing.

**i18n** — one priority chain: explicit option → `<html lang>` →
`navigator.language` → `en`. Toolbar labels and ARIA slider names all follow
it (ko/en built in).

## 6. Writing a new adapter (the actual handover)

Suppose you're adding TinyMCE. Answer five questions:

1. **How do I get the selected blocks?** → `editor.selection.getSelectedBlocks()`
2. **Direct-DOM or document-model?** → TinyMCE is direct-DOM → start by
   copying the Froala adapter
3. **How do I write styles?** → `editor.dom.setStyle(block, 'margin-left', ...)`
4. **How do I create an undo boundary?** → `editor.undoManager.transact(fn)`
5. **Where does the ruler mount?** → `insertBefore` the editable in its parent

Then wire the normalization from §3 (cells → table, img → parent block) and
call `ruler.refresh()` on selection change, content change, and window resize.
Copy an existing adapter's test file as your template.

The Summernote adapter is the worked example of exactly this: it is direct-DOM
like Froala, so it reuses the same table/image normalization and column-marker
math, and only the four host-specific calls differ — `$.summernote.plugins` for
registration, `context.layoutInfo.editable` for the DOM, `editor.getLastRange`
for the selection, and `editor.afterCommand` for the undo boundary (that method
is what calls `history.recordUndo()`).

## 7. Landmines we already stepped on (so you don't)

1. **jsdom has no layout** — `clientWidth` is 0, which collapses clamp ranges.
   Tests set `Object.defineProperty(el, 'clientWidth', { value: 600 })`; the
   core guards degenerate ranges with `hi = max(lo, hi)`.
2. **Froala toolbar buttons ignore synthetic `click()`** — they respond to
   `mousedown`/`mouseup` sequences. Matters for any automated testing.
3. **Tiptap's Image extension silently drops content** — `data:` URIs need
   `allowBase64: true`; `<img>` inside `<p>` needs `inline: true`. Nothing
   errors; nodes just vanish on parse.
4. **CSS ignores margins on table cells** — the reason §3's normalization
   exists.
5. **Build order matters** — adapter typecheck resolves the core's
   `dist/*.d.ts`, so `verify` must run `build → typecheck → test`. This only
   bites on clean checkouts (CI), never on a warm local tree.
6. **Tiptap v3 emits `create` asynchronously** — tests must await editor
   readiness before touching the mounted ruler.
7. **The vertical ruler strip consumes real width** — it wraps the editor's
   scroll container in a flex row (`.edr-vwrap`) with a 23px strip beside it,
   so showing it narrows the writable area by 23px and the horizontal ruler
   correctly re-reads the narrower width. That's geometry, not a bug — but
   the reflow on toggle is jarring, so each adapter has a gutter option
   (`rulerVerticalGutter` on Froala, `verticalGutter` on Tiptap/CKEditor 5)
   that reserves the column at init (`visibility: hidden`, scrollbar-gutter
   style) so toggling never moves the content. Field-reported twice before this was understood: once as
   "content shifts 820 → 800", once as the strip height bug (§ the wrapper,
   not the growing `.fr-element`, is the fixed viewport).
8. **Hand-edited version strings rot silently.** The `examples/` pins sat at
   `0.10.0` while the packages shipped `0.16.0`, so every StackBlitz demo
   linked from the README installed a build without the features the docs
   advertised — and nothing failed, because no test reads a demo's
   `package.json`. Published READMEs had already rotted the same way once
   (`@0.1` CDN pins, fixed in 0.12.2). Anything version-shaped must be
   derived from the core package and guarded by `check:versions`; see §8.

## 8. File map & dev loop

```
packages/editor-ruler/src/
  units.ts     px ↔ cm/in conversion, tick computation (pure functions)
  ruler.ts     horizontal ruler: handles, drags, clamps, snap, column markers
  vruler.ts    vertical scale strip
  guides.ts    guide-line overlay
  styles.ts    injected CSS (themeable via --edr-* custom properties)
  locales.ts   ko/en labels + language detection
packages/editor-ruler-froala/src/index.ts     direct-DOM adapter + toolbar dropdown
packages/editor-ruler-tiptap/src/index.ts     model adapter (node attribute + transactions)
packages/editor-ruler-ckeditor5/src/index.ts  model adapter (schema + up/downcast)
packages/editor-ruler-summernote/src/index.ts direct-DOM adapter (jQuery plugin + toolbar dropdown)
examples/                                     one-click StackBlitz projects
site/                                         landing page with per-editor demo tabs
```

Dev loop: `pnpm verify` (version check → build → typecheck → test) →
`pnpm build:pages` → open `.pages/index.html` and try it in a real browser →
PR → merging to `main` redeploys the site → pushing a `v*` tag publishes all
packages to npm.

**Releasing.** `packages/editor-ruler/package.json` is the single source of
truth for the version; every other version string is derived. Bump it, then
run `pnpm sync:versions`, which rewrites the sibling packages' versions, the
`examples/` dependency pins, and the README CDN pins (URLs carry the minor,
the pinning table carries both). `pnpm check:versions` is the same script in
report-only mode; it runs inside `verify`, in CI on every PR, and therefore
in `publish.yml` before anything reaches npm — so a stale derived reference
fails the build instead of shipping.
