import { clamp, computeTicks, type RulerUnit } from './units';
import { ensureStyles } from './styles';

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
};

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
    min: (m) => -m.leftMargin,
    max: (m, minColumn) => m.contentWidth - m.leftMargin - m.rightMargin - minColumn,
  },
  {
    key: 'leftMargin',
    className: 'edr-handle-left',
    path: TRIANGLE_UP,
    sign: 1,
    position: (m) => m.leftMargin,
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
          lastValue = clamp(raw, lo, hi);
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
