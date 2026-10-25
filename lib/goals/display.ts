import type { Goal } from "@/lib/api/goals";
import type { SubjectChapters } from "@/lib/api/dashboard";
import { defaultUnitMinutes, mockMinutesFor } from "@/lib/goals/v2";
import { formatDuration } from "@/lib/planner/format";
import { subjectColor } from "@/lib/study/subjects";

/** What a goal card says under its title: the quantity and how long one unit takes. */
export function goalInstruction(g: Goal): string {
  const each = (minutes: number) => `~${Math.round(minutes)}m each`;
  switch (g.type) {
    case "LECTURES":
      return `Watch ${g.target} ${g.target === 1 ? "lecture" : "lectures"} · ${each(g.minutesPerUnit ?? defaultUnitMinutes("LECTURES"))}`;
    case "QUESTIONS":
      return `${g.target} ${g.target === 1 ? "question" : "questions"} · ${Math.round(g.minutesPerUnit ?? defaultUnitMinutes("QUESTIONS"))}m per session`;
    case "REVISIONS":
      return `${g.target} revision ${g.target === 1 ? "slot" : "slots"} · ${each(g.minutesPerUnit ?? defaultUnitMinutes("REVISIONS"))}`;
    case "MOCKS":
      return `${g.target} ${g.target === 1 ? "mock" : "mocks"} · ${each(g.minutesPerUnit ?? mockMinutesFor(g))}`;
    case "HOURS":
      return `${formatDuration(g.unit === "HOURS" ? g.target * 60 : g.target)} focused study`;
    case "BACKLOG":
      return `Clear ${g.target} backlog ${g.target === 1 ? "item" : "items"}`;
  }
}

const NAMED_COLORS: [string, string][] = [
  ["physics", "#3B82F6"],
  ["chemistry", "#14B8A6"],
  ["math", "#F59E0B"],
  ["biology", "#D946EF"],
];

/** The accent colour for a subject's section: blue, teal, amber and magenta for the four main ones, the shared palette otherwise. */
export function sectionColor(name: string, subjectId: number | null): string {
  const hit = NAMED_COLORS.find(([key]) => name.toLowerCase().includes(key));
  if (hit) return hit[1];
  return subjectId === null ? "#9CA3AF" : subjectColor(subjectId);
}

export type GoalSection = {
  key: string;
  kind: "subject" | "general" | "mocks";
  label: string;
  subjectId: number | null;
  color: string;
  goals: Goal[];
};

const ORDER = ["physics", "chemistry", "math", "biology"];
const rank = (name: string) => {
  const i = ORDER.findIndex((k) => name.toLowerCase().includes(k));
  return i < 0 ? ORDER.length : i;
};

/**
 * Goals grouped by subject in the usual order (Physics, Chemistry, Maths, Biology), then goals with no subject, then
 * every mock in one section at the end. A subject the student studies always gets a section, even with no goals yet
 * (Biology only appears for students who have it); general and mocks appear only when they have goals.
 */
export function groupGoals(goals: Goal[], subjects: SubjectChapters[]): GoalSection[] {
  const names = new Map(subjects.map((s) => [s.subjectId, s.subjectName]));
  for (const g of goals) if (g.type !== "MOCKS" && g.subjectId !== null && !names.has(g.subjectId)) names.set(g.subjectId, `Subject ${g.subjectId}`);

  const subjectSections: GoalSection[] = [...names.entries()]
    .sort(([, a], [, b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([id, name]) => ({
      key: `subject-${id}`,
      kind: "subject" as const,
      label: name,
      subjectId: id,
      color: sectionColor(name, id),
      goals: goals.filter((g) => g.type !== "MOCKS" && g.subjectId === id),
    }));

  const general = goals.filter((g) => g.type !== "MOCKS" && g.subjectId === null);
  const mocks = goals.filter((g) => g.type === "MOCKS");
  return [
    ...subjectSections,
    ...(general.length > 0 ? [{ key: "general", kind: "general" as const, label: "Any subject", subjectId: null, color: sectionColor("", null), goals: general }] : []),
    ...(mocks.length > 0 ? [{ key: "mocks", kind: "mocks" as const, label: "Mocks", subjectId: null, color: sectionColor("mocks", null), goals: mocks }] : []),
  ];
}
