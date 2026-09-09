import { CORE_API_BASE_URL } from "@/lib/api/config";
import { authenticatedRequest } from "@/lib/api/authRequest";

function authRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  return authenticatedRequest<T>(`${CORE_API_BASE_URL}/api/productivity${path}`, options);
}

// ---------------------------------------------------------------------------
// Section 10 — Streak System + Logic Leaderboard.
// ---------------------------------------------------------------------------

export type Milestone = { days: number; label: string; message: string };

/** Which of the three criteria carried the day (PRD 10.2.1). */
export type QualifiedBy = "FOCUS" | "TASKS" | "PRACTICE" | null;

export type StreakInfo = {
  currentStreak: number;
  longestStreak: number;
  streakFreezeAvailable: boolean;
  /** YYYY-MM-DD — the Sunday boundary when the next freeze is granted. */
  streakFreezeResetsOn: string;
  noStudyProtectedToday: boolean;

  today: {
    date: string;
    qualifies: boolean;
    qualifiedBy: QualifiedBy;
    focusSeconds: number;
    taskCompletionPct: number;
    answeredQuestions: number;
    meetsFocus: boolean;
    meetsTasks: boolean;
    meetsPractice: boolean;
    /** Server-owned, so the UI never hardcodes a threshold that could drift. */
    thresholds: {
      focusSeconds: number;
      taskCompletionPct: number;
      answeredQuestions: number;
    };
  };

  milestone: Milestone | null;
  nextMilestone: Milestone | null;
  daysToNextMilestone: number | null;
  achievedMilestones: Milestone[];
  isMilestoneDay: boolean;
};

/**
 * A day's verdict. QUALIFIED / NO_STUDY / FREEZE_USED / MISSED are settled
 * outcomes; TODAY is still in progress and UPCOMING hasn't happened. PENDING
 * means a past day the boundary job hasn't evaluated yet.
 */
export type StreakDayStatus =
  | "QUALIFIED"
  | "NO_STUDY"
  | "FREEZE_USED"
  | "MISSED"
  | "TODAY"
  | "UPCOMING"
  | "PENDING";

export type StreakCalendarDay = {
  date: string;
  /** 0 = Sunday */
  dayOfWeek: number;
  status: StreakDayStatus;
  qualifiedBy: QualifiedBy;
  focusSeconds: number;
  isToday: boolean;
};

export type StreakCalendar = {
  year: number;
  month: number;
  days: StreakCalendarDay[];
  summary: { qualified: number; freezeUsed: number; noStudy: number; missed: number };
};

/**
 * PRD 10.5.3 — only display name, aggregate score and streak count cross the
 * wire. The metrics that feed the score never do.
 */
export type LeaderboardEntry = {
  rank: number;
  displayName: string;
  streak: number;
  effortScore: number;
  isFoundingMember: boolean;
  isMe: boolean;
};

export type LeaderboardScope = "global" | "exam";

export type Leaderboard = {
  /** "launch" for the first 30 days post-launch — top 10 Founding Members. */
  mode: "launch" | "standard";
  scope: LeaderboardScope;
  /** Everyone in scope, including those below the visible cap. */
  totalRanked: number;
  /** Rows reachable through pagination — the PRD 10.5.2 top-50 cap. */
  visibleCount: number;
  /** Server-clamped: may differ from what was requested. */
  page: number;
  limit: number;
  totalPages: number;
  /** 1-based inclusive range of this page, for "Showing X-Y of Z". */
  rangeStart: number;
  rangeEnd: number;
  myRank: number | null;
  myScore: number;
  myStreak: number;
  myPercentile: number | null;
  myDisplayName: string | null;
  isFoundingMember: boolean;
  entries: LeaderboardEntry[];
};

/** Page sizes offered by the rows-per-page control. */
export const LEADERBOARD_PAGE_SIZES = [5, 10, 20, 50] as const;

// -- Fetchers ---------------------------------------------------------------

/** PRD 10.2/10.3/10.4 — streak state, today's qualification, milestones. */
export async function getStreakInfo(): Promise<StreakInfo> {
  const { data } = await authRequest<{ success: true; data: StreakInfo }>("/streak");
  return data;
}

/** `month` is 1-based, matching the API and how people say it. */
export async function getStreakCalendar(year: number, month: number): Promise<StreakCalendar> {
  const { data } = await authRequest<{ success: true; data: StreakCalendar }>(
    `/streak/calendar/${year}/${month}`,
  );
  return data;
}

/** PRD 10.5 — logic-based leaderboard, one page at a time. */
export async function getLeaderboard(
  scope: LeaderboardScope,
  page = 1,
  limit = 20,
): Promise<Leaderboard> {
  const query = new URLSearchParams({ scope, page: String(page), limit: String(limit) });
  const { data } = await authRequest<{ success: true; data: Leaderboard }>(
    `/leaderboard?${query.toString()}`,
  );
  return data;
}

/**
 * Page numbers to render, with gaps collapsed to an ellipsis: always the first
 * and last page plus a window around the current one, e.g. 1 2 3 … 9.
 */
export function paginationRange(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 1) return total === 1 ? [1] : [];
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);

  const wanted = new Set<number>([1, total, current, current - 1, current + 1]);
  const pages = [...wanted].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);

  const out: (number | "ellipsis")[] = [];
  let previous = 0;
  for (const n of pages) {
    // A gap of exactly one page shows that page rather than an ellipsis that
    // would take up the same room.
    if (previous > 0 && n - previous === 2) out.push(previous + 1);
    else if (previous > 0 && n - previous > 2) out.push("ellipsis");
    out.push(n);
    previous = n;
  }
  return out;
}

/** The student-chosen name shown on the leaderboard (PRD 10.5.3). */
export async function updateDisplayName(displayName: string): Promise<{ displayName: string }> {
  const { data } = await authRequest<{ success: true; data: { displayName: string } }>(
    "/display-name",
    { method: "PATCH", body: JSON.stringify({ displayName }) },
  );
  return data;
}

// -- Display helpers --------------------------------------------------------

/** "40m" / "1h 20m" — focus time in the shape the streak page reads it. */
export function formatFocus(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

/**
 * Bands the percentile for display. Purely a label on a number the student can
 * already see — it adds no information the leaderboard doesn't show.
 */
export function tierFromPercentile(percentile: number | null): string | null {
  if (percentile === null) return null;
  if (percentile >= 95) return "Diamond";
  if (percentile >= 85) return "Platinum";
  if (percentile >= 70) return "Gold";
  if (percentile >= 50) return "Silver";
  return "Bronze";
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function monthLabel(year: number, month1: number): string {
  return `${MONTH_NAMES[month1 - 1]} ${year}`;
}
