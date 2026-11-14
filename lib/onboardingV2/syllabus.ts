import { getExams } from "@/lib/api/dashboard";
import { getOnboardingChapters, type OnboardingSyllabus } from "@/lib/api/onboarding";
import { examForOption, goalOption } from "@/lib/onboarding/goal";
import type { Goal } from "@/lib/onboardingV2/canvas";

/**
 * The chapter list for a goal, fetched once per page. The canvas starts it as soon as the student picks their exam,
 * so by the time they reach the chapters question (a minute later) it is already here instead of loading for seconds.
 */
const cache = new Map<Goal, Promise<OnboardingSyllabus>>();

export function loadSyllabus(goal: Goal): Promise<OnboardingSyllabus> {
  let p = cache.get(goal);
  if (!p) {
    p = getExams()
      .then(({ data }) => {
        const exam = examForOption(goalOption(goal === "JEE_BOTH" ? "JEE_BOTH" : "JEE_MAIN")!, data);
        if (!exam) throw new Error("exam");
        return getOnboardingChapters({ examId: exam.id });
      })
      .then(({ data }) => data);
    // a failed load is forgotten so the chapters question can try again
    p.catch(() => cache.delete(goal));
    cache.set(goal, p);
  }
  return p;
}

/** Fire and forget: warm the list in the background. */
export function prefetchSyllabus(goal: Goal | null | undefined): void {
  if (goal) void loadSyllabus(goal).catch(() => undefined);
}
