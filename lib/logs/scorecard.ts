import type { SubjectChapters } from "@/lib/api/dashboard";
import type { MockExtractedData } from "@/lib/api/mock";
import type { ExamPattern, MockSubject } from "@/lib/api/mocks";
import type { MockFormInitial } from "@/components/mocks/MockForm";

const SUBJECT_KEYS: [string, MockSubject][] = [
  ["physics", "physics"],
  ["chemistry", "chemistry"],
  ["math", "maths"],
  ["biology", "biology"],
];

/** "JEE Main", "jee_advanced", "NEET UG" -> the log's exam pattern, or undefined when it can't tell. */
export function examPatternOf(examType: string | null): ExamPattern | undefined {
  const t = (examType ?? "").toLowerCase();
  if (t.includes("advanced")) return "jee_advanced";
  if (t.includes("neet")) return "neet";
  if (t.includes("jee")) return "jee_main";
  return undefined;
}

/**
 * What a scorecard photo read into, as the starting point for the Log Mock form: the student checks it and saves.
 * Ported from the old mock analysis upload (Claude vision extraction); the form's own checks still apply.
 */
export function scorecardToForm(extracted: MockExtractedData, subjects: SubjectChapters[]): MockFormInitial {
  const subjectMarks: Partial<Record<MockSubject, number | null>> = {};
  for (const s of extracted.subjectScores ?? []) {
    const name = subjects.find((x) => x.subjectId === s.subjectId)?.subjectName.toLowerCase() ?? "";
    const key = SUBJECT_KEYS.find(([k]) => name.includes(k))?.[1];
    if (key) subjectMarks[key] = s.score;
  }
  const pattern = examPatternOf(extracted.examType);
  return {
    ...(pattern ? { examPattern: pattern } : {}),
    ...(extracted.mockName ? { testName: extracted.mockName } : {}),
    ...(extracted.attemptedDate ? { dateTaken: extracted.attemptedDate.slice(0, 10) } : {}),
    ...(extracted.totalScore !== null ? { totalMarks: extracted.totalScore } : {}),
    ...(extracted.maxScore !== null ? { maxMarks: extracted.maxScore } : {}),
    ...(extracted.timeTakenMinutes !== null ? { timeMinutes: extracted.timeTakenMinutes } : {}),
    ...(Object.keys(subjectMarks).length > 0 ? { subjectMarks } : {}),
    ...(extracted.sourceInstitute ? { notes: `Source: ${extracted.sourceInstitute}` } : {}),
  };
}
