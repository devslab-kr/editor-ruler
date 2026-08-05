import { clamp, computeTicks, type RulerUnit } from './units';
import { ensureStyles } from './styles';
import type { Guides } from './guides';

export interface RulerMetrics {
  /** Width of the writable area in px (between the editor's padding edges). */
  contentWidth: number;
  /** Left margin of the current paragraph(s), px. */
  leftMargin: number;
  /** Right margin of the current paragraph(s), px. */
  rightMargin: number;
  /** First-line indent relative to the left margin, px. Negative = hanging indent. */
  firstLineIndent: number;
}

export type RulerChangePhase = 'drag' | 'commit';

export interface RulerChange {
  leftMargin?: number;
  rightMargin?: number;
  firstLineIndent?: number;
}

export interface RulerLabels {
  leftMargin: string;
  rightMargin: string;
  firstLineIndent: string;
  columnBoundary: string;
}

export interface RulerColumns {
  /**
   * All column boundaries in ruler px, left→right (n+1 entries for n columns),
   * or null when the selection is not inside a table.
   */
  get: () => number[] | null;
  /** Inner boundary `index` (1..n-1) moved to `x`. */
  onChange: (index: number, x: number, phase: RulerChangePhase) => void;
  /** Minimum column width in px. Default 24. */
  minWidth?: number;
}

export interface RulerOptions {
  /** Reads current metrics from the host editor. Called on every refresh and at drag start. */
  getMetrics: () => RulerMetrics;
  /**
   * Receives changed values in px. Fired repeatedly with phase 'drag' while a handle
   * moves, and once with phase 'commit' on release (the undo-boundary moment).
   */
  onChange: (change: RulerChange, phase: RulerChangePhase) => void;
  unit?: RulerUnit;
  /** Minimum writable column width in px kept between the handles. Default 48. */
  minColumnWidth?: number;
  /** Accessible labels for the three handles (i18n). */
  labels?: Partial<RulerLabels>;
  /**
   * A guides controller (from createGuides). When present, pressing on an empty
   * part of the ruler strip and dragging down creates a *horizontal* guide line
   * (the design-tool convention: a guide is parallel to its source ruler).
   */
  guides?: Guides;
  /** Table column-boundary markers (Word-style), fed by the host adapter. */
  columns?: RulerColumns;
  /**
   * Snap distance in px for pointer drags near a vertical guide (handles and
   * column markers). 0 disables snapping. Default 5.
   */
  guideSnap?: number;
}

export interface Ruler {
  element: HTMLElement;
  refresh(): void;
  setUnit(unit: RulerUnit): void;
  getUnit(): RulerUnit;
  destroy(): void;
}

type HandleKey = 'leftMargin' | 'rightMargin' | 'firstLineIndent';

const DEFAULT_LABELS: RulerLabels = {
  leftMargin: 'Left margin',
  rightMargin: 'Right margin',
  firstLineIndent: 'First-line indent',
  columnBoundary: 'Column boundary',
};

const DEFAULT_MIN_COLUMN_MARKER_GAP = 24;

const DEFAULT_MIN_COLUMN = 48;
const KEYBOARD_STEP = 1;
const KEYBOARD_STEP_LARGE = 10;

const SVG_NS = 'http://www.w3.org/2000/svg';
const RULER_HEIGHT = 22;

/** Triangle pointing down (first-line indent, top row) / up (margins, bottom row). */
const TRIANGLE_DOWN = 'M0,0 L12,0 L6,10 Z';
const TRIANGLE_UP = 'M6,0 L12,10 L0,10 Z';

interface HandleSpec {
  key: HandleKey;
  className: string;
  path: string;
  /** +1 when moving the pointer right increases the value, -1 when it decreases it. */
  sign: 1 | -1;
  position(m: RulerMetrics): number;
  /** Inverse of position(): the value that places the handle at `pos`. */
  valueForPosition(m: RulerMetrics, pos: number): number;
  min(m: RulerMetrics): number;
  max(m: RulerMetrics, minColumn: number): number;
}

const HANDLE_SPECS: HandleSpec[] = [
  {
    key: 'firstLineIndent',
    className: 'edr-handle-indent',
    path: TRIANGLE_DOWN,
    sign: 1,
    position: (m) => m.leftMargin + m.firstLineIndent,
    valueForPosition: (m, pos) => pos - m.leftMargin,
    min: (m) => -m.leftMargin,
    max: (m, minColumn) => m.contentWidth - m.leftMargin - m.rightMargin - minColumn,
  },
  {
    key: 'leftMargin',
    className: 'edr-handle-left',
    path: TRIANGLE_UP,
    sign: 1,
    position: (m) => m.leftMargin,
    valueForPosition: (_m, pos) => pos,
    min: (m) => Math.max(0, -m.firstLineIndent),
    max: (m, minColumn) =>
      m.contentWidth - m.rightMargin - minColumn - Math.max(0, m.firstLineIndent),
  },
  {
    key: 'rightMargin',
    className: 'edr-handle-right',
    path: TRIANGLE_UP,
    sign: -1,
    position: (m) => m.contentWidth - m.rightMargin,
    valueForPosition: (m, pos) => m.contentWidth - pos,
    min: () => 0,
    max: (m, minColumn) =>
      m.contentWidth - m.leftMargin - Math.max(0, m.firstLineIndent) - minColumn,
  },
];

export function createRuler(mount: HTMLElement, options: RulerOptions): Ruler {
  const doc = mount.ownerDocument;
  ensureStyles(doc);

  let unit: RulerUnit = options.unit ?? 'cm';
  const minColumn = options.minColumnWidth ?? DEFAULT_MIN_COLUMN;
  const labels: RulerLabels = { ...DEFAULT_LABELS, ...options.labels };
  const abort = new AbortController();
  const { signal } = abort;

  const root = doc.createElement('div');
  root.className = 'edr-ruler';

  const scale = doc.createElementNS(SVG_NS, 'svg');
  scale.setAttribute('class', 'edr-scale');
  scale.setAttribute('height', String(RULER_HEIGHT));
  root.appendChild(scale);

  const handles = new Map<HandleKey, HTMLElement>();
  for (const spec of HANDLE_SPECS) {
    const handle = doc.createElement('div');
    handle.className = `edr-handle ${spec.className}`;
    handle.tabIndex = 0;
    handle.setAttribute('role', 'slider');
    handle.setAttribute('aria-orientation', 'horizontal');
    handle.setAttribute('aria-label', labels[spec.key]);
    const svg = doc.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 12 10');
    const path = doc.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', spec.path);
    svg.appendChild(path);
    handle.appendChild(svg);
    root.appendChild(handle);
    handles.set(spec.key, handle);
    wireHandle(handle, spec);
  }

  if (options.guides) {
    root.classList.add('edr-has-guides');
    root.addEventListener(
      'pointerdown',
      (event: PointerEvent) => {
        if ((event.target as HTMLElement | null)?.closest?.('.edr-handle, .edr-colmark')) return;
        options.guides!.beginCreate(event, root, 'y');
      },
      { signal },
    );
  }

  mount.appendChild(root);

  let lastScaleWidth = -1;
  let lastScaleUnit: RulerUnit | null = null;

  function readMetrics(): RulerMetrics {
    const m = options.getMetrics();
    return {
      contentWidth: Math.max(0, m.contentWidth),
      leftMargin: m.leftMargin || 0,
      rightMargin: m.rightMargin || 0,
      firstLineIndent: m.firstLineIndent || 0,
    };
  }

  function refresh(): void {
    layout(readMetrics());
  }

  function layout(m: RulerMetrics): void {
    root.style.width = `${m.contentWidth}px`;
    if (m.contentWidth !== lastScaleWidth || unit !== lastScaleUnit) {
      renderScale(m.contentWidth);
      lastScaleWidth = m.contentWidth;
      lastScaleUnit = unit;
    }
    for (const spec of HANDLE_SPECS) {
      const handle = handles.get(spec.key)!;
      handle.style.left = `${spec.position(m)}px`;
      handle.setAttribute('aria-valuemin', String(Math.round(spec.min(m))));
      handle.setAttribute('aria-valuemax', String(Math.round(spec.max(m, minColumn))));
      handle.setAttribute('aria-valuenow', String(Math.round(valueOf(spec.key, m))));
    }
    syncColumnMarkers();
  }

  // ---- table column-boundary markers -------------------------------------

  let columnEdges: number[] = [];
  const columnMarkers: HTMLElement[] = [];

  function syncColumnMarkers(): void {
    if (!options.columns) return;
    columnEdges = options.columns.get() ?? [];
    const innerCount = Math.max(0, columnEdges.length - 2);
    while (columnMarkers.length > innerCount) columnMarkers.pop()!.remove();
    while (columnMarkers.length < innerCount) {
      const marker = doc.createElement('div');
      marker.className = 'edr-colmark';
      marker.tabIndex = 0;
      marker.setAttribute('role', 'slider');
      marker.setAttribute('aria-orientation', 'horizontal');
      marker.setAttribute('aria-label', labels.columnBoundary);
      wireColumnMarker(marker);
      root.appendChild(marker);
      columnMarkers.push(marker);
    }
    columnMarkers.forEach((marker, i) => {
      const index = i + 1;
      marker.dataset.index = String(index);
      marker.style.left = `${columnEdges[index]!}px`;
      marker.setAttribute('aria-valuenow', String(Math.round(columnEdges[index]!)));
    });
  }

  function columnBounds(index: number): { lo: number; hi: number } {
    const gap = options.columns?.minWidth ?? DEFAULT_MIN_COLUMN_MARKER_GAP;
    const lo = (columnEdges[index - 1] ?? 0) + gap;
    const hi = (columnEdges[index + 1] ?? Number.MAX_SAFE_INTEGER) - gap;
    return { lo, hi: Math.max(lo, hi) };
  }

  function applyColumn(marker: HTMLElement, index: number, raw: number, phase: RulerChangePhase): number {
    const { lo, hi } = columnBounds(index);
    const next = clamp(raw, lo, hi);
    marker.style.left = `${next}px`;
    marker.setAttribute('aria-valuenow', String(Math.round(next)));
    options.columns!.onChange(index, next, phase);
    return next;
  }

  function wireColumnMarker(marker: HTMLElement): void {
    marker.addEventListener(
      'pointerdown',
      (down: PointerEvent) => {
        down.preventDefault();
        down.stopPropagation();
        marker.focus();
        const index = Number(marker.dataset.index);
        const startX = down.clientX;
        const startEdge = columnEdges[index] ?? 0;
        let last = startEdge;
        const onMove = (move: PointerEvent) => {
          const raw = startEdge + (move.clientX - startX);
          const snapped = snapPosition(raw);
          last = applyColumn(marker, index, snapped ?? raw, 'drag');
        };
        const onUp = () => {
          doc.defaultView?.removeEventListener('pointermove', onMove);
          doc.defaultView?.removeEventListener('pointerup', onUp);
          applyColumn(marker, index, last, 'commit');
          refresh();
        };
        doc.defaultView?.addEventListener('pointermove', onMove, { signal });
        doc.defaultView?.addEventListener('pointerup', onUp, { signal });
      },
      { signal },
    );
    marker.addEventListener(
      'keydown',
      (event: KeyboardEvent) => {
        const index = Number(marker.dataset.index);
        const current = columnEdges[index] ?? 0;
        const step = event.shiftKey ? KEYBOARD_STEP_LARGE : KEYBOARD_STEP;
        let next: number | null = null;
        if (event.key === 'ArrowLeft') next = current - step;
        else if (event.key === 'ArrowRight') next = current + step;
        else return;
        event.preventDefault();
        applyColumn(marker, index, next, 'commit');
        refresh();
      },
      { signal },
    );
  }

  function renderScale(widthPx: number): void {
    while (scale.firstChild) scale.removeChild(scale.firstChild);
    scale.setAttribute('width', String(widthPx));
    scale.setAttribute('viewBox', `0 0 ${Math.max(widthPx, 1)} ${RULER_HEIGHT}`);
    for (const tick of computeTicks(widthPx, unit)) {
      const height = tick.kind === 'major' ? 7 : tick.kind === 'mid' ? 5 : 3;
      const line = doc.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', String(tick.x));
      line.setAttribute('x2', String(tick.x));
      line.setAttribute('y1', String(RULER_HEIGHT - height));
      line.setAttribute('y2', String(RULER_HEIGHT));
      line.setAttribute('stroke', 'currentColor');
      line.setAttribute('stroke-width', '1');
      scale.appendChild(line);
      if (tick.label !== undefined && tick.x > 0) {
        const text = doc.createElementNS(SVG_NS, 'text');
        text.setAttribute('x', String(tick.x));
        text.setAttribute('y', '11');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', 'currentColor');
        text.setAttribute('font-size', '9');
        text.textContent = tick.label;
        scale.appendChild(text);
      }
    }
  }

  function valueOf(key: HandleKey, m: RulerMetrics): number {
    return m[key];
  }

  /** Nearest vertical guide within the snap distance of `pos`, or null. */
  function snapPosition(pos: number): number | null {
    const distance = options.guideSnap ?? 5;
    if (!options.guides || !(distance > 0)) return null;
    let best: number | null = null;
    for (const g of options.guides.list().x) {
      const d = Math.abs(g - pos);
      if (d <= distance && (best === null || d < Math.abs(best - pos))) best = g;
    }
    return best;
  }

  function applyValue(spec: HandleSpec, m: RulerMetrics, raw: number, phase: RulerChangePhase): void {
    const lo = spec.min(m);
    // Guard against degenerate ranges (e.g. a content area narrower than minColumnWidth).
    const hi = Math.max(lo, spec.max(m, minColumn));
    const next = clamp(raw, lo, hi);
    const updated: RulerMetrics = { ...m, [spec.key]: next };
    layout(updated);
    options.onChange({ [spec.key]: next }, phase);
  }

  function wireHandle(handle: HTMLElement, spec: HandleSpec): void {
    handle.addEventListener(
      'pointerdown',
      (down: PointerEvent) => {
        down.preventDefault();
        handle.focus();
        const startMetrics = readMetrics();
        const startValue = valueOf(spec.key, startMetrics);
        const startX = down.clientX;
        let lastValue = startValue;

        const onMove = (move: PointerEvent) => {
          const raw = startValue + spec.sign * (move.clientX - startX);
          const lo = spec.min(startMetrics);
          const hi = Math.max(lo, spec.max(startMetrics, minColumn));
          let value = clamp(raw, lo, hi);
          const snapped = snapPosition(spec.position({ ...startMetrics, [spec.key]: value }));
          if (snapped !== null) {
            value = clamp(spec.valueForPosition(startMetrics, snapped), lo, hi);
          }
          lastValue = value;
          applyValue(spec, startMetrics, lastValue, 'drag');
        };
        const onUp = () => {
          doc.defaultView?.removeEventListener('pointermove', onMove);
          doc.defaultView?.removeEventListener('pointerup', onUp);
          applyValue(spec, startMetrics, lastValue, 'commit');
          refresh();
        };
        doc.defaultView?.addEventListener('pointermove', onMove, { signal });
        doc.defaultView?.addEventListener('pointerup', onUp, { signal });
      },
      { signal },
    );

    handle.addEventListener(
      'keydown',
      (event: KeyboardEvent) => {
        const m = readMetrics();
        const current = valueOf(spec.key, m);
        let next: number | null = null;
        const step = event.shiftKey ? KEYBOARD_STEP_LARGE : KEYBOARD_STEP;
        switch (event.key) {
          case 'ArrowLeft':
            next = current - spec.sign * step;
            break;
          case 'ArrowRight':
            next = current + spec.sign * step;
            break;
          case 'Home':
            next = spec.min(m);
            break;
          case 'End':
            next = spec.max(m, minColumn);
            break;
          default:
            return;
        }
        event.preventDefault();
        applyValue(spec, m, next, 'commit');
      },
      { signal },
    );
  }

  refresh();

  return {
    element: root,
    refresh,
    setUnit(next: RulerUnit) {
      unit = next;
      refresh();
    },
    getUnit: () => unit,
    destroy() {
      abort.abort();
      root.remove();
    },
  };
}
