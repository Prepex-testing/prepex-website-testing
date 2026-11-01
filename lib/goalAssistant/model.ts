import type { NewGoal } from "@/lib/api/goals";
import type { Assistant, Meter, Suggestion, Trim } from "@/lib/api/goalAssistant";

/** The pure parts of the Goal Assistant screen: what the student's edits add up to, and the goals they turn into. */

export const METER_TEXT: Record<Meter, { title: string; line: string }> = {
  green: { title: "Fits your week", line: "This leaves room for a bad day." },
  amber: { title: "Tight, but possible", line: "There is little slack, so one lost evening will show." },
  red: { title: "More than your week holds", line: "Trim something, or the plan will push it to later days." },
};

/** Green up to 85% of the time available, amber up to all of it, red beyond. */
export function meterOf(requiredMinutes: number, availableMinutes: number): Meter {
  if (requiredMinutes <= 0) return "green";
  if (availableMinutes <= 0) return "red";
  const r = requiredMinutes / availableMinutes;
  return r <= 0.85 ? "green" : r <= 1 ? "amber" : "red";
}

/** The minutes the week can hold: the usual capacity, or in a push week 10% above what the student has been completing. */
export function availableOf(a: Pick<Assistant, "push" | "capacity" | "demonstratedMinutes">): number {
  const usual = a.capacity.usableMinutes;
  return a.push ? Math.max(usual, Math.round((a.demonstratedMinutes ?? usual) * 1.1)) : usual;
}

export type Edits = { included: Record<string, boolean>; targets: Record<string, number> };

export function initialEdits(list: Suggestion[]): Edits {
  return { included: Object.fromEntries(list.map((s) => [s.id, true])), targets: Object.fromEntries(list.map((s) => [s.id, s.target])) };
}

export function minutesFor(s: Suggestion, edits: Edits): number {
  return edits.included[s.id] === false ? 0 : (edits.targets[s.id] ?? s.target) * s.minutesPerUnit;
}

export function requiredFor(list: Suggestion[], edits: Edits): number {
  return list.reduce((n, s) => n + minutesFor(s, edits), 0);
}

/** One suggestion as a goal the Weekly goals screen can save. */
export function toNewGoal(s: Suggestion, target: number): NewGoal {
  switch (s.type) {
    case "LECTURES":
      return { type: "LECTURES", unit: "COUNT", target, subjectId: s.subjectId, minutesPerUnit: s.minutesPerUnit };
    case "QUESTIONS":
      // the server sizes a question goal from the student's own pace, so no minutes are sent
      return { type: "QUESTIONS", unit: "COUNT", target, subjectId: s.subjectId };
    case "MOCKS":
      return { type: "MOCKS", unit: "COUNT", target, mockType: s.minutesPerUnit >= 120 ? "full_mock" : "sectional" };
    case "BACKLOG":
      return { type: "BACKLOG", unit: "COUNT", target: 1, subjectId: s.subjectId, chapterId: s.chapterId, backlogItemId: s.backlogItemId };
  }
}

export function chosenGoals(list: Suggestion[], edits: Edits): NewGoal[] {
  return list.filter((s) => edits.included[s.id] !== false && (edits.targets[s.id] ?? s.target) > 0).map((s) => toNewGoal(s, edits.targets[s.id] ?? s.target));
}

/** One-tap trims against the student's current edits: questions first, then lectures, until the week fits. */
export function trimsAgainst(list: Suggestion[], edits: Edits, availableMinutes: number): Trim[] {
  let over = requiredFor(list, edits) - availableMinutes;
  if (over <= 0) return [];
  const out: Trim[] = [];
  const order = list.filter((s) => (s.type === "QUESTIONS" || s.type === "LECTURES") && edits.included[s.id] !== false).sort((a, b) => (a.type === b.type ? b.totalMinutes - a.totalMinutes : a.type === "QUESTIONS" ? -1 : 1));
  for (const s of order) {
    if (over <= 0) break;
    const now = edits.targets[s.id] ?? s.target;
    const room = now - s.minTarget;
    if (room <= 0) continue;
    const step = s.type === "QUESTIONS" ? 5 : 1;
    const units = Math.min(room, Math.ceil(Math.ceil(over / s.minutesPerUnit) / step) * step);
    if (units <= 0) continue;
    out.push({ suggestionId: s.id, label: s.label, newTarget: now - units, savesMinutes: units * s.minutesPerUnit });
    over -= units * s.minutesPerUnit;
  }
  return out;
}
