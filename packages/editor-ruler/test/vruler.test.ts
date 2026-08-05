import { beforeEach, describe, expect, it } from 'vitest';
import { createVRuler } from '../src/vruler';
import { PX_PER_CM } from '../src/units';

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('createVRuler', () => {
  it('renders a vertical scale sized to contentHeight', () => {
    const mount = document.createElement('div');
    document.body.appendChild(mount);
    const vr = createVRuler(mount, { getMetrics: () => ({ contentHeight: 400 }) });
    const root = mount.querySelector('.edr-vruler') as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.style.height).toBe('400px');
    expect(root.querySelector('svg.edr-vscale')).toBeTruthy();
    expect(vr.getUnit()).toBe('cm');
  });

  it('draws cm tick lines and labels along the y axis', () => {
    const mount = document.createElement('div');
    document.body.appendChild(mount);
    createVRuler(mount, { getMetrics: () => ({ contentHeight: PX_PER_CM * 3 + 1 }) });
    const labels = Array.from(mount.querySelectorAll('.edr-vscale text')).map((t) => t.textContent);
    expect(labels).toEqual(['1', '2', '3']);
    const firstMajor = mount.querySelectorAll('.edr-vscale line')[0]!;
    // ticks are horizontal lines: y1 === y2
    expect(firstMajor.getAttribute('y1')).toBe(firstMajor.getAttribute('y2'));
  });

  it('setUnit redraws and refresh tracks height changes', () => {
    const mount = document.createElement('div');
    document.body.appendChild(mount);
    let height = 200;
    const vr = createVRuler(mount, { getMetrics: () => ({ contentHeight: height }) });
    vr.setUnit('px');
    let labels = Array.from(mount.querySelectorAll('.edr-vscale text')).map((t) => t.textContent);
    expect(labels).toContain('100');
    height = 300;
    vr.refresh();
    labels = Array.from(mount.querySelectorAll('.edr-vscale text')).map((t) => t.textContent);
    expect(labels).toContain('300');
    vr.destroy();
    expect(mount.querySelector('.edr-vruler')).toBeNull();
  });
});
