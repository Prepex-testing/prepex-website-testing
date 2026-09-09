import { CORE_API_BASE_URL } from "@/lib/api/config";
import { authenticatedRequest } from "@/lib/api/authRequest";
import type { PlannerTask } from "@/lib/api/planner";

function authRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  return authenticatedRequest<T>(`${CORE_API_BASE_URL}/api/productivity${path}`, options);
}

// ---------------------------------------------------------------------------
// Section 9 — Calendar + History + Plan Ahead
// ---------------------------------------------------------------------------

/** What the calendar cell draws. Mock outranks No-Study when a day is both. */
export type CalendarDayType =
  | "STANDARD"
  | "MOCK_DAY"
  | "NO_STUDY"
  | "RECOVERY"
  | "BAD_DAY"
  | "WIN_JOURNAL"
  | "CUSTOM";

export type CalendarCompletionStatus =
  | "FUTURE"
  | "NO_STUDY"
  | "NO_PLAN"
  | "COMPLETE"
  | "PARTIAL"
  | "MISSED";

export type CalendarMock = {
  id: string;
  name: string | null;
  totalScore: number;
  maxScore: number;
  /** False for a mock that's scheduled but not attempted yet — no marks to show. */
  hasResult: boolean;
};

export type CalendarDay = {
  /** YYYY-MM-DD */
  date: string;
  /** 0 = Sunday */
  dayOfWeek: number;
  isToday: boolean;
  isFuture: boolean;
  primaryType: CalendarDayType;
  completionStatus: CalendarCompletionStatus;
  mood: string | null;
  streakCount: number | null;
  isNoStudy: boolean;
  hasMock: boolean;
  anchorCount: number;
  hasWinJournal: boolean;
  mock: CalendarMock | null;
};

export type CalendarMonth = {
  year: number;
  month: number;
  days: CalendarDay[];
  summary: {
    currentStreak: number;
    completionRate: number;
    mockCount: number;
    winJournalCount: number;
    noStudyUsed: number;
    noStudyLimit: number;
  };
};

/** `month` is 1-based, matching the API and how people say it. */
export function getMonthCalendar(year: number, month: number) {
  return authRequest<{ success: true; data: CalendarMonth }>(`/calendar/${year}/${month}`);
}

// ---------------------------------------------------------------------------
// Day view — history for past days, planning context for future ones
// ---------------------------------------------------------------------------

export type AnchorTask = {
  id: string;
  targetDate: string;
  title: string | null;
  taskType: string;
  durationMinutes: number | null;
  preferredWindow: string | null;
  notes: string | null;
  chapterId: string | null;
  subjectId: number | null;
  chapter?: { id: string; name: string } | null;
  subject?: { id: number; name: string } | null;
};

export type CalendarEntry = {
  id: string;
  targetDate: string;
  title: string | null;
  notes: string | null;
  mockAnalysisId: string | null;
};

export type EnergyTrendPoint = {
  date: string;
  mood: string | null;
  isSelected: boolean;
};

export type DayFocusBySubject = {
  subject: string;
  seconds: number;
  plannedMinutes: number;
};

export type DaySummary = {
  tasksDone: number;
  tasksTotal: number;
  completionRate: number;
  focusSeconds: number;
  plannedMinutes: number;
  focusBySubject: DayFocusBySubject[];
  /**
   * PENDING is today, still open: the day-boundary job has not judged it yet
   * and none of the three criteria are met so far. NONE means there is nothing
   * to say about the day at all.
   */
  streakStatus: "PROTECTED" | "MAINTAINED" | "BROKEN" | "PENDING" | "NONE";
  mode: string | null;
  isRecoveryWeek: boolean;
  isBadDayPlan: boolean;
};

export type DayCheckin = {
  mood: string;
  streakCount: number;
  missingDays: number;
  isSkipped: boolean;
  burnoutTier: number;
  isInRecoveryMode: boolean;
};

export type ScheduledMock = {
  id: string;
  mockName: string | null;
  sourceInstitute: string | null;
  testDurationMinutes: number | null;
  analysisStatus: "PENDING" | "COMPLETED";
};

export type AnchorLoad = {
  anchorMinutes: number;
  dailyTargetMinutes: number | null;
  exceedsTarget: boolean;
};

export type DayView = {
  date: string;
  isFuture: boolean;
  isToday: boolean;
  noStudyDay: CalendarEntry | null;
  mockDay: CalendarEntry | null;
  anchorTasks: AnchorTask[];
  energyTrend: EnergyTrendPoint[];
  // Past / today
  summary: DaySummary | null;
  /**
   * The day's evaluated streak. Lives here rather than only on `checkin`
   * because a day can be earned with no check-in at all; null means the
   * day-boundary job hasn't judged this day yet.
   */
  streakCount: number | null;
  checkin: DayCheckin | null;
  plan: { id: string; plannerMode: string | null; aiSummary: string | null; tasks: PlannerTask[] } | null;
  // Future only
  planWillGenerate?: boolean;
  streakProtected?: boolean;
  scheduledMock?: ScheduledMock | null;
  noStudyUsage?: { used: number; limit: number; exceeded: boolean };
  anchorLoad?: AnchorLoad;
};

export function getDayView(date: string) {
  return authRequest<{ success: true; data: DayView }>(`/calendar/day/${date}`);
}

// ---------------------------------------------------------------------------
// No-Study Days (PRD 9.3)
// ---------------------------------------------------------------------------

export function markNoStudyDay(date: string, notes?: string) {
  return authRequest<{
    success: true;
    data: { entry: CalendarEntry; warning: string | null };
  }>("/calendar/no-study", {
    method: "POST",
    body: JSON.stringify({ date, notes }),
  });
}

export function unmarkNoStudyDay(date: string) {
  return authRequest<{ success: true; data: { message: string } }>(`/calendar/no-study/${date}`, {
    method: "DELETE",
  });
}

// ---------------------------------------------------------------------------
// Anchor tasks (Custom Day Plan, PRD 9.5)
// ---------------------------------------------------------------------------

export type AddAnchorInput = {
  date: string;
  title: string;
  taskType: "NEW_LEARNING" | "REVISION" | "PRACTICE" | "DPP" | "MOCK_REVIEW" | "WELLNESS" | "CUSTOM";
  /** Backend floor is 10 minutes for an anchor (PRD 9.6). */
  durationMinutes: number;
  subjectId?: number;
  chapterId?: string;
  preferredWindow?: "MORNING" | "MIDDAY" | "EVENING" | "NIGHT";
  notes?: string;
};

export function addAnchorTask(input: AddAnchorInput) {
  return authRequest<{
    success: true;
    data: { task: AnchorTask; anchorLoad: AnchorLoad; warning: string | null };
  }>("/calendar/anchor", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function removeAnchorTask(anchorId: string) {
  return authRequest<{ success: true; data: { message: string } }>(`/calendar/anchor/${anchorId}`, {
    method: "DELETE",
  });
}

// ---------------------------------------------------------------------------
// Date helpers — the API speaks YYYY-MM-DD in UTC, so building and reading
// those keys has to avoid the local-timezone round trip that would shift a
// date by a day either side of midnight.
// ---------------------------------------------------------------------------

export function toDateKey(year: number, month1: number, day: number): string {
  return `${year}-${String(month1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function todayDateKey(): string {
  const now = new Date();
  return toDateKey(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function monthLabel(year: number, month1: number): string {
  return `${MONTH_NAMES[month1 - 1]} ${year}`;
}

/** "Wednesday, May 14, 2026" — parsed as UTC so the label matches the key. */
export function formatDayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return dateKey;
  const date = new Date(Date.UTC(y, m - 1, d));
  return `${WEEKDAY_NAMES[date.getUTCDay()]}, ${MONTH_NAMES[m - 1]} ${d}, ${y}`;
}

/** "May 23, 2026 (Fri)" */
export function formatShortDayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return dateKey;
  const date = new Date(Date.UTC(y, m - 1, d));
  return `${MONTH_NAMES[m - 1]} ${d}, ${y} (${WEEKDAY_NAMES[date.getUTCDay()].slice(0, 3)})`;
}

export function shiftDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return dateKey;
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return toDateKey(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}
