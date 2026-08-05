import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createGuides } from '../src/guides';
import { createRuler, type RulerMetrics } from '../src/ruler';

function pointer(type: string, clientX: number, clientY = 0): MouseEvent {
  return new MouseEvent(type, { clientX, clientY, bubbles: true, cancelable: true });
}

function makeSetup(guideXs: number[], options: { guideSnap?: number; edges?: number[] } = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const guides = createGuides(container);
  guides.set({ x: guideXs });
  const metrics: RulerMetrics = { contentWidth: 600, leftMargin: 0, rightMargin: 0, firstLineIndent: 0 };
  const changes: Array<Record<string, number>> = [];
  const onColumnChange = vi.fn();
  const mount = document.createElement('div');
  document.body.appendChild(mount);
  createRuler(mount, {
    getMetrics: () => ({ ...metrics }),
    onChange: (change) => {
      changes.push(change as Record<string, number>);
      Object.assign(metrics, change);
    },
    guides,
    ...(options.guideSnap !== undefined ? { guideSnap: options.guideSnap } : {}),
    ...(options.edges ? { columns: { get: () => options.edges!, onChange: onColumnChange } } : {}),
  });
  return { metrics, changes, mount, onColumnChange };
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('guide snapping', () => {
  it('left-margin handle snaps to a guide within 5px during drag', () => {
    const { changes, mount } = makeSetup([150]);
    const left = mount.querySelector('.edr-handle-left') as HTMLElement;
    left.dispatchEvent(pointer('pointerdown', 0));
    window.dispatchEvent(pointer('pointermove', 147));
    window.dispatchEvent(pointer('pointerup', 147));
    expect(changes.at(-1)).toEqual({ leftMargin: 150 });
  });

  it('does not snap outside the threshold', () => {
    const { changes, mount } = makeSetup([150]);
    const left = mount.querySelector('.edr-handle-left') as HTMLElement;
    left.dispatchEvent(pointer('pointerdown', 0));
    window.dispatchEvent(pointer('pointermove', 140));
    window.dispatchEvent(pointer('pointerup', 140));
    expect(changes.at(-1)).toEqual({ leftMargin: 140 });
  });

  it('first-line indent snaps on its visual position, not its raw value', () => {
    const { changes, metrics, mount } = makeSetup([150]);
    metrics.leftMargin = 50;
    const indent = mount.querySelector('.edr-handle-indent') as HTMLElement;
    indent.dispatchEvent(pointer('pointerdown', 50));
    // handle position = leftMargin(50) + value; pointer at +97 → value 97 → pos 147 → snap 150 → value 100
    window.dispatchEvent(pointer('pointermove', 147));
    window.dispatchEvent(pointer('pointerup', 147));
    expect(changes.at(-1)).toEqual({ firstLineIndent: 100 });
  });

  it('right-margin handle snaps by position too', () => {
    const { changes, mount } = makeSetup([480]);
    const right = mount.querySelector('.edr-handle-right') as HTMLElement;
    right.dispatchEvent(pointer('pointerdown', 600));
    // position moves to 483 → snap 480 → rightMargin = 600 - 480 = 120
    window.dispatchEvent(pointer('pointermove', 483));
    window.dispatchEvent(pointer('pointerup', 483));
    expect(changes.at(-1)).toEqual({ rightMargin: 120 });
  });

  it('column markers snap to guides', () => {
    const { mount, onColumnChange } = makeSetup([310], { edges: [0, 200, 600] });
    const marker = mount.querySelector('.edr-colmark') as HTMLElement;
    marker.dispatchEvent(pointer('pointerdown', 200));
    window.dispatchEvent(pointer('pointermove', 307)); // raw 307 → snap 310
    window.dispatchEvent(pointer('pointerup', 307));
    expect(onColumnChange).toHaveBeenLastCalledWith(1, 310, 'commit');
  });

  it('guideSnap: 0 disables snapping', () => {
    const { changes, mount } = makeSetup([150], { guideSnap: 0 });
    const left = mount.querySelector('.edr-handle-left') as HTMLElement;
    left.dispatchEvent(pointer('pointerdown', 0));
    window.dispatchEvent(pointer('pointermove', 149));
    window.dispatchEvent(pointer('pointerup', 149));
    expect(changes.at(-1)).toEqual({ leftMargin: 149 });
  });

  it('keyboard adjustments never snap', () => {
    const { changes, mount } = makeSetup([2]);
    const left = mount.querySelector('.edr-handle-left') as HTMLElement;
    left.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(changes.at(-1)).toEqual({ leftMargin: 1 });
  });
});
