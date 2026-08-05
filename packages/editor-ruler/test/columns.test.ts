import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRuler } from '../src/ruler';
import { createGuides } from '../src/guides';

function pointer(type: string, clientX: number, clientY = 0): MouseEvent {
  return new MouseEvent(type, { clientX, clientY, bubbles: true, cancelable: true });
}

function makeSetup(edges: number[] | null) {
  const mount = document.createElement('div');
  document.body.appendChild(mount);
  const onColumnChange = vi.fn();
  let current = edges;
  const ruler = createRuler(mount, {
    getMetrics: () => ({ contentWidth: 600, leftMargin: 0, rightMargin: 0, firstLineIndent: 0 }),
    onChange: () => {},
    columns: {
      get: () => current,
      onChange: onColumnChange,
    },
  });
  return {
    mount,
    ruler,
    onColumnChange,
    setEdges(next: number[] | null) {
      current = next;
    },
  };
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('column markers', () => {
  it('renders one marker per inner boundary, none outside tables', () => {
    const { mount, ruler, setEdges } = makeSetup([0, 200, 400, 600]);
    const markers = mount.querySelectorAll('.edr-colmark');
    expect(markers.length).toBe(2);
    expect((markers[0] as HTMLElement).style.left).toBe('200px');
    expect((markers[1] as HTMLElement).style.left).toBe('400px');
    expect(markers[0]!.getAttribute('role')).toBe('slider');

    setEdges(null);
    ruler.refresh();
    expect(mount.querySelectorAll('.edr-colmark').length).toBe(0);
  });

  it('dragging a marker reports drag then commit with clamping', () => {
    const { mount, onColumnChange } = makeSetup([0, 200, 400, 600]);
    const marker = mount.querySelectorAll('.edr-colmark')[0] as HTMLElement;
    marker.dispatchEvent(pointer('pointerdown', 200));
    window.dispatchEvent(pointer('pointermove', 240));
    window.dispatchEvent(pointer('pointerup', 240));
    expect(onColumnChange).toHaveBeenCalledWith(1, 240, 'drag');
    expect(onColumnChange).toHaveBeenLastCalledWith(1, 240, 'commit');

    // clamp: cannot cross the neighbour minus min gap (24)
    marker.dispatchEvent(pointer('pointerdown', 240));
    window.dispatchEvent(pointer('pointermove', 5000));
    window.dispatchEvent(pointer('pointerup', 5000));
    expect(onColumnChange).toHaveBeenLastCalledWith(1, 376, 'commit'); // 400 - 24
  });

  it('supports keyboard adjustment', () => {
    const { mount, onColumnChange } = makeSetup([0, 200, 400, 600]);
    const marker = mount.querySelectorAll('.edr-colmark')[1] as HTMLElement;
    marker.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', shiftKey: true, bubbles: true }));
    expect(onColumnChange).toHaveBeenLastCalledWith(2, 390, 'commit');
  });

  it('does not start guide creation from a marker press', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const mount = document.createElement('div');
    document.body.appendChild(mount);
    // build a ruler that has both guides and columns
    const guides = createGuides(container);
    createRuler(mount, {
      getMetrics: () => ({ contentWidth: 600, leftMargin: 0, rightMargin: 0, firstLineIndent: 0 }),
      onChange: () => {},
      guides,
      columns: { get: () => [0, 300, 600], onChange: () => {} },
    });
    const marker = mount.querySelector('.edr-colmark') as HTMLElement;
    marker.dispatchEvent(pointer('pointerdown', 300, 0));
    window.dispatchEvent(pointer('pointerup', 300, 60));
    expect(guides.list()).toEqual({ x: [], y: [] });
  });
});
