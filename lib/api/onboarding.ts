import { CORE_API_BASE_URL } from "@/lib/api/config";
import { authenticatedRequest } from "@/lib/api/authRequest";
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

export type ChronotypeValue = "MORNING_PERSON" | "MIDDAY_PERSON" | "EVENING_PERSON" | "NIGHT_PERSON";
export type StudyWindowValue = "MORNING" | "MIDDAY" | "EVENING" | "NIGHT";

export type OnboardingProfile = {
  examId: string | null;
  targetExamDate: string | null;
  isPrimaryExam: boolean;
  city: string | null;
  phoneNumber: string | null;
  currentLevel: "CLASS_11" | "CLASS_12" | "DROPPER_1" | "DROPPER_2" | "OTHER" | null;
  coachingType: "COACHING" | "SELF_PREP" | "ONLINE_SELF_PREP" | null;
  coachingName: string | null;
  batchName: string | null;
  hasScheduleUpload: boolean;
  weekdayHours: number | null;
  weekendHours: number | null;
  sameDailyTarget: boolean;
  chronotype: ChronotypeValue | null;
  studyWindows: Array<{ window: StudyWindowValue }>;
  exam: { id: string; code: string; name: string } | null;
};

export type OnboardingChapterProgress = {
  id: string;
  name: string;
  status: "NOT_STARTED" | "LEARNING" | "IN_REVISION" | "MASTERED";
};

export type OnboardingSubjectProgress = {
  subjectId: number;
  subjectName: string;
  subjectCode: string;
  chapters: OnboardingChapterProgress[];
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
      subjects: OnboardingSubjectProgress[];
    };
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

export function skipOnboardingStep(step: 2 | 3 | 4) {
  return authRequest<{ success: true; message: string }>(`/step${step}`, {
    method: "POST",
    body: JSON.stringify({ isSkipped: true }),
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

export type ScheduleUploadResult = {
  fileUrl: string;
  parsedSuccessfully: boolean;
  extractedSchedule: Array<{ day: string; startTime: string; endTime: string }>;
  summary: string;
  suggestedChronotype: ChronotypeValue | null;
  suggestedStudyWindows: StudyWindowValue[] | null;
};

export function uploadScheduleImage(file: File) {
  const formData = new FormData();
  formData.append("schedule", file);
  return authRequest<{ success: true; data: ScheduleUploadResult }>("/step3a", {
    method: "POST",
    body: formData,
  });
}

export function saveStudySchedule(input: {
  weekdayHours: number;
  weekendHours: number;
  sameDailyTarget?: boolean;
  chronotype?: ChronotypeValue;
  studyWindows: StudyWindowValue[];
}) {
  return authRequest<{ success: true; message: string }>("/step4", {
    method: "POST",
    body: JSON.stringify(input),
  });
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

export async function getStudentChapters() {
  const { success, data } = await authRequest<{
    success: true;
    data: { subjects: ProfileSubject[] };
  }>("/subjects-chapters", {}, "/api/profile");

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

export function saveChapterProgress(input: {
  chapterProgress: Array<{
    chapterId: string;
    status: "NOT_STARTED" | "LEARNING" | "IN_REVISION" | "MASTERED";
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
