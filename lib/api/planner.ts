import { CORE_API_BASE_URL } from "@/lib/api/config";
import { apiRequest, ApiError } from "@/lib/api/http";
import { refreshAccessToken } from "@/lib/api/auth";
import { getAccessToken, getRefreshToken, saveTokens, clearSession } from "@/lib/auth/session";
import { submitCheckIn, getCheckInStatus, type CheckInMoodValue } from "@/lib/api/checkin";

async function authRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${CORE_API_BASE_URL}/api/planner${path}`;
  const accessToken = getAccessToken();

  try {
    return await apiRequest<T>(url, {
      ...options,
      headers: { Authorization: `Bearer ${accessToken}`, ...options.headers },
    });
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 401) throw err;

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearSession();
      throw err;
    }

    const { data: newTokens } = await refreshAccessToken(refreshToken);
    saveTokens(newTokens);

    return apiRequest<T>(url, {
      ...options,
      headers: { Authorization: `Bearer ${newTokens.accessToken}`, ...options.headers },
    });
  }
}

export type PlanGenerationReason = "SCHEDULED" | "MOCK" | "RECOVERY";

/** Mock day takes priority even when a burnout is also flagged for today. */
export function getPlanGenerationReason(status: {
  isInBurnout: boolean;
  isMockToday: boolean;
}): PlanGenerationReason {
  if (status.isMockToday) return "MOCK";
  if (status.isInBurnout) return "RECOVERY";
  return "SCHEDULED";
}

export type PlannerSubject = { id: number; code: string; name: string };

export type PlannerChapter = {
  id: string;
  name: string;
  subject: PlannerSubject;
  chapterMetadata?: { difficulty?: string } | null;
} | null;

export type TaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED";

export type PlannerTask = {
  id: string;
  taskType: "WELLNESS" | "PRACTICE" | "REVISION" | "NEW_LEARNING" | string;
  title: string;
  description: string | null;
  estimatedMinutes: number;
  minutesCompleted: number;
  scheduledStart: string;
  scheduledEnd: string;
  suggestedWindow: string;
  status: TaskStatus | string;
  questionCount: number | null;
  subject: PlannerSubject | null;
  chapter: PlannerChapter;
};

export type DailyPlan = {
  id: string;
  planDate: string;
  status: string;
  totalPlannedMinutes: number;
  totalCompletedMinutes: number;
  aiSummary: string | null;
  plannerMode: string;
  generationType: PlanGenerationReason;
  tasks: PlannerTask[];
};

export type PlannerSubjectSummary = {
  subjectId: number;
  subjectName: string;
  totalMinutes: number;
  completedMinutes: number;
  completionPercentage: number;
};

export type PlannerSummary = {
  totalTaskCount: number;
  pendingTaskCount: number;
  completedTaskCount: number;
  skippedTaskCount: number;
  totalPlannedMinutes: number;
  totalTimeCompleted: number;
  completionPercentage: number;
  subjectWiseSummary: PlannerSubjectSummary[];
};

export type TodayPlanResponse = {
  plan: DailyPlan | null;
  summary: PlannerSummary | null;
};

export function generatePlan(reason: PlanGenerationReason) {
  return authRequest<{ success: true; data: unknown }>("/generate", {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export function getTodayPlan() {
  return authRequest<{ success: true; data: TodayPlanResponse }>("/today");
}

export type RegenReason =
  | "TOO_HEAVY"
  | "TOO_LIGHT"
  | "WRONG_SUBJECTS"
  | "TIME_SLOTS"
  | "FRESH_TAKE";

export function regeneratePlan(regenReason: RegenReason) {
  return authRequest<{ success: true; data: unknown }>("/generate", {
    method: "POST",
    body: JSON.stringify({ reason: "REGENERATE", regenReason }),
  });
}

export type SuggestedWindow = "MORNING" | "MIDDAY" | "EVENING" | "NIGHT";

export type AddPlannerTaskInput = {
  title: string;
  taskType: string;
  estimatedMinutes: number;
  chapterId?: string;
  subjectId?: number;
  description?: string;
  suggestedWindow?: SuggestedWindow;
};

export function addPlannerTask(input: AddPlannerTaskInput) {
  return authRequest<{ success: true; data: unknown }>("/addtask", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export type UpdatePlannerTaskInput =
  | { minutesCompleted: number; status: TaskStatus; isStudyingCrossApp: false }
  | { isStudyingCrossApp: true; crossAppActivity: string };

export function updatePlannerTask(taskId: string, input: UpdatePlannerTaskInput) {
  return authRequest<{ success: true; data: unknown }>(`/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/**
 * Submits today's mood, reads back burnout/mock status, and generates the
 * plan for the reason that status implies. Callers show a loading state for
 * the duration of this call and then refetch getTodayPlan().
 */
export async function generatePlanForMood(mood: CheckInMoodValue) {
  await submitCheckIn({ mood });
  const { data: status } = await getCheckInStatus();
  const reason = getPlanGenerationReason(status);
  await generatePlan(reason);
  return reason;
}

const MOOD_REGEN_REASON: Record<CheckInMoodValue, RegenReason> = {
  DRAINED: "TOO_LIGHT",
  HEAVY: "TOO_LIGHT",
  STEADY: "FRESH_TAKE",
  GOOD: "TOO_HEAVY",
  STRONG: "TOO_HEAVY",
};

/**
 * Submits an updated mood from the home page's "Change" energy popup and
 * regenerates today's plan around it — distinct from generatePlanForMood
 * (used by the /check-in flow), which drives plan generation off
 * burnout/mock status instead of the mood itself. Callers show a loading
 * state for the duration of this call and then refetch getTodayPlan().
 */
export async function regeneratePlanForMood(mood: CheckInMoodValue) {
  await submitCheckIn({ mood });
  const regenReason = MOOD_REGEN_REASON[mood];
  await regeneratePlan(regenReason);
  return regenReason;
}
