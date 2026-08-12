import { CORE_API_BASE_URL } from "@/lib/api/config";
import { authenticatedRequest } from "@/lib/api/authRequest";
import { submitCheckIn, getCheckInStatus, type CheckInMoodValue } from "@/lib/api/checkin";

function authRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  return authenticatedRequest<T>(`${CORE_API_BASE_URL}/api/planner${path}`, options);
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

/** Focus-session task checklist — persisted via PATCH /planner/:taskId. */
export type TaskChecklist = {
  readNCRT?: boolean;
  watchLecture?: boolean;
  solveExample?: boolean;
  attemptProblems?: boolean;
  selfQuiz?: boolean;
};

export type PlannerTask = {
  id: string;
  taskType: "WELLNESS" | "PRACTICE" | "REVISION" | "NEW_LEARNING" | string;
  title: string;
  description: string | null;
  estimatedMinutes: number;
  secondsCompleted: number;
  scheduledStart: string;
  scheduledEnd: string;
  suggestedWindow: string | null;
  status: TaskStatus | string;
  questionCount: number | null;
  subject: PlannerSubject | null;
  chapter: PlannerChapter;
  isAnchor?: boolean;
  taskOrder?: number;
} & TaskChecklist;

export type PlannerTaskDetail = {
  id: string;
  dailyPlanId: string;
  userId: string;
  chapterId: string | null;
  subjectId: number;
  taskType: "WELLNESS" | "PRACTICE" | "REVISION" | "NEW_LEARNING" | string;
  title: string;
  description: string | null;
  estimatedMinutes: number;
  secondsCompleted: number;
  scheduledStart: string;
  scheduledEnd: string;
  suggestedWindow: string | null;
  priorityScore?: string;
  aiGenerated?: boolean;
  isAnchor?: boolean;
  isStudyingCrossApp?: boolean;
  taskOrder?: number;
  status: TaskStatus | string;
  completedAt: string | null;
  createdAt?: string;
  updatedAt?: string;
  questionCount: number | null;
  chapter: PlannerChapter;
  subject: PlannerSubject | null;
  isFirstRevision?: boolean;
};

export function getPlannerTask(taskId: string) {
  return authRequest<{ success: true; data: PlannerTaskDetail }>(`/task/${taskId}`);
}

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
  targetedExam?: string;
  targetedExamDate?: string;
  dayRemainingForExam?: number;
  isLateSingUp?: boolean;
};

export type PlannerSubjectSummary = {
  subjectId: number;
  subjectName: string;
  totalMinutes: number;
  completedSeconds: number;
  completionPercentage: number;
};

export type PlannerSummary = {
  totalTaskCount: number;
  pendingTaskCount: number;
  completedTaskCount: number;
  skippedTaskCount: number;
  totalPlannedMinutes: number;
  totalTimeCompletedSeconds: number;
  completionPercentage: number;
  subjectWiseSummary: PlannerSubjectSummary[];
};

export type TodayPlanResponse = {
  plan: DailyPlan | null;
  summary: PlannerSummary | null;
};

export type StudyConsistencyDay = {
  date: string;
  dayCompletionPercentage: number;
};

export type StudyConsistency = {
  year: number;
  month: number;
  days: StudyConsistencyDay[];
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

export function getStudyConsistency() {
  return authRequest<{ success: true; data: StudyConsistency }>("/consistency");
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
  | ({ secondsCompleted: number; status: TaskStatus; isStudyingCrossApp: false } & TaskChecklist)
  | { isStudyingCrossApp: true; crossAppActivity: string };

export function updatePlannerTask(taskId: string, input: UpdatePlannerTaskInput) {
  return authRequest<{ success: true; data: unknown }>(`/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export type EditPlannerTaskInput = {
  title: string;
  estimatedMinutes: number;
  description?: string;
  suggestedWindow?: SuggestedWindow;
};

export function editPlannerTask(taskId: string, input: EditPlannerTaskInput) {
  return authRequest<{ success: true; data: unknown }>(`/${taskId}/edit`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deletePlannerTask(taskId: string) {
  return authRequest<{ success: true; data: unknown }>(`/${taskId}`, {
    method: "DELETE",
  });
}

/** Clears every task on a daily plan — used by the late-signup "quick session" flow. */
export function deleteAllPlannerTasks(plannerId: string) {
  return authRequest<{ success: true; data: unknown }>(`/plan/${plannerId}/tasks`, {
    method: "DELETE",
  });
}

/** Marks the late-signup prompt as acknowledged — called on either Yes or No. */
export function acknowledgeLateOnboarding(userId: string) {
  return authRequest<{ success: true; data: unknown }>(`/user/${userId}/late-onboarding`, {
    method: "PATCH",
  });
}

export function reorderPlannerTask(taskId: string, newPosition: number) {
  return authRequest<{ success: true; data: unknown }>(`/${taskId}/reorder`, {
    method: "PATCH",
    body: JSON.stringify({ newPosition }),
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
