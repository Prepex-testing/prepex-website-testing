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

/** Preferred order of the goal options. "Both JEE and NEET" sits straight after NEET; anything unknown goes last. */
const GOAL_ORDER = ["JEE_MAIN", "JEE_MAIN+ADVANCED", "NEET", "JEE_AND_NEET", "CUET", "BOARDS"];

export function sortExams<T extends Pick<Exam, "code">>(exams: T[]): T[] {
  const rank = (code: string) => {
    const i = GOAL_ORDER.indexOf(code.toUpperCase());
    return i === -1 ? GOAL_ORDER.length : i;
  };
  return [...exams].sort((a, b) => rank(a.code) - rank(b.code));
}

export const GOAL_SUBTITLES: Record<string, string> = {
  JEE_MAIN: "NITs, IIITs and GFTIs",
  "JEE_MAIN+ADVANCED": "IITs, NITs, IIITs and GFTIs",
  NEET: "Medical entrance exam",
  JEE_AND_NEET: "Physics, Chemistry, Maths and Biology",
  CUET: "Central university entrance test",
  BOARDS: "Class 12 boards",
};
export const DEFAULT_GOAL_SUBTITLE = "A study plan built around your goal";
