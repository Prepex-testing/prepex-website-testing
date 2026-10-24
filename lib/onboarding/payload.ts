import type { OnboardingDraft } from "@/lib/onboarding/draft";
import { defaultExamDateIso, displayDateToIso } from "@/lib/onboarding/draft";
import { toApiBlocks } from "@/lib/timetable/grid";

/** The body of POST /api/onboarding/complete, built from the draft. */
export function buildCompletePayload(draft: OnboardingDraft, needsSubjects: boolean) {
  const { goal, about, coaching, timetable, chapters } = draft;
  const coached = coaching.type === "COACHING";
  return {
    examId: goal.examId as string,
    ...(needsSubjects && { subjectIds: goal.subjectIds }),
    fullName: about.fullName.trim(),
    // Left out when blank, so an untouched field is not stored as an empty string that later reads as "has a phone number".
    ...(about.phoneNumber.trim() && { phoneNumber: about.phoneNumber.trim() }),
    ...(about.city.trim() && { city: about.city.trim() }),
    targetExamDate: displayDateToIso(about.examDate) ?? defaultExamDateIso(about.currentLevel),
    currentLevel: about.currentLevel,
    coachingType: coaching.type,
    ...(coached && coaching.name && { coachingName: coaching.name }),
    ...(coached && coaching.batch && { batchName: coaching.batch }),
    timetable: {
      uniformWeek: timetable.uniformWeek,
      // A week still exactly as the template left it is recorded as that template; any change makes it the student's own.
      source: timetable.templateId && !timetable.edited ? ("COACHING_TEMPLATE" as const) : ("MANUAL" as const),
      blocks: toApiBlocks(timetable.blocks).map((block) => {
        const rest = { ...block };
        delete rest.id;
        return rest;
      }),
    },
    completedChapterIds: chapters.completedIds,
  };
}
