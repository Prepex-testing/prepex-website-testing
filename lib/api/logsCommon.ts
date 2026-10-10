/** Types shared by the Phase 3 log clients (revision, backlog, practice). */

export type PlannerWindow = "MORNING" | "MIDDAY" | "EVENING" | "NIGHT";

/** What the add-to-planner endpoints answer with. */
export type PlannerPlacement = {
  /** `added_to_plan`: it is on today's plan now. `pinned_for_plan`: pinned for that day; the planner picks it up when it builds the day. */
  mode: "added_to_plan" | "pinned_for_plan";
  date: string;
  timeSlot: PlannerWindow;
  taskId: string | null;
  anchorId: string | null;
  warning: string | null;
};

export type AddToPlannerInput = {
  /** `YYYY-MM-DD` */
  date: string;
  timeSlot: PlannerWindow;
  estimatedMinutes?: number;
};

export type Page<T> = { items: T[]; nextCursor: string | null };

export type HeatBand = "red" | "yellow" | "green";

export function query(params: Record<string, string | number | null | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export type Period = "week" | "month" | "all";
