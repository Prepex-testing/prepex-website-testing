/** Mirror of the core-service Rank GPS payload (services/core-service/src/modules/rankGps). Keep the two in step. */

export type Track = "jee" | "neet" | "other";
export type ChapterStatus = "not_started" | "in_progress" | "completed" | "mastered";
export type ReasonKey = "concept_gap" | "silly_calculation" | "misread" | "formula_forgot" | "didnt_know_how_to_start" | "time_pressure" | "guessed" | "unknown";
export type TaskKind = "lecture" | "practice" | "revision" | "backlog" | "mock";
export type ComponentKey = "coverage" | "retention" | "accuracy" | "mocks" | "consistency";

export interface ProjectionRange {
  marks: { low: number; centre: number; high: number };
  percentile: { low: number; high: number };
  rank: { best: number; worst: number };
}

export interface ChapterMini { n: string; c: number; k: number; s: ChapterStatus; a: number | null }
export interface WeekInput { weekStart: string; hours: Record<TaskKind, number>; accuracy: number | null; questions: number }

// ---------------------------------------------------------------------------
// What the engine produces (stored as the snapshot payload; the website mirrors these types)
// ---------------------------------------------------------------------------

export interface GateState {
  unlocked: boolean
  daysSinceSignup: number
  activeDays: number
  needDays: number
  needActiveDays: number
}

export interface ComponentScore {
  key: ComponentKey
  weight: number
  /** 0..100 */
  value: number
  points: number
  hasData: boolean
}

export interface Readiness {
  score: number
  components: ComponentScore[]
}

export interface ProjectionData extends ProjectionRange {
  mocksUsed: number
  trendMarks: number
  spreadMarks: number
}

export interface ProjectionState {
  status: 'ready' | 'needs_mocks' | 'not_available'
  mocksHave: number
  mocksNeed: number
  data: ProjectionData | null
}

export interface TargetGap {
  targetPercentile: number
  requiredMarks: { low: number; centre: number; high: number }
  /** Required centre minus projected centre; negative = already ahead. Null without a projection. */
  gapMarks: number | null
  subjects: { subject: 'physics' | 'chemistry' | 'maths'; gapMarks: number; averageMarks: number | null; requiredMarks: number }[]
}

export interface Move {
  id: string
  chapterId: string
  subjectId: number
  name: string
  action: string
  hours: number
  marksGain: number
  /** What "Add to this week" creates, through the weekly goals service. */
  goal: { type: 'QUESTIONS' | 'HOURS'; target: number; unit: 'COUNT' | 'MINUTES' }
}

export interface OpportunityChapter {
  chapterId: string
  subjectId: number
  subjectName: string
  name: string
  availableMarks: number
  captureNow: number
  captureTarget: number
  potential: number
  hours: number
  roi: number
  status: ChapterStatus
  accuracy: number | null
  freshness: number | null
  mistakesOpen: number
  action: string
}

export interface Opportunity {
  moves: Move[]
  chapters: OpportunityChapter[]
  targetCapture: number
}

export interface AutopsyReason {
  reason: ReasonKey
  marks: number
  count: number
  topChapter: string | null
}

export interface MockAutopsy {
  mockId: string
  name: string
  date: string
  total: number
  max: number
  lost: number
  attemptedWrong: number
  blank: number
  reasons: AutopsyReason[]
  /** Percentile range if the biggest reason were fixed (60 to 100% of its marks recovered); null without a percentile table. */
  fixBiggest: { reason: ReasonKey; marks: number; percentileNow: number; percentileLow: number; percentileHigh: number } | null
}

export interface Autopsy {
  latest: MockAutopsy | null
  /** Every autopsy, newest first (premium beyond the latest). */
  all: MockAutopsy[]
  missing: boolean
}

export interface EffortInsight {
  key: string
  text: string
}

export interface Effort {
  primary: EffortInsight
  secondary: EffortInsight | null
  weeks: WeekInput[]
  split: Record<TaskKind, number>
  totalHours28: number
  practiceShare: number
}

export interface ChangeDriver {
  chapterId: string
  name: string
  points: number
  why: string
}

export interface WeeklyChange {
  delta: number
  components: { key: ComponentKey; delta: number }[]
  positives: ChangeDriver[]
  negatives: ChangeDriver[]
}

export interface WhatIf {
  k: number
  baseCentre: number
  subjects: { subjectId: number; name: string; modelMarks: number; accuracy: number; coverage: number }[]
}

export interface RankGpsReport {
  version: 1
  generatedAt: string
  track: Track
  paperMax: number
  gate: GateState
  readiness: Readiness
  projection: ProjectionState
  target: TargetGap | null
  opportunity: Opportunity
  autopsy: Autopsy
  effort: Effort
  change: WeeklyChange | null
  whatIf: WhatIf | null
  /** Compact per-chapter state, so the next snapshot can explain what moved. */
  chapterMini: Record<string, ChapterMini>
}
