import { ensureStyles } from './styles';

export interface GuidesOptions {
  /** Left offset (px) from the container's border edge to the ruler's 0 point. */
  getOffsetLeft?: () => number;
  /** Fired after a guide is added, moved, removed, or the set is cleared. */
  onChange?: (guides: number[]) => void;
}

export interface Guides {
  element: HTMLElement;
  /** Guide positions in ruler coordinates (px from the ruler's 0 point), sorted. */
  list(): number[];
  set(xs: number[]): void;
  clear(): void;
  setLocked(locked: boolean): void;
  isLocked(): boolean;
  setVisible(visible: boolean): void;
  isVisible(): boolean;
  /**
   * Start creating a guide from a pointerdown on the ruler strip. The guide
   * follows the pointer; releasing below the ruler commits it, releasing on or
   * above the ruler discards it.
   */
  beginCreate(event: PointerEvent, rulerRoot: HTMLElement): void;
  /** Reposition guides (call when the container's padding/offset changes). */
  refresh(): void;
  destroy(): void;
}

interface GuideEntry {
  x: number;
  el: HTMLElement;
}

/**
 * Vertical guide lines overlaid on the editor content area — the drag-out-of-
 * the-ruler pattern from design tools. Purely visual: guides never touch the
 * document HTML.
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

  function notify(): void {
    options.onChange?.(list());
  }

  function list(): number[] {
    return guides.map((g) => g.x).sort((a, b) => a - b);
  }

  function position(entry: GuideEntry): void {
    entry.el.style.left = `${offsetLeft() + entry.x}px`;
  }

  function makeGuideEl(temp = false): HTMLElement {
    const el = doc.createElement('div');
    el.className = temp ? 'edr-guide edr-guide-temp' : 'edr-guide';
    layer.appendChild(el);
    return el;
  }

  function addGuide(x: number): GuideEntry {
    const entry: GuideEntry = { x: Math.max(0, x), el: makeGuideEl() };
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
        const startX = down.clientX;
        const startValue = entry.x;
        const containerTop = container.getBoundingClientRect().top;
        const onMove = (move: PointerEvent) => {
          entry.x = Math.max(0, startValue + (move.clientX - startX));
          position(entry);
        };
        const onUp = (up: PointerEvent) => {
          win.removeEventListener('pointermove', onMove);
          win.removeEventListener('pointerup', onUp);
          if (up.clientY < containerTop) {
            removeGuide(entry);
          }
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
    set(xs: number[]) {
      for (const g of [...guides]) removeGuide(g);
      for (const x of xs) addGuide(x);
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
    beginCreate(event: PointerEvent, rulerRoot: HTMLElement) {
      if (locked || !visible) return;
      event.preventDefault();
      const rulerRect = rulerRoot.getBoundingClientRect();
      const temp = makeGuideEl(true);
      let x = Math.max(0, event.clientX - rulerRect.left);
      temp.style.left = `${offsetLeft() + x}px`;
      const onMove = (move: PointerEvent) => {
        x = Math.max(0, move.clientX - rulerRect.left);
        temp.style.left = `${offsetLeft() + x}px`;
      };
      const onUp = (up: PointerEvent) => {
        win.removeEventListener('pointermove', onMove);
        win.removeEventListener('pointerup', onUp);
        temp.remove();
        // Commit only when released below the ruler strip.
        if (up.clientY > rulerRect.bottom) {
          addGuide(x);
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
