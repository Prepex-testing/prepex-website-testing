/**
 * A copy of the core-service JEE Main marks <-> percentile <-> rank table (rankGps.percentile.ts), used only by the
 * What-If simulator so a slider can answer without a request. Keep the two in step; both are updated yearly.
 */
export interface PercentileAnchor {
  marks: number;
  percentile: number;
  rank: number;
}

export const PERCENTILE_ANCHORS: readonly PercentileAnchor[] = [
  { marks: 0, percentile: 0.84, rank: 1482000 },
  { marks: 10, percentile: 9.7, rank: 1134000 },
  { marks: 20, percentile: 33.23, rank: 912000 },
  { marks: 30, percentile: 56.57, rank: 882000 },
  { marks: 40, percentile: 71.3, rank: 264400 },
  { marks: 50, percentile: 80.98, rank: 166000 },
  { marks: 60, percentile: 86.91, rank: 117000 },
  { marks: 70, percentile: 90.7, rank: 83000 },
  { marks: 80, percentile: 93.15, rank: 61000 },
  { marks: 90, percentile: 94.75, rank: 46500 },
  { marks: 100, percentile: 96.06, rank: 35000 },
  { marks: 110, percentile: 96.98, rank: 26500 },
  { marks: 120, percentile: 97.69, rank: 20500 },
  { marks: 130, percentile: 98.25, rank: 15700 },
  { marks: 140, percentile: 98.67, rank: 11800 },
  { marks: 150, percentile: 98.99, rank: 9000 },
  { marks: 160, percentile: 99.24, rank: 6800 },
  { marks: 170, percentile: 99.43, rank: 5100 },
  { marks: 180, percentile: 99.57, rank: 3800 },
  { marks: 190, percentile: 99.69, rank: 2700 },
  { marks: 200, percentile: 99.78, rank: 1900 },
  { marks: 210, percentile: 99.85, rank: 1375 },
  { marks: 220, percentile: 99.89, rank: 920 },
  { marks: 230, percentile: 99.93, rank: 610 },
  { marks: 240, percentile: 99.96, rank: 375 },
  { marks: 250, percentile: 99.975, rank: 215 },
  { marks: 262, percentile: 99.989, rank: 85 },
  { marks: 270, percentile: 99.994, rank: 55 },
  { marks: 280, percentile: 99.997, rank: 24 },
  { marks: 300, percentile: 100, rank: 1 },
]

export const JEE_MAIN_MAX = 300
const last = PERCENTILE_ANCHORS.length - 1

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

/** The anchor pair around `value` on one axis, plus how far between them it sits (0..1). */
function between(axis: 'marks' | 'percentile', value: number): { lo: PercentileAnchor; hi: PercentileAnchor; t: number } {
  const first = PERCENTILE_ANCHORS[0]!
  const end = PERCENTILE_ANCHORS[last]!
  if (value <= first[axis]) return { lo: first, hi: PERCENTILE_ANCHORS[1]!, t: 0 }
  if (value >= end[axis]) return { lo: PERCENTILE_ANCHORS[last - 1]!, hi: end, t: 1 }
  for (let i = 0; i < last; i += 1) {
    const lo = PERCENTILE_ANCHORS[i]!
    const hi = PERCENTILE_ANCHORS[i + 1]!
    if (value >= lo[axis] && value <= hi[axis]) return { lo, hi, t: (value - lo[axis]) / (hi[axis] - lo[axis]) }
  }
  return { lo: PERCENTILE_ANCHORS[last - 1]!, hi: end, t: 1 }
}

const clampMarks = (marks: number): number => Math.min(JEE_MAIN_MAX, Math.max(0, marks))

export function marksToPercentile(marks: number): number {
  const { lo, hi, t } = between('marks', clampMarks(marks))
  return lerp(lo.percentile, hi.percentile, t)
}

export function marksToRank(marks: number): number {
  const { lo, hi, t } = between('marks', clampMarks(marks))
  return Math.max(1, Math.round(lerp(lo.rank, hi.rank, t)))
}
