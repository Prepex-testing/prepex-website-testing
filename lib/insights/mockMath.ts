import type { ExamPattern, MockSubject, TestType } from "@/lib/api/mocks";

/** The mock-log form's arithmetic: what the pattern is made of, the auto-calculated total, and the checks. */

export const EXAM_PATTERNS: { value: ExamPattern; label: string }[] = [
  { value: "jee_main", label: "JEE Main" },
  { value: "jee_advanced", label: "JEE Advanced" },
  { value: "neet", label: "NEET" },
];

export const TEST_TYPES: { value: TestType; label: string }[] = [
  { value: "full_mock", label: "Full mock" },
  { value: "sectional", label: "Sectional" },
  { value: "chapter_test", label: "Chapter test" },
  { value: "phase_test", label: "Phase test" },
  { value: "toppers_test", label: "Toppers' test" },
];

export const SUBJECT_LABEL: Record<MockSubject, string> = { physics: "Physics", chemistry: "Chemistry", maths: "Maths", biology: "Biology" };

export const SUBJECTS_BY_PATTERN: Record<ExamPattern, MockSubject[]> = {
  jee_main: ["physics", "chemistry", "maths"],
  jee_advanced: ["physics", "chemistry", "maths"],
  neet: ["physics", "chemistry", "biology"],
};

export const DEFAULT_MAX: Record<ExamPattern, number> = { jee_main: 300, jee_advanced: 360, neet: 720 };

export function labelOfPattern(value: ExamPattern): string {
  return EXAM_PATTERNS.find((p) => p.value === value)?.label ?? value;
}

export function labelOfType(value: TestType): string {
  return TEST_TYPES.find((t) => t.value === value)?.label ?? value;
}

/** A typed integer (negatives allowed — JEE has negative marking), or NaN when it is not one. Empty is NaN too. */
export function parseMarks(raw: string): number {
  const t = raw.trim();
  return /^-?\d+$/.test(t) ? Number(t) : Number.NaN;
}

/**
 * The total the form shows while the student types the subject marks: the sum, but only once every subject of the
 * pattern has a number (a half-filled sectional is the student's to total by hand). Null until then.
 */
export function autoTotal(pattern: ExamPattern, marks: Partial<Record<MockSubject, string>>): number | null {
  const subjects = SUBJECTS_BY_PATTERN[pattern];
  const values = subjects.map((s) => parseMarks(marks[s] ?? ""));
  if (values.some(Number.isNaN)) return null;
  return values.reduce((a, b) => a + b, 0);
}

/** Why the marks cannot be saved, or null. Mirrors the server's checks so the student hears it before submitting. */
export function marksProblem(pattern: ExamPattern, total: number, max: number, marks: Partial<Record<MockSubject, string>>): string | null {
  if (!Number.isInteger(max) || max < 1) return "The maximum marks must be a whole number of at least 1.";
  if (!Number.isInteger(total)) return "Total marks must be a whole number.";
  if (total > max) return `Total marks (${total}) can't be more than the maximum (${max}).`;
  if (total < -max) return `Total marks (${total}) can't be below -${max}.`;
  const auto = autoTotal(pattern, marks);
  if (auto !== null && auto !== total) return `Total (${total}) must equal the sum of the subjects (${auto}).`;
  return null;
}

export function scorePercent(total: number, max: number): number {
  return max > 0 ? Math.round((total / max) * 1000) / 10 : 0;
}

/** Indian digit grouping for a rank: 1400000 → "14,00,000". */
export function rankLabel(rank: number | null | undefined): string {
  if (rank === null || rank === undefined) return "—";
  return new Intl.NumberFormat("en-IN").format(rank);
}

/** "42,000" → "about 42,000": a projection is never shown as a promise. */
export function approxRank(rank: number | null | undefined): string {
  return rank === null || rank === undefined ? "—" : `~${rankLabel(rank)}`;
}

export function signedPoints(value: number): string {
  return `${value > 0 ? "+" : ""}${value}`;
}
