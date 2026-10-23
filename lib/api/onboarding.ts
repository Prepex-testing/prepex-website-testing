import { CORE_API_BASE_URL } from "@/lib/api/config";
import { authenticatedRequest } from "@/lib/api/authRequest";
import type { SubjectChapters } from "@/lib/api/dashboard";
import type { ApiBlock } from "@/lib/api/timetable";
import { stepPath } from "@/lib/onboarding/steps";

export type OnboardingProgress = {
  id: string;
  userId: string;
  currentStep: number;
  isCompleted: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OnboardingProfile = {
  examId: string | null;
  /** What the student is preparing for: JEE_MAIN, JEE_ADVANCED, NEET ... ("Both JEE and NEET" = all three). */
  targetExams: string[];
  targetExamDate: string | null;
  isPrimaryExam: boolean;
  city: string | null;
  phoneNumber: string | null;
  currentLevel: "CLASS_11" | "CLASS_12" | "DROPPER_1" | "DROPPER_2" | "OTHER" | null;
  coachingType: "COACHING" | "SELF_PREP" | "ONLINE_SELF_PREP" | null;
  coachingName: string | null;
  batchName: string | null;
  /** True when every day of the week is the same routine. */
  timetableUniformWeek: boolean;
  weekdayHours: number | null;
  weekendHours: number | null;
  hasScheduleUpload: boolean;
  exam: { id: string; code: string; name: string } | null;
};

/** The five onboarding screens (see lib/onboarding/steps.ts). The server only records "done". */
export function getOnboardingStepPath(step: number): string {
  return stepPath(step);
}

function authRequest<T>(
  path: string,
  options: RequestInit = {},
  basePath = "/api/onboarding",
): Promise<T> {
  return authenticatedRequest<T>(`${CORE_API_BASE_URL}${basePath}${path}`, options);
}

export function getOnboardingProgress() {
  return authRequest<{
    success: true;
    data: {
      progress: OnboardingProgress;
      profile: OnboardingProfile | null;
    };
  }>("/progress");
}

export type OnboardingSyllabus = {
  targetExams: string[];
  subjects: Array<{
    id: number;
    code: string;
    name: string;
    chapters: Array<{ id: string; name: string; class: number | null; subjectId: number; sequenceOrder: number | null }>;
  }>;
};

/**
 * Every Class 11 and Class 12 chapter for a goal that has not been saved yet (Biology included for NEET and for
 * "both"). Onboarding keeps its answers on the device until the last step, so this is keyed by the exam itself.
 */
export function getOnboardingChapters(input: { examId: string; subjectIds?: number[] }) {
  const query = new URLSearchParams({ examId: input.examId });
  if (input.subjectIds?.length) query.set("subjectIds", input.subjectIds.join(","));
  return authRequest<{ success: true; data: OnboardingSyllabus }>(`/chapters?${query.toString()}`);
}

export type CompleteOnboardingInput = {
  examId: string;
  subjectIds?: number[];
  fullName: string;
  phoneNumber?: string;
  city?: string;
  targetExamDate: string;
  currentLevel: "CLASS_11" | "CLASS_12" | "DROPPER_1" | "DROPPER_2" | "OTHER";
  coachingType: "COACHING" | "SELF_PREP" | "ONLINE_SELF_PREP";
  coachingName?: string;
  batchName?: string;
  timetable: { uniformWeek: boolean; source: "MANUAL" | "COACHING_TEMPLATE"; blocks: Omit<ApiBlock, "id">[] };
  completedChapterIds: string[];
};

/** The one save at the end of onboarding: everything goes in together, or nothing does. */
export function completeOnboarding(input: CompleteOnboardingInput) {
  return authRequest<{
    success: true;
    data: { targetExams: string[]; chaptersCompleted: number; chaptersToLearn: number; weeklyStudyMinutes: number };
  }>("/complete", { method: "POST", body: JSON.stringify(input) });
}

type ProfileSubjectChapter = {
  id: string;
  subjectId: number;
  name: string;
  sequenceOrder: number;
  isActive: boolean;
};

type ProfileSubject = {
  id: number;
  code: string;
  name: string;
  chapters: ProfileSubjectChapter[];
};

/**
 * The student's subjects with chapters. By default chapters are limited to the student's own class;
 * `allClasses` returns Class 11, 12 and unclassed chapters together (revising earlier material,
 * logging a mistake from an older book).
 */
export async function getStudentChapters(options: { allClasses?: boolean } = {}) {
  const { success, data } = await authRequest<{
    success: true;
    data: { subjects: ProfileSubject[] };
  }>(`/subjects-chapters${options.allClasses ? "?allClasses=true" : ""}`, {}, "/api/profile");

  const subjects: SubjectChapters[] = data.subjects.map((subject) => ({
    subjectId: subject.id,
    subjectCode: subject.code,
    subjectName: subject.name,
    chapters: subject.chapters.map((chapter) => ({
      id: chapter.id,
      subjectId: chapter.subjectId,
      name: chapter.name,
      sequenceOrder: chapter.sequenceOrder,
      isActive: chapter.isActive,
    })),
  }));

  return { success, data: subjects };
}
