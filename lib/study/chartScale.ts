/**
 * A tidy minutes scale for the study chart: whole-number ticks that land on 10/15/30/60-minute steps,
 * so one short session never produces fractional or repeated labels ("0m 0m 0m").
 */

export interface MinutesScale {
  /** Top of the axis, a multiple of `step`. */
  max: number;
  step: number;
  /** 0, step, 2*step … max */
  ticks: number[];
}

function stepFor(maxMinutes: number): number {
  if (maxMinutes <= 30) return 10;
  if (maxMinutes <= 60) return 15;
  if (maxMinutes <= 150) return 30;
  if (maxMinutes <= 300) return 60;
  return 120;
}

/** `maxMinutes` = the tallest bar (a day's total). */
export function minutesScale(maxMinutes: number): MinutesScale {
  const m = Number.isFinite(maxMinutes) && maxMinutes > 0 ? maxMinutes : 0;
  const step = stepFor(m);
  const max = Math.max(step * 3, Math.ceil(m / step) * step);
  const ticks: number[] = [];
  for (let t = 0; t <= max; t += step) ticks.push(t);
  return { max, step, ticks };
}

/** `0m`, `30m`, `1h`, `1h 30m`-style labels would not fit the axis, so: whole hours as `2h`, else minutes. */
export function axisLabel(minutes: number): string {
  return minutes > 0 && minutes % 60 === 0 ? `${minutes / 60}h` : `${minutes}m`;
}
