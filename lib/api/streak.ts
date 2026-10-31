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
  /** Freezes held (0 to 2). One is earned for every 7 days of streak and used automatically on a missed day. */
  streakFreezesHeld: number;
  /** Days of streak until the next freeze is earned; null when two are already held. */
  daysToNextFreeze: number | null;
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

  /**
   * Today's Effort Score panel — four weighted components that sum to `total`
   * out of `max`.
   *
   * Distinct from the leaderboard's PRD 10.5.1 Effort Score, which is an
   * unbounded all-up figure. This one scores a single day so the bars have
   * something to fill against.
   */
  effortScore: {
    total: number;
    max: number;
    /** Plain-language band, e.g. "Good Effort". */
    band: string;
    components: {
      key: "STUDY_TIME" | "PRACTICE" | "ACCURACY" | "REVISION";
      label: string;
      /** What the student did, in `unit`. */
      actual: number;
      /** What today asked of them. 0 = nothing of this kind was planned. */
      target: number;
      unit: string;
      earned: number;
      max: number;
    }[];
    hint: string;
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

/** Page sizes offered by the rows-per-page control. */

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

// -- Display helpers --------------------------------------------------------

/** "40m" / "1h 20m" — focus time in the shape the streak page reads it. */
export function formatFocus(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function monthLabel(year: number, month1: number): string {
  return `${MONTH_NAMES[month1 - 1]} ${year}`;
}
