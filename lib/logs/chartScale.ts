/**
 * Explicit axis scales for the Phase 3 charts. Letting Recharts pick ticks gave fractional and repeated labels
 * for small values (the "0m 0m 0m" bug), so every chart passes `domain` + `ticks` computed here.
 */

export interface Scale {
  max: number;
  step: number;
  ticks: number[];
}

function build(step: number, max: number): Scale {
  const ticks: number[] = [];
  // multiply out to dodge 0.1 + 0.2 style drift on the fractional steps
  const n = Math.round(max / step);
  for (let i = 0; i <= n; i++) ticks.push(Math.round(i * step * 100) / 100);
  return { max: ticks[ticks.length - 1]!, step, ticks };
}

/** 0, 25, 50, 75, 100 — accuracy percentages. */
export const PERCENT_SCALE: Scale = build(25, 100);

const COUNT_STEPS = [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000];

/** Whole-number counts (items per week, questions per day): never fractional, at least three steps, at most five. */
export function countScale(maxValue: number): Scale {
  const m = Number.isFinite(maxValue) && maxValue > 0 ? Math.ceil(maxValue) : 0;
  const step = COUNT_STEPS.find((s) => Math.ceil(m / s) <= 5) ?? COUNT_STEPS[COUNT_STEPS.length - 1]!;
  const top = Math.max(step * 3, Math.ceil(m / step) * step);
  return build(step, top);
}

/** Questions per minute: tenths for slow solving, whole numbers once it is quick. */
export function rateScale(maxValue: number): Scale {
  const m = Number.isFinite(maxValue) && maxValue > 0 ? maxValue : 0;
  const step = m <= 1.5 ? 0.5 : m <= 3 ? 1 : m <= 8 ? 2 : 5;
  const top = Math.max(step * 3, Math.ceil(m / step) * step);
  return build(step, top);
}

export function axisNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
