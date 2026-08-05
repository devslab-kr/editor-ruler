import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createGuides } from '../src/guides';
import { createRuler } from '../src/ruler';
import { createVRuler } from '../src/vruler';

function pointer(type: string, clientX: number, clientY = 0): MouseEvent {
  return new MouseEvent(type, { clientX, clientY, bubbles: true, cancelable: true });
}

function makeSetup() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const onChange = vi.fn();
  const guides = createGuides(container, {
    getOffsetLeft: () => 40,
    getOffsetTop: () => 20,
    onChange,
  });
  const mount = document.createElement('div');
  document.body.appendChild(mount);
  const ruler = createRuler(mount, {
    getMetrics: () => ({ contentWidth: 600, leftMargin: 0, rightMargin: 0, firstLineIndent: 0 }),
    onChange: () => {},
    guides,
  });
  const vmount = document.createElement('div');
  document.body.appendChild(vmount);
  const vruler = createVRuler(vmount, { getMetrics: () => ({ contentHeight: 400 }), guides });
  const rulerRoot = mount.querySelector('.edr-ruler') as HTMLElement;
  const vrulerRoot = vmount.querySelector('.edr-vruler') as HTMLElement;
  return { container, guides, ruler, vruler, rulerRoot, vrulerRoot, onChange };
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('createGuides — design-tool orientation', () => {
  it('horizontal ruler drags out a horizontal guide (axis y)', () => {
    const { container, guides, rulerRoot, onChange } = makeSetup();
    rulerRoot.dispatchEvent(pointer('pointerdown', 150, 5));
    window.dispatchEvent(pointer('pointermove', 150, 90));
    // jsdom rects are zero: clientY > rulerRect.bottom(0) commits
    window.dispatchEvent(pointer('pointerup', 150, 90));
    expect(guides.list()).toEqual({ x: [], y: [70] }); // 90 - containerTop(0) - offsetTop(20)
    const el = container.querySelector('.edr-guide-y') as HTMLElement;
    expect(el.style.top).toBe('90px'); // offsetTop 20 + 70
    expect(onChange).toHaveBeenLastCalledWith({ x: [], y: [70] });
  });

  it('vertical ruler drags out a vertical guide (axis x)', () => {
    const { container, guides, vrulerRoot } = makeSetup();
    vrulerRoot.dispatchEvent(pointer('pointerdown', 5, 100));
    window.dispatchEvent(pointer('pointermove', 260, 100));
    // clientX > vrulerRect.right(0) commits
    window.dispatchEvent(pointer('pointerup', 260, 100));
    expect(guides.list()).toEqual({ x: [220], y: [] }); // 260 - containerLeft(0) - offsetLeft(40)
    const el = container.querySelector('.edr-guide-x') as HTMLElement;
    expect(el.style.left).toBe('260px'); // offsetLeft 40 + 220
  });

  it('discards a guide released back on its source ruler', () => {
    const { guides, rulerRoot, vrulerRoot } = makeSetup();
    rulerRoot.dispatchEvent(pointer('pointerdown', 100, 0));
    window.dispatchEvent(pointer('pointerup', 100, 0)); // clientY not below ruler bottom
    vrulerRoot.dispatchEvent(pointer('pointerdown', 0, 100));
    window.dispatchEvent(pointer('pointerup', 0, 100)); // clientX not right of ruler
    expect(guides.list()).toEqual({ x: [], y: [] });
  });

  it('does not start a guide from a margin-handle drag', () => {
    const { guides, rulerRoot } = makeSetup();
    const handle = rulerRoot.querySelector('.edr-handle-left') as HTMLElement;
    handle.dispatchEvent(pointer('pointerdown', 10, 0));
    window.dispatchEvent(pointer('pointerup', 10, 50));
    expect(guides.list()).toEqual({ x: [], y: [] });
  });

  it('moves guides along their own axis; releasing past the source edge deletes', () => {
    const { container, guides } = makeSetup();
    guides.set({ x: [100], y: [50] });

    const xGuide = container.querySelector('.edr-guide-x') as HTMLElement;
    xGuide.dispatchEvent(pointer('pointerdown', 100, 50));
    window.dispatchEvent(pointer('pointermove', 130, 50));
    window.dispatchEvent(pointer('pointerup', 130, 50));
    expect(guides.list().x).toEqual([130]);

    const yGuide = container.querySelector('.edr-guide-y') as HTMLElement;
    yGuide.dispatchEvent(pointer('pointerdown', 80, 50));
    window.dispatchEvent(pointer('pointermove', 80, 75));
    window.dispatchEvent(pointer('pointerup', 80, 75));
    expect(guides.list().y).toEqual([75]);

    // delete: x-guide released left of the container, y-guide above it
    xGuide.dispatchEvent(pointer('pointerdown', 130, 50));
    window.dispatchEvent(pointer('pointerup', -10, 50));
    yGuide.dispatchEvent(pointer('pointerdown', 80, 75));
    window.dispatchEvent(pointer('pointerup', 80, -10));
    expect(guides.list()).toEqual({ x: [], y: [] });
  });

  it('locking prevents creation and movement on both axes', () => {
    const { container, guides, rulerRoot, vrulerRoot } = makeSetup();
    guides.set({ x: [100], y: [60] });
    guides.setLocked(true);

    rulerRoot.dispatchEvent(pointer('pointerdown', 200, 0));
    window.dispatchEvent(pointer('pointerup', 200, 40));
    vrulerRoot.dispatchEvent(pointer('pointerdown', 0, 200));
    window.dispatchEvent(pointer('pointerup', 40, 200));
    expect(guides.list()).toEqual({ x: [100], y: [60] });

    const xGuide = container.querySelector('.edr-guide-x') as HTMLElement;
    xGuide.dispatchEvent(pointer('pointerdown', 100, 50));
    window.dispatchEvent(pointer('pointermove', 160, 50));
    window.dispatchEvent(pointer('pointerup', 160, 50));
    expect(guides.list().x).toEqual([100]);
  });

  it('clear removes all guides on both axes and notifies once', () => {
    const { guides, onChange } = makeSetup();
    guides.set({ x: [50], y: [150] });
    onChange.mockClear();
    guides.clear();
    expect(guides.list()).toEqual({ x: [], y: [] });
    expect(onChange).toHaveBeenCalledTimes(1);
    guides.clear();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('setVisible hides the layer without dropping guides', () => {
    const { container, guides } = makeSetup();
    guides.set({ x: [80] });
    guides.setVisible(false);
    expect((container.querySelector('.edr-guides') as HTMLElement).style.display).toBe('none');
    expect(guides.list().x).toEqual([80]);
    guides.setVisible(true);
    expect((container.querySelector('.edr-guides') as HTMLElement).style.display).toBe('');
  });

  it('refresh repositions guides on both axes when offsets change', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    let left = 40;
    let top = 10;
    const guides = createGuides(container, {
      getOffsetLeft: () => left,
      getOffsetTop: () => top,
    });
    guides.set({ x: [100], y: [30] });
    left = 60;
    top = 25;
    guides.refresh();
    expect((container.querySelector('.edr-guide-x') as HTMLElement).style.left).toBe('160px');
    expect((container.querySelector('.edr-guide-y') as HTMLElement).style.top).toBe('55px');
  });
});
