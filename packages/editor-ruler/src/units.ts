export type RulerUnit = 'cm' | 'in' | 'px';

/** CSS reference pixel density. */
export const PX_PER_INCH = 96;
export const PX_PER_CM = PX_PER_INCH / 2.54;

export function pxPerUnit(unit: RulerUnit): number {
  switch (unit) {
    case 'cm':
      return PX_PER_CM;
    case 'in':
      return PX_PER_INCH;
    case 'px':
      return 1;
  }
}

export interface Tick {
  /** Distance from the left edge of the ruler, in px. */
  x: number;
  kind: 'minor' | 'mid' | 'major';
  /** Unit label, present on major ticks only. */
  label?: string;
}

/** Tick intervals expressed in the ruler's own unit. */
interface TickSpec {
  minor: number;
  mid: number;
  major: number;
}

const TICK_SPECS: Record<RulerUnit, TickSpec> = {
  cm: { minor: 0.25, mid: 0.5, major: 1 },
  in: { minor: 0.125, mid: 0.5, major: 1 },
  px: { minor: 10, mid: 50, major: 100 },
};

const EPSILON = 1e-6;

export function computeTicks(widthPx: number, unit: RulerUnit): Tick[] {
  const ticks: Tick[] = [];
  if (!(widthPx > 0)) return ticks;
  const scale = pxPerUnit(unit);
  const spec = TICK_SPECS[unit];
  for (let i = 0; ; i++) {
    const value = i * spec.minor;
    const x = value * scale;
    if (x > widthPx + EPSILON) break;
    const isMajor = isMultipleOf(value, spec.major);
    const isMid = !isMajor && isMultipleOf(value, spec.mid);
    const tick: Tick = { x, kind: isMajor ? 'major' : isMid ? 'mid' : 'minor' };
    if (isMajor) tick.label = formatTickLabel(value);
    ticks.push(tick);
  }
  return ticks;
}

function isMultipleOf(value: number, base: number): boolean {
  const ratio = value / base;
  return Math.abs(ratio - Math.round(ratio)) < EPSILON;
}

function formatTickLabel(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
