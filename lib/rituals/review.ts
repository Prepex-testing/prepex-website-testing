import type { ProposedGoal, ReviewHistoryRow } from "@/lib/api/rituals";

export const ORIGIN_LABELS: Record<ProposedGoal["origin"], string> = {
  last_week: "From last week's goals",
  coaching: "A chapter your class covered",
  backlog: "From your backlog",
};

const TYPE_LABELS: Record<ProposedGoal["type"], (g: ProposedGoal) => string> = {
  LECTURES: (g) => `Watch ${g.target} lectures`,
  QUESTIONS: (g) => `Solve ${g.target} questions`,
  REVISIONS: (g) => `Revise ${g.target} times`,
  MOCKS: (g) => `Take ${g.target} mocks`,
  HOURS: (g) => `Study ${g.target} ${g.unit === "MINUTES" ? "minutes" : "hours"}`,
  BACKLOG: () => "Clear a backlog item",
};

/** One readable line per proposed goal. The chapter name is not in the payload, so the topic is used when there is one. */
export function goalLabel(g: ProposedGoal): string {
  const base = TYPE_LABELS[g.type](g);
  return g.topic ? `${base}: ${g.topic}` : base;
}

/** The one line a past review shows. Win Journal rows carry a different recap shape. */
export function historyLine(row: ReviewHistoryRow): string {
  const r = row.recap;
  if (row.source === "win_journal") {
    const title = typeof r["heroTitle"] === "string" ? (r["heroTitle"] as string) : "Weekly Win Journal";
    const tasks = typeof r["tasksCompleted"] === "number" ? ` · ${r["tasksCompleted"]} tasks` : "";
    return `${title}${tasks}`;
  }
  const hours = typeof r["hours"] === "number" ? `${r["hours"]}h` : null;
  const questions = typeof r["questions"] === "number" ? `${r["questions"]} questions` : null;
  const goals = row.goalsAccepted > 0 ? `${row.goalsAccepted} goals set` : null;
  return [hours, questions, goals].filter(Boolean).join(" · ") || "Completed";
}
