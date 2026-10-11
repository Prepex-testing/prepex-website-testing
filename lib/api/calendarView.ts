import { CORE_API_BASE_URL } from "@/lib/api/config";
import { authenticatedRequest } from "@/lib/api/authRequest";

/** Calendar views — core-service /api/calendar (month heatmap, one day, one ISO week). The planner's calendar management is lib/api/calendar.ts. */

export type DaySummary = {
  date: string;
  totalFocusedMinutes: number;
  totalStudiedMinutes: number;
  plannedMinutes: number;
  /** 1 (drained) .. 5 (strong); null when there was no check-in. */
  moodScore: number | null;
  hasWeeklyDiagnosis: boolean;
  dayType: "ANCHOR" | "NO_STUDY" | "MOCK_DAY" | null;
  mocks: number;
};

type Totals = { focusedMinutes: number; studiedMinutes: number; plannedMinutes: number; activeDays: number };

export type MonthView = { year: number; month: number; days: DaySummary[]; totals: Totals };
export type WeekView = { isoWeek: string; weekStart: string; weekEnd: string; days: DaySummary[]; totals: Totals; hasWeeklyDiagnosis: boolean; weeklyReview: { id: string; title: string | null } | null };

export type DayTask = {
  id: string;
  source: "plan" | "pinned";
  title: string;
  taskType: string;
  subjectId: number | null;
  chapterId: string | null;
  chapterName: string | null;
  estimatedMinutes: number;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED";
  window: string | null;
};

export type DayView = {
  date: string;
  isToday: boolean;
  isFuture: boolean;
  dayType: DaySummary["dayType"];
  totals: { focusedMinutes: number; studiedMinutes: number; plannedMinutes: number; tasksPlanned: number; tasksCompleted: number; questions: number; revisions: number; mistakesLogged: number; mocks: number };
  mood: { mood: string; score: number | null } | null;
  planned: DayTask[];
  completed: DayTask[];
  logs: {
    studySessions: { id: string; minutes: number; source: string; subjectId: number; chapterId: string | null; chapterName: string | null; topic: string | null; loggedAt: string }[];
    focusSessions: { id: string; subjectId: number; plannedMinutes: number; actualMinutes: number | null; wasCompleted: boolean; startedAt: string }[];
    practice: { id: string; source: string; chapterId: string; chapterName: string | null; attempted: number; correct: number; accuracy: number | null; loggedAt: string }[];
    revisions: { id: string; chapterId: string; chapterName: string | null; revisionType: string; minutes: number; loggedAt: string }[];
    mistakes: { id: string; chapterId: string | null; chapterName: string | null; topic: string | null; createdAt: string }[];
    mocks: { id: string; name: string | null; testType: string; totalMarks: number; maxMarks: number; scorePercent: number }[];
  };
  hasWeeklyDiagnosis: boolean;
  weeklyReview: { id: string; title: string | null } | null;
  /** Accountability pods ship later; always null for now. */
  pod: null;
};

function request<T>(path: string): Promise<T> {
  return authenticatedRequest<T>(`${CORE_API_BASE_URL}/api/calendar${path}`);
}

export function getMonthView(year: number, month: number) {
  return request<{ success: true; data: MonthView }>(`/${year}/${month}`);
}

export function getDayView(date: string) {
  return request<{ success: true; data: DayView }>(`/day/${date}`);
}

export function getWeekView(isoWeek: string) {
  return request<{ success: true; data: WeekView }>(`/week/${isoWeek}`);
}
