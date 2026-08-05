import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRuler, type RulerChange, type RulerChangePhase, type RulerMetrics } from '../src/ruler';

function makeHarness(initial?: Partial<RulerMetrics>) {
  const metrics: RulerMetrics = {
    contentWidth: 600,
    leftMargin: 50,
    rightMargin: 60,
    firstLineIndent: 20,
    ...initial,
  };
  const changes: Array<{ change: RulerChange; phase: RulerChangePhase }> = [];
  const mount = document.createElement('div');
  document.body.appendChild(mount);
  const ruler = createRuler(mount, {
    getMetrics: () => ({ ...metrics }),
    onChange: (change, phase) => {
      changes.push({ change, phase });
      // Emulate a host editor that applies changes synchronously.
      Object.assign(metrics, change);
    },
  });
  return { metrics, changes, mount, ruler };
}

function pointer(type: string, clientX: number): MouseEvent {
  return new MouseEvent(type, { clientX, bubbles: true, cancelable: true });
}

beforeEach(() => {
  document.body.innerHTML = '';
  document.head.querySelectorAll('style[data-edr-styles]').forEach((s) => s.remove());
});

describe('createRuler', () => {
  it('mounts ruler DOM with scale and three accessible handles', () => {
    const { mount } = makeHarness();
    const root = mount.querySelector('.edr-ruler') as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.style.width).toBe('600px');
    expect(root.querySelector('svg.edr-scale')).toBeTruthy();
    const handles = root.querySelectorAll('.edr-handle');
    expect(handles.length).toBe(3);
    handles.forEach((h) => {
      expect(h.getAttribute('role')).toBe('slider');
      expect(h.getAttribute('aria-label')).toBeTruthy();
    });
    expect(document.head.querySelector('style[data-edr-styles]')).toBeTruthy();
  });

  it('positions handles from metrics', () => {
    const { mount } = makeHarness();
    const left = mount.querySelector('.edr-handle-left') as HTMLElement;
    const right = mount.querySelector('.edr-handle-right') as HTMLElement;
    const indent = mount.querySelector('.edr-handle-indent') as HTMLElement;
    expect(left.style.left).toBe('50px');
    expect(right.style.left).toBe('540px'); // 600 - 60
    expect(indent.style.left).toBe('70px'); // 50 + 20
  });

  it('refresh re-reads metrics and repositions handles', () => {
    const { metrics, mount, ruler } = makeHarness();
    metrics.leftMargin = 100;
    metrics.firstLineIndent = -30;
    ruler.refresh();
    expect((mount.querySelector('.edr-handle-left') as HTMLElement).style.left).toBe('100px');
    expect((mount.querySelector('.edr-handle-indent') as HTMLElement).style.left).toBe('70px');
  });

  it('drags the left-margin handle: drag phases then a commit on release', () => {
    const { changes, mount } = makeHarness();
    const left = mount.querySelector('.edr-handle-left') as HTMLElement;
    left.dispatchEvent(pointer('pointerdown', 100));
    window.dispatchEvent(pointer('pointermove', 130));
    window.dispatchEvent(pointer('pointerup', 130));
    const dragEvents = changes.filter((c) => c.phase === 'drag');
    const commits = changes.filter((c) => c.phase === 'commit');
    expect(dragEvents.at(-1)?.change).toEqual({ leftMargin: 80 });
    expect(commits).toHaveLength(1);
    expect(commits[0]!.change).toEqual({ leftMargin: 80 });
  });

  it('drags the right-margin handle with inverted direction', () => {
    const { changes, mount } = makeHarness();
    const right = mount.querySelector('.edr-handle-right') as HTMLElement;
    right.dispatchEvent(pointer('pointerdown', 500));
    // Moving the pointer right must shrink the right margin.
    window.dispatchEvent(pointer('pointermove', 520));
    window.dispatchEvent(pointer('pointerup', 520));
    expect(changes.at(-1)?.change).toEqual({ rightMargin: 40 });
  });

  it('clamps drags so the writable column never collapses', () => {
    const { changes, mount } = makeHarness();
    const left = mount.querySelector('.edr-handle-left') as HTMLElement;
    left.dispatchEvent(pointer('pointerdown', 0));
    window.dispatchEvent(pointer('pointermove', 10_000));
    window.dispatchEvent(pointer('pointerup', 10_000));
    // max = 600 - 60(right) - 48(min column) - 20(indent) = 472
    expect(changes.at(-1)?.change).toEqual({ leftMargin: 472 });
  });

  it('supports keyboard adjustment with clamping', () => {
    const { changes, mount } = makeHarness();
    const indent = mount.querySelector('.edr-handle-indent') as HTMLElement;
    indent.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(changes.at(-1)).toEqual({ change: { firstLineIndent: 21 }, phase: 'commit' });
    indent.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', shiftKey: true, bubbles: true }));
    expect(changes.at(-1)).toEqual({ change: { firstLineIndent: 11 }, phase: 'commit' });
    indent.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    // min = -leftMargin = -50 (hanging indent limit)
    expect(changes.at(-1)).toEqual({ change: { firstLineIndent: -50 }, phase: 'commit' });
  });

  it('keyboard on the right-margin handle follows visual direction', () => {
    const { changes, mount } = makeHarness();
    const right = mount.querySelector('.edr-handle-right') as HTMLElement;
    right.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(changes.at(-1)?.change).toEqual({ rightMargin: 59 });
    right.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(changes.at(-1)?.change).toEqual({ rightMargin: 60 });
  });

  it('renders tick labels in the scale', () => {
    const { mount, ruler } = makeHarness({ contentWidth: 200 });
    ruler.setUnit('px');
    const labels = Array.from(mount.querySelectorAll('.edr-scale text')).map((t) => t.textContent);
    expect(labels).toContain('100');
    expect(labels).toContain('200');
  });

  it('setUnit redraws the scale', () => {
    const { mount, ruler } = makeHarness({ contentWidth: 192 });
    ruler.setUnit('in');
    expect(ruler.getUnit()).toBe('in');
    const labels = Array.from(mount.querySelectorAll('.edr-scale text')).map((t) => t.textContent);
    expect(labels).toEqual(['1', '2']); // '0' label is skipped at x=0
  });

  it('destroy removes DOM and stops listening', () => {
    const { changes, mount, ruler } = makeHarness();
    const left = mount.querySelector('.edr-handle-left') as HTMLElement;
    ruler.destroy();
    expect(mount.querySelector('.edr-ruler')).toBeNull();
    left.dispatchEvent(pointer('pointerdown', 100));
    window.dispatchEvent(pointer('pointermove', 130));
    window.dispatchEvent(pointer('pointerup', 130));
    expect(changes).toHaveLength(0);
  });
});
