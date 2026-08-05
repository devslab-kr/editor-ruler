import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createGuides } from '../src/guides';
import { createRuler } from '../src/ruler';

function pointer(type: string, clientX: number, clientY = 0): MouseEvent {
  return new MouseEvent(type, { clientX, clientY, bubbles: true, cancelable: true });
}

function makeSetup() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const onChange = vi.fn();
  const guides = createGuides(container, { getOffsetLeft: () => 40, onChange });
  const mount = document.createElement('div');
  document.body.appendChild(mount);
  const ruler = createRuler(mount, {
    getMetrics: () => ({ contentWidth: 600, leftMargin: 0, rightMargin: 0, firstLineIndent: 0 }),
    onChange: () => {},
    guides,
  });
  const rulerRoot = mount.querySelector('.edr-ruler') as HTMLElement;
  return { container, guides, ruler, rulerRoot, onChange };
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('createGuides', () => {
  it('creates a guide by dragging from the ruler and releasing below it', () => {
    const { container, guides, rulerRoot, onChange } = makeSetup();
    rulerRoot.dispatchEvent(pointer('pointerdown', 150, 0));
    window.dispatchEvent(pointer('pointermove', 200, 30));
    // jsdom rects are zero, so any clientY > 0 counts as "below the ruler"
    window.dispatchEvent(pointer('pointerup', 200, 30));
    expect(guides.list()).toEqual([200]);
    const el = container.querySelector('.edr-guide') as HTMLElement;
    expect(el.style.left).toBe('240px'); // 40 offset + 200
    expect(onChange).toHaveBeenLastCalledWith([200]);
  });

  it('discards the guide when released back on the ruler', () => {
    const { guides, rulerRoot } = makeSetup();
    rulerRoot.dispatchEvent(pointer('pointerdown', 100, 0));
    window.dispatchEvent(pointer('pointerup', 100, 0)); // clientY not below rect.bottom (0)
    expect(guides.list()).toEqual([]);
  });

  it('does not start a guide from a handle drag', () => {
    const { guides, rulerRoot } = makeSetup();
    const handle = rulerRoot.querySelector('.edr-handle-left') as HTMLElement;
    handle.dispatchEvent(pointer('pointerdown', 10, 0));
    window.dispatchEvent(pointer('pointerup', 10, 50));
    expect(guides.list()).toEqual([]);
  });

  it('moves an existing guide by dragging, deletes when released above the container', () => {
    const { container, guides } = makeSetup();
    guides.set([100]);
    const el = container.querySelector('.edr-guide') as HTMLElement;
    el.dispatchEvent(pointer('pointerdown', 100, 50));
    window.dispatchEvent(pointer('pointermove', 130, 50));
    window.dispatchEvent(pointer('pointerup', 130, 50));
    expect(guides.list()).toEqual([130]);

    el.dispatchEvent(pointer('pointerdown', 130, 50));
    window.dispatchEvent(pointer('pointerup', 130, -20)); // above container top (0) → delete
    expect(guides.list()).toEqual([]);
  });

  it('locking prevents both creation and movement', () => {
    const { container, guides, rulerRoot } = makeSetup();
    guides.set([100]);
    guides.setLocked(true);
    expect(guides.isLocked()).toBe(true);

    rulerRoot.dispatchEvent(pointer('pointerdown', 200, 0));
    window.dispatchEvent(pointer('pointerup', 200, 40));
    expect(guides.list()).toEqual([100]);

    const el = container.querySelector('.edr-guide') as HTMLElement;
    el.dispatchEvent(pointer('pointerdown', 100, 50));
    window.dispatchEvent(pointer('pointermove', 160, 50));
    window.dispatchEvent(pointer('pointerup', 160, 50));
    expect(guides.list()).toEqual([100]);
  });

  it('clear removes all guides and notifies once', () => {
    const { guides, onChange } = makeSetup();
    guides.set([50, 150]);
    onChange.mockClear();
    guides.clear();
    expect(guides.list()).toEqual([]);
    expect(onChange).toHaveBeenCalledTimes(1);
    guides.clear(); // empty → no extra notify
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('setVisible hides the layer without dropping guides', () => {
    const { container, guides } = makeSetup();
    guides.set([80]);
    guides.setVisible(false);
    expect((container.querySelector('.edr-guides') as HTMLElement).style.display).toBe('none');
    expect(guides.list()).toEqual([80]);
    guides.setVisible(true);
    expect((container.querySelector('.edr-guides') as HTMLElement).style.display).toBe('');
  });

  it('refresh repositions guides when the offset changes', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    let offset = 40;
    const guides = createGuides(container, { getOffsetLeft: () => offset });
    guides.set([100]);
    offset = 60;
    guides.refresh();
    expect((container.querySelector('.edr-guide') as HTMLElement).style.left).toBe('160px');
  });
});
