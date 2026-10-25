import type { Exam } from "@/lib/api/dashboard";

/**
 * Client-side view of the exam goal. The server derives the real list (core-service lib/targetExams.ts) from the
 * exam row and is the one that decides; this mirror only lets the screens react before anything is saved — which
 * subjects to expect, whether to ask for a subject pick, how to order and label the options.
 */

export type TargetExam = "JEE_MAIN" | "JEE_ADVANCED" | "NEET" | "CUET" | "BOARDS";

export function targetExamsFor(exam: Pick<Exam, "code" | "name">): TargetExam[] {
  const text = `${exam.code} ${exam.name}`.toLowerCase();
  const hasJee = text.includes("jee");
  const hasNeet = text.includes("neet");
  const out: TargetExam[] = [];
  if (hasJee) out.push("JEE_MAIN");
  if (text.includes("advanced") || (hasJee && hasNeet)) {
    if (!out.includes("JEE_MAIN")) out.push("JEE_MAIN");
    out.push("JEE_ADVANCED");
  }
  if (hasNeet) out.push("NEET");
  if (text.includes("cuet")) out.push("CUET");
  if (text.includes("board")) out.push("BOARDS");
  return out;
}

/** CUET, Boards and anything combined with them need the student to pick subjects; JEE, NEET and both do not. */
export function needsSubjectPick(exam: Pick<Exam, "code" | "name">): boolean {
  const targets = targetExamsFor(exam);
  if (targets.includes("CUET") || targets.includes("BOARDS")) return true;
  return !targets.some((t) => t === "JEE_MAIN" || t === "JEE_ADVANCED" || t === "NEET");
}

/** Boards and CUET are Class 12 exams. */
export function isClassTwelveOnly(exam: Pick<Exam, "code" | "name"> | null): boolean {
  if (!exam) return false;
  const code = exam.code.toUpperCase();
  return code === "BOARDS" || code === "CUET";
}

/** Whether Biology belongs in this goal's syllabus. */
export function includesBiology(exam: Pick<Exam, "code" | "name">): boolean {
  return targetExamsFor(exam).includes("NEET");
}

/**
 * The four goals the first screen offers, in the order they are shown. Exams are rows an admin manages, so each
 * option names the exam codes it can be served by (first match wins) and the target exams the student ends up with.
 * "JEE Advanced" and "Both JEE Main + Advanced" are the same journey (Advanced needs Main), so they resolve to the
 * same exam and the same list; the pick is remembered in the draft so the right card stays highlighted.
 */
export type GoalOptionKey = "JEE_MAIN" | "JEE_ADVANCED" | "JEE_BOTH" | "NEET";

export type GoalOption = {
  key: GoalOptionKey;
  title: string;
  subtitle: string;
  /** Exam codes that can serve this option, best first. */
  examCodes: readonly string[];
  targetExams: readonly TargetExam[];
};

export const GOAL_OPTIONS: readonly GoalOption[] = [
  { key: "JEE_MAIN", title: "JEE Main", subtitle: "NITs, IIITs and GFTIs", examCodes: ["JEE_MAIN"], targetExams: ["JEE_MAIN"] },
  {
    key: "JEE_ADVANCED",
    title: "JEE Advanced",
    subtitle: "IITs — includes JEE Main",
    examCodes: ["JEE_ADVANCED"],
    targetExams: ["JEE_MAIN", "JEE_ADVANCED"],
  },
  {
    key: "JEE_BOTH",
    title: "Both JEE Main + Advanced",
    subtitle: "The full JEE journey",
    examCodes: ["JEE_MAIN+ADVANCED", "JEE_ADVANCED"],
    targetExams: ["JEE_MAIN", "JEE_ADVANCED"],
  },
  { key: "NEET", title: "NEET", subtitle: "AIIMS and medical colleges", examCodes: ["NEET"], targetExams: ["NEET"] },
];

export function goalOption(key: GoalOptionKey | null | undefined): GoalOption | null {
  return GOAL_OPTIONS.find((option) => option.key === key) ?? null;
}

/** The exam row that serves an option, or null while that row does not exist yet. */
export function examForOption<T extends Pick<Exam, "code">>(option: GoalOption, exams: readonly T[]): T | null {
  for (const code of option.examCodes) {
    const match = exams.find((exam) => exam.code.toUpperCase() === code);
    if (match) return match;
  }
  return null;
}

/**
 * Which option an exam already chosen (a saved draft, or answers kept on the server) stands for. "Both JEE and NEET"
 * belonged to an earlier version of this screen and maps to nothing, so a student who picked it chooses again.
 */
export function optionForExam(exam: Pick<Exam, "code"> | null): GoalOptionKey | null {
  if (!exam) return null;
  switch (exam.code.toUpperCase()) {
    case "JEE_MAIN":
      return "JEE_MAIN";
    case "JEE_ADVANCED":
      return "JEE_ADVANCED";
    case "JEE_MAIN+ADVANCED":
      return "JEE_BOTH";
    case "NEET":
      return "NEET";
    default:
      return null;
  }
}
