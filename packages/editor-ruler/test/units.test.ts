import { describe, expect, it } from 'vitest';
import { clamp, computeTicks, pxPerUnit, PX_PER_CM, PX_PER_INCH } from '../src/units';

describe('pxPerUnit', () => {
  it('maps units to CSS pixel densities', () => {
    expect(pxPerUnit('px')).toBe(1);
    expect(pxPerUnit('in')).toBe(96);
    expect(pxPerUnit('cm')).toBeCloseTo(37.7952755, 5);
    expect(PX_PER_INCH).toBe(96);
    expect(PX_PER_CM).toBeCloseTo(96 / 2.54, 10);
  });
});

describe('computeTicks', () => {
  it('returns no ticks for zero or negative width', () => {
    expect(computeTicks(0, 'cm')).toEqual([]);
    expect(computeTicks(-10, 'px')).toEqual([]);
  });

  it('generates cm ticks with majors every 1cm labelled', () => {
    const ticks = computeTicks(PX_PER_CM * 3 + 1, 'cm');
    const majors = ticks.filter((t) => t.kind === 'major');
    expect(majors.map((t) => t.label)).toEqual(['0', '1', '2', '3']);
    expect(majors[1]!.x).toBeCloseTo(PX_PER_CM, 5);
    // minor at 0.25cm, mid at 0.5cm
    expect(ticks[1]!.kind).toBe('minor');
    expect(ticks[2]!.kind).toBe('mid');
    expect(ticks[1]!.label).toBeUndefined();
  });

  it('generates inch ticks with 1/8 minors and 1/2 mids', () => {
    const ticks = computeTicks(PX_PER_INCH * 2, 'in');
    const majors = ticks.filter((t) => t.kind === 'major');
    expect(majors.map((t) => t.label)).toEqual(['0', '1', '2']);
    const mids = ticks.filter((t) => t.kind === 'mid');
    expect(mids[0]!.x).toBeCloseTo(48, 5);
    expect(ticks.filter((t) => t.kind === 'minor').length).toBeGreaterThan(0);
  });

  it('generates px ticks with majors every 100px', () => {
    const ticks = computeTicks(250, 'px');
    const majors = ticks.filter((t) => t.kind === 'major');
    expect(majors.map((t) => t.x)).toEqual([0, 100, 200]);
    expect(majors.map((t) => t.label)).toEqual(['0', '100', '200']);
  });

  it('never emits a tick beyond the ruler width', () => {
    for (const unit of ['cm', 'in', 'px'] as const) {
      const width = 333;
      for (const tick of computeTicks(width, unit)) {
        expect(tick.x).toBeLessThanOrEqual(width + 1e-6);
      }
    }
  });
});

describe('clamp', () => {
  it('clamps into the inclusive range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });
});
