import { CORE_API_BASE_URL } from "@/lib/api/config";
import { authenticatedRequest } from "@/lib/api/authRequest";

function authRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  return authenticatedRequest<T>(`${CORE_API_BASE_URL}/api/productivity${path}`, options);
}

// ---------------------------------------------------------------------------
// Section 8 — Productivity Dashboard.
//
// These types mirror the core-service response exactly. Every section carries
// its own `hasData` / `emptyMessage`, because the dashboard's north star is
// that it never invents a number to fill a card — a section with nothing
// behind it says so rather than rendering a plausible-looking zero.
// ---------------------------------------------------------------------------

export type Trend = "UP" | "DOWN" | "FLAT";

// -- Effort -----------------------------------------------------------------

export type EffortDay = {
  date: string;
  dayLabel: string;
  hours: number;
  minutes: number;
  tasksDone: number;
  tasksTotal: number;
  isRecovery: boolean;
  isToday: boolean;
  isFuture: boolean;
  mood: string | null;
};

export type ConsistencyDay = {
  date: string;
  dayLabel: string;
  hours: number;
  /** 0 = none, 1 = under 2h, 2 = 2–4h, 3 = over 4h. */
  bucket: 0 | 1 | 2 | 3;
  isToday: boolean;
  isFuture: boolean;
};

export type HeatmapSlot = {
  label: string;
  startHour: number;
  minutes: number;
  percentOfPeak: number;
  isPeak: boolean;
};

export type EffortTab = {
  isNewUser: boolean;
  explainer: string | null;
  isRecoveryWeek: boolean;
  recoveryNote: string | null;

  streakDays: number;
  longestStreak: number;
  focusHoursThisWeek: number;
  weeklyTargetHours: number;
  daysActive: number;
  totalDaysInWeek: number;
  effortScore: number;
  scoreComponents: {
    streak: number;
    completion: number;
    tasks: number;
    focusMinutes: number;
    practiceAccuracy: number;
  };

  dailyBreakdown: EffortDay[];
  maxHours: number;

  completion: {
    tasksDone: number;
    tasksTotal: number;
    completionRate: number;
    plansHonored: number;
    plannedDays: number;
    recoveryDays: number;
  };

  sessionLengths: {
    buckets: { label: string; count: number; percent: number }[];
    totalSessions: number;
    hasData: boolean;
  };
  timeOfDayHeatmap: {
    periods: { category: string; slots: HeatmapSlot[] }[];
    hasData: boolean;
  };
  consistency: {
    weeks: { weekStart: string; rangeLabel: string; days: ConsistencyDay[] }[];
    weeksTracked: number;
  };
  subjectSplit: {
    subjects: { subjectId: number; subjectName: string; hours: number; percent: number }[];
    hasData: boolean;
  };
  weekendVsWeekday: {
    weekdayAvgHours: number;
    weekendAvgHours: number;
    windowDays: number;
    hasData: boolean;
  };
  insights: string[];
};

// -- Accuracy ---------------------------------------------------------------

export type SubjectAccuracy = {
  subjectId: number;
  subjectName: string;
  attempted: number;
  correct: number;
  accuracy: number;
  lastWeekAccuracy: number | null;
  change: number | null;
  trend: Trend | null;
};

export type MockPoint = {
  id: string;
  name: string | null;
  date: string | null;
  score: number;
  maxScore: number;
  percent: number;
};

export type ChapterAccuracyRow = {
  rank: number;
  chapterId: string;
  chapterName: string;
  subjectName: string | null;
  attempted: number;
  accuracy: number;
};

export type AccuracyTab = {
  isNewUser: boolean;
  explainer: string | null;
  windowDays: number;

  practice: {
    questionsAttempted: number;
    questionsCorrect: number;
    accuracy: number;
    avgTimeMinutes: number;
    hasData: boolean;
    emptyMessage: string | null;
  };

  bySubject: { subjects: SubjectAccuracy[]; hasData: boolean };

  mockTrend: {
    mocks: MockPoint[];
    trend: "IMPROVING" | "DECLINING" | "FLAT";
    avgGainPerMock: number | null;
    /** Null until enough mocks exist to project honestly. Never a rank. */
    projection: { projectedScore: number; marginOfError: number; basedOnMocks: number } | null;
    hasData: boolean;
    emptyMessage: string | null;
  };

  mistakePatterns: {
    byTag: {
      tag: string;
      label: string;
      subtitle: string;
      count: number;
      /** Derived from mock-sourced mistakes only; null when none. */
      estimatedMarksLost: number | null;
    }[];
    topFix: string | null;
    topFixChapterId: string | null;
    totalMistakes: number;
    marksAreEstimated: boolean;
    hasData: boolean;
    emptyMessage: string | null;
  };

  byChapter: {
    weakest: ChapterAccuracyRow[];
    strongest: ChapterAccuracyRow[];
    minAttempts: number;
    hasData: boolean;
    emptyMessage: string | null;
  };

  byDifficulty: {
    levels: { difficulty: string; label: string; attempted: number; accuracy: number; avgTimeMinutes: number }[];
    hasData: boolean;
  };

  byTimeOfDay: {
    /** `accuracy` is null when too few attempts to claim a pattern. */
    buckets: { key: string; label: string; attempted: number; accuracy: number | null }[];
    insight: string | null;
    hasData: boolean;
  };

  gentleInquiry: { show: boolean; message: string | null };
};

// -- Progress ---------------------------------------------------------------

export type PaceStatus =
  | "STRONG"
  | "ON_TRACK"
  | "BUILDING"
  | "STEADY_RECOVERY"
  | "ADJUSTING"
  | "PAUSED";

export type WeakTopicRow = {
  rank: number;
  chapterId: string;
  chapterName: string | null;
  subjectName: string | null;
  weaknessScore: number | null;
  weaknessTier: string;
  practiceAccuracy: number | null;
  jeeWeightage: string | null;
  jeeWeightagePercent: number | null;
};

export type ProgressTab = {
  isNewUser: boolean;
  explainer: string | null;

  exam: { name: string | null; targetDate: string | null; daysLeft: number | null };

  pace: {
    status: PaceStatus;
    /** Already compassionate copy — render as-is, never re-word. */
    displayLabel: string;
    coverageActual: number;
    coverageExpected: number | null;
    isPaused: boolean;
    pausedReason: string | null;
  };

  syllabusCoverage: {
    overall: number;
    covered: number;
    total: number;
    isComplete: boolean;
    revisionFocusMessage: string | null;
    bySubject: {
      subjectId: number;
      subjectName: string;
      coveragePercent: number;
      covered: number;
      mastered: number;
      total: number;
    }[];
  };

  focusTopic: {
    chapterId: string;
    chapterName: string | null;
    subjectName: string | null;
    weaknessScore: number | null;
    practiceAccuracy: number | null;
    jeeWeightage: string | null;
    jeeWeightagePercent: number | null;
    rationale: string;
  } | null;

  top5WeakTopics: WeakTopicRow[];

  weightageBreakdown: {
    rows: {
      chapterId: string;
      chapterName: string | null;
      subjectName: string | null;
      jeeWeightage: string | null;
      jeeWeightagePercent: number | null;
      priorityRank: number;
      practiceAccuracy: number | null;
    }[];
    hasData: boolean;
  };

  masteryTimeline: {
    learning: number;
    revision: number;
    mastered: number;
    touched: number;
    total: number;
  };

  strongestTopics: {
    topics: ChapterAccuracyRow[];
    minAttempts: number;
    hasData: boolean;
    emptyMessage: string | null;
  };
};

// -- Fetchers ---------------------------------------------------------------

/** PRD 8.3 — Effort tab. */
export async function getEffortTab(): Promise<EffortTab> {
  const { data } = await authRequest<{ success: true; data: EffortTab }>("/effort");
  return data;
}

/** PRD 8.4 — Accuracy tab. */
export async function getAccuracyTab(): Promise<AccuracyTab> {
  const { data } = await authRequest<{ success: true; data: AccuracyTab }>("/accuracy");
  return data;
}

/** PRD 8.5 — Progress tab. */
export async function getProgressTab(): Promise<ProgressTab> {
  const { data } = await authRequest<{ success: true; data: ProgressTab }>("/progress");
  return data;
}

// -- Display helpers --------------------------------------------------------

/** First letter of a subject, for the square badges. */
export function subjectInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase();
}

/** "Nov 20" from an ISO date, parsed as UTC so it matches the stored day. */
export function formatShortDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/** "+4" / "−3" / "0" — a signed, readable delta. */
export function formatDelta(change: number | null): string | null {
  if (change === null) return null;
  if (change === 0) return "no change";
  return change > 0 ? `+${change} from last wk` : `${change} from last wk`;
}
