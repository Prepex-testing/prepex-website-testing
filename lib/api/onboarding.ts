import { CORE_API_BASE_URL } from "@/lib/api/config";
import { apiRequest, ApiError } from "@/lib/api/http";
import { refreshAccessToken } from "@/lib/api/auth";
import { getAccessToken, getRefreshToken, saveTokens, clearSession } from "@/lib/auth/session";
import type { SubjectChapters } from "@/lib/api/dashboard";

export type OnboardingProgress = {
  id: string;
  userId: string;
  currentStep: number;
  isCompleted: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const STEP_PATHS: Record<number, string> = {
  1: "/onboarding/preparing-for",
  2: "/onboarding/tell-us-about-you",
  3: "/onboarding/where-do-you-study",
  4: "/onboarding/time-selection",
  5: "/onboarding/which-chapters-have-you-studied",
  6: "/onboarding/analyzing",
};

export function getOnboardingStepPath(step: number): string {
  return STEP_PATHS[step] ?? "/onboarding/preparing-for";
}

async function authRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${CORE_API_BASE_URL}/api/onboarding${path}`;
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

export function getOnboardingProgress() {
  return authRequest<{
    success: true;
    data: { progress: OnboardingProgress; profile: unknown };
  }>("/progress");
}

export function selectExam(input: { examId: string; isPrimaryExam?: boolean }) {
  return authRequest<{ success: true; requiresSubjectSelection: boolean; message: string }>(
    "/step1",
    { method: "POST", body: JSON.stringify(input) },
  );
}

export function selectSubjects(input: { subjectIds: number[] }) {
  return authRequest<{ success: true; message: string }>("/step1a", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function saveAcademicProfile(input: {
  fullName: string;
  phoneNumber: string;
  city: string;
  targetExamDate: string;
  currentLevel: "CLASS_11" | "CLASS_12" | "DROPPER_1" | "DROPPER_2" | "OTHER";
}) {
  return authRequest<{ success: true; message: string }>("/step2", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function saveCoachingProfile(input: {
  coachingType: "COACHING" | "SELF_PREP" | "ONLINE_SELF_PREP";
  coachingName?: string;
  batchName?: string;
  hasScheduleUpload?: boolean;
}) {
  return authRequest<{ success: true; message: string }>("/step3", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function saveStudySchedule(input: {
  weekdayHours: number;
  weekendHours: number;
  sameDailyTarget?: boolean;
  chronotype?: "MORNING_PERSON" | "MIDDAY_PERSON" | "EVENING_PERSON" | "NIGHT_PERSON";
  studyWindows: Array<"MORNING" | "MIDDAY" | "EVENING" | "NIGHT">;
}) {
  return authRequest<{ success: true; message: string }>("/step4", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getStudentChapters() {
  return authRequest<{ success: true; data: SubjectChapters[] }>("/chapters");
}

export function saveChapterProgress(input: {
  chapterProgress: Array<{
    chapterId: string;
    status: "NOT_STARTED" | "IN_REVISION" | "MASTERED";
  }>;
}) {
  return authRequest<{ success: true; message: string }>("/step5", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function confirmOnboarding() {
  return authRequest<{ success: true; message: string }>("/step6", { method: "POST" });
}
