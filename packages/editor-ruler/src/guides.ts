import { ensureStyles } from './styles';

/** 'x' = vertical line positioned along the x axis; 'y' = horizontal line along y. */
export type GuideAxis = 'x' | 'y';

export interface GuideSet {
  x: number[];
  y: number[];
}

export interface GuidesOptions {
  /** Left offset (px) from the container's border edge to the ruler's 0 point. */
  getOffsetLeft?: () => number;
  /** Top offset (px) from the container's border edge to the vertical ruler's 0 point. */
  getOffsetTop?: () => number;
  /** Fired after a guide is added, moved, removed, or the set is cleared. */
  onChange?: (guides: GuideSet) => void;
}

export interface Guides {
  element: HTMLElement;
  /** Guide positions in ruler coordinates, sorted per axis. */
  list(): GuideSet;
  set(guides: Partial<GuideSet>): void;
  clear(): void;
  setLocked(locked: boolean): void;
  isLocked(): boolean;
  setVisible(visible: boolean): void;
  isVisible(): boolean;
  /**
   * Start creating a guide from a pointerdown on a ruler strip, following the
   * design-tool convention: the horizontal ruler drags out a *horizontal*
   * guide (axis 'y'), the vertical ruler drags out a *vertical* guide (axis
   * 'x'). Releasing back on the source ruler discards the guide.
   */
  beginCreate(event: PointerEvent, rulerRoot: HTMLElement, axis: GuideAxis): void;
  /** Reposition guides (call when the container's padding/offset changes). */
  refresh(): void;
  destroy(): void;
}

interface GuideEntry {
  axis: GuideAxis;
  pos: number;
  el: HTMLElement;
}

/**
 * Guide lines overlaid on the editor content area — the drag-out-of-the-ruler
 * pattern from design tools. Purely visual: guides never touch the document
 * HTML.
 */
export function createGuides(container: HTMLElement, options: GuidesOptions = {}): Guides {
  const doc = container.ownerDocument;
  ensureStyles(doc);

  const win = doc.defaultView!;
  const abort = new AbortController();
  const { signal } = abort;

  if (win.getComputedStyle(container).position === 'static') {
    container.style.position = 'relative';
  }

  const layer = doc.createElement('div');
  layer.className = 'edr-guides';
  container.appendChild(layer);

  const guides: GuideEntry[] = [];
  let locked = false;
  let visible = true;

  const offsetLeft = () => options.getOffsetLeft?.() ?? 0;
  const offsetTop = () => options.getOffsetTop?.() ?? 0;

  function notify(): void {
    options.onChange?.(list());
  }

  function list(): GuideSet {
    const sorted = (axis: GuideAxis) =>
      guides
        .filter((g) => g.axis === axis)
        .map((g) => g.pos)
        .sort((a, b) => a - b);
    return { x: sorted('x'), y: sorted('y') };
  }

  function position(entry: GuideEntry): void {
    if (entry.axis === 'x') entry.el.style.left = `${offsetLeft() + entry.pos}px`;
    else entry.el.style.top = `${offsetTop() + entry.pos}px`;
  }

  function makeGuideEl(axis: GuideAxis, temp = false): HTMLElement {
    const el = doc.createElement('div');
    el.className = `edr-guide edr-guide-${axis}${temp ? ' edr-guide-temp' : ''}`;
    layer.appendChild(el);
    return el;
  }

  function addGuide(axis: GuideAxis, pos: number): GuideEntry {
    const entry: GuideEntry = { axis, pos: Math.max(0, pos), el: makeGuideEl(axis) };
    position(entry);
    wireGuideDrag(entry);
    guides.push(entry);
    return entry;
  }

  function removeGuide(entry: GuideEntry): void {
    entry.el.remove();
    const i = guides.indexOf(entry);
    if (i >= 0) guides.splice(i, 1);
  }

  function wireGuideDrag(entry: GuideEntry): void {
    entry.el.addEventListener(
      'pointerdown',
      (down: PointerEvent) => {
        if (locked) return;
        down.preventDefault();
        down.stopPropagation();
        const start = entry.axis === 'x' ? down.clientX : down.clientY;
        const startPos = entry.pos;
        const containerRect = container.getBoundingClientRect();
        const onMove = (move: PointerEvent) => {
          const client = entry.axis === 'x' ? move.clientX : move.clientY;
          entry.pos = Math.max(0, startPos + (client - start));
          position(entry);
        };
        const onUp = (up: PointerEvent) => {
          win.removeEventListener('pointermove', onMove);
          win.removeEventListener('pointerup', onUp);
          // Released back past the container edge on the source-ruler side → delete.
          const gone =
            entry.axis === 'x' ? up.clientX < containerRect.left : up.clientY < containerRect.top;
          if (gone) removeGuide(entry);
          notify();
        };
        win.addEventListener('pointermove', onMove, { signal });
        win.addEventListener('pointerup', onUp, { signal });
      },
      { signal },
    );
  }

  return {
    element: layer,
    list,
    set(next: Partial<GuideSet>) {
      for (const g of [...guides]) removeGuide(g);
      for (const x of next.x ?? []) addGuide('x', x);
      for (const y of next.y ?? []) addGuide('y', y);
      notify();
    },
    clear() {
      if (guides.length === 0) return;
      for (const g of [...guides]) removeGuide(g);
      notify();
    },
    setLocked(next: boolean) {
      locked = next;
      layer.classList.toggle('edr-guides-locked', locked);
    },
    isLocked: () => locked,
    setVisible(next: boolean) {
      visible = next;
      layer.style.display = visible ? '' : 'none';
    },
    isVisible: () => visible,
    beginCreate(event: PointerEvent, rulerRoot: HTMLElement, axis: GuideAxis) {
      if (locked || !visible) return;
      event.preventDefault();
      const rulerRect = rulerRoot.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const temp = makeGuideEl(axis, true);
      const posFrom = (clientX: number, clientY: number) =>
        Math.max(
          0,
          axis === 'x'
            ? clientX - containerRect.left - offsetLeft()
            : clientY - containerRect.top - offsetTop(),
        );
      let pos = posFrom(event.clientX, event.clientY);
      const place = () => {
        if (axis === 'x') temp.style.left = `${offsetLeft() + pos}px`;
        else temp.style.top = `${offsetTop() + pos}px`;
      };
      place();
      const onMove = (move: PointerEvent) => {
        pos = posFrom(move.clientX, move.clientY);
        place();
      };
      const onUp = (up: PointerEvent) => {
        win.removeEventListener('pointermove', onMove);
        win.removeEventListener('pointerup', onUp);
        temp.remove();
        // Commit only when released past the source ruler, over the content.
        const committed =
          axis === 'y' ? up.clientY > rulerRect.bottom : up.clientX > rulerRect.right;
        if (committed) {
          addGuide(axis, pos);
          notify();
        }
      };
      win.addEventListener('pointermove', onMove, { signal });
      win.addEventListener('pointerup', onUp, { signal });
    },
    refresh() {
      for (const g of guides) position(g);
    },
    destroy() {
      abort.abort();
      layer.remove();
      guides.length = 0;
    },
  };
}
