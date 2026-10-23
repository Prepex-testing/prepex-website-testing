/**
 * The five onboarding screens, in order. One list so the progress bar, the Back/Next links, the resume logic
 * and the analytics events all agree on numbers, names and paths.
 */

export const ONBOARDING_TOTAL_STEPS = 5;

export type OnboardingStepName = "goal" | "about_you" | "coaching" | "timetable" | "chapters";

export const ONBOARDING_STEPS: ReadonlyArray<{ number: number; name: OnboardingStepName; path: string }> = [
  { number: 1, name: "goal", path: "/onboarding/preparing-for" },
  { number: 2, name: "about_you", path: "/onboarding/tell-us-about-you" },
  { number: 3, name: "coaching", path: "/onboarding/where-do-you-study" },
  { number: 4, name: "timetable", path: "/onboarding/build-timetable" },
  { number: 5, name: "chapters", path: "/onboarding/which-chapters-have-you-studied" },
];

/** Step 1 asks for a subject pick on its own screen for goals like CUET and Boards. */
export const SELECT_SUBJECT_PATH = "/onboarding/select-subject";

export function stepPath(step: number): string {
  return ONBOARDING_STEPS.find((s) => s.number === step)?.path ?? ONBOARDING_STEPS[0]!.path;
}

export function stepByName(name: OnboardingStepName) {
  return ONBOARDING_STEPS.find((s) => s.name === name)!;
}
