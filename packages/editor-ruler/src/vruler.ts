import { computeTicks, type RulerUnit } from './units';
import { ensureStyles } from './styles';
import type { Guides } from './guides';

export interface VRulerMetrics {
  /** Height of the writable area in px (between the editor's padding edges). */
  contentHeight: number;
}

export interface VRulerOptions {
  getMetrics: () => VRulerMetrics;
  unit?: RulerUnit;
  /**
   * A guides controller (from createGuides). When present, pressing the strip
   * and dragging right creates a *vertical* guide line.
   */
  guides?: Guides;
}

export interface VRuler {
  element: HTMLElement;
  refresh(): void;
  setUnit(unit: RulerUnit): void;
  getUnit(): RulerUnit;
  destroy(): void;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const RULER_WIDTH = 22;

/**
 * A vertical scale strip (no handles yet — a positional reference like Word's
 * vertical ruler). Mount it to the left of the editor content area.
 */
export function createVRuler(mount: HTMLElement, options: VRulerOptions): VRuler {
  const doc = mount.ownerDocument;
  ensureStyles(doc);

  let unit: RulerUnit = options.unit ?? 'cm';

  const root = doc.createElement('div');
  root.className = 'edr-vruler';

  const scale = doc.createElementNS(SVG_NS, 'svg');
  scale.setAttribute('class', 'edr-vscale');
  scale.setAttribute('width', String(RULER_WIDTH));
  root.appendChild(scale);

  if (options.guides) {
    root.classList.add('edr-has-guides');
    root.addEventListener('pointerdown', (event: PointerEvent) => {
      options.guides!.beginCreate(event, root, 'x');
    });
  }

  mount.appendChild(root);

  let lastHeight = -1;
  let lastUnit: RulerUnit | null = null;

  function refresh(): void {
    const height = Math.max(0, options.getMetrics().contentHeight);
    root.style.height = `${height}px`;
    if (height === lastHeight && unit === lastUnit) return;
    lastHeight = height;
    lastUnit = unit;
    renderScale(height);
  }

  function renderScale(heightPx: number): void {
    while (scale.firstChild) scale.removeChild(scale.firstChild);
    scale.setAttribute('height', String(heightPx));
    scale.setAttribute('viewBox', `0 0 ${RULER_WIDTH} ${Math.max(heightPx, 1)}`);
    for (const tick of computeTicks(heightPx, unit)) {
      const length = tick.kind === 'major' ? 7 : tick.kind === 'mid' ? 5 : 3;
      const line = doc.createElementNS(SVG_NS, 'line');
      line.setAttribute('y1', String(tick.x));
      line.setAttribute('y2', String(tick.x));
      line.setAttribute('x1', String(RULER_WIDTH - length));
      line.setAttribute('x2', String(RULER_WIDTH));
      line.setAttribute('stroke', 'currentColor');
      line.setAttribute('stroke-width', '1');
      scale.appendChild(line);
      if (tick.label !== undefined && tick.x > 0) {
        const text = doc.createElementNS(SVG_NS, 'text');
        text.setAttribute('x', '10');
        text.setAttribute('y', String(tick.x + 3));
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', 'currentColor');
        text.setAttribute('font-size', '9');
        text.textContent = tick.label;
        scale.appendChild(text);
      }
    }
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
      root.remove();
    },
  };
}
