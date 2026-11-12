import type { ClimbStep, ClimbTotals } from "@/lib/api/pexo";

/** Quiet days in a row from this many on are shown as one group of quiet stones, with Pexo's calm `climb.gap` line. */
export const QUIET_RUN = 3;
/** A day of this many studied minutes or more is a "tall step" (`climb.step.big`). */
export const BIG_STEP_MINUTES = 6 * 60;

export type PathItem = { kind: "step"; step: ClimbStep } | { kind: "quiet"; from: string; to: string; count: number };

/** Steps newest first; runs of 3+ quiet days (nothing else on them) fold into one item. Pure. */
export function foldQuiet(steps: ClimbStep[]): PathItem[] {
  const out: PathItem[] = [];
  let run: ClimbStep[] = [];
  const plain = (s: ClimbStep) => !s.studied && !s.landmarks.length && !s.checkpoints.length && !s.smashed.length && !s.gems && s.milestone === null;
  const flush = () => {
    if (run.length >= QUIET_RUN) out.push({ kind: "quiet", from: run[run.length - 1]!.date, to: run[0]!.date, count: run.length });
    else for (const s of run) out.push({ kind: "step", step: s });
    run = [];
  };
  for (const s of steps) {
    if (plain(s)) {
      run.push(s);
      continue;
    }
    flush();
    out.push({ kind: "step", step: s });
  }
  flush();
  return out;
}

/** Today's line on the Climb: a tall step, a done step, or the waiting step. Pure. */
export function todayTrigger(t: Pick<ClimbTotals, "todayStudied" | "todayMinutes" | "steps">): { trigger: string; context: Record<string, string | number> } {
  if (t.todayStudied && t.todayMinutes >= BIG_STEP_MINUTES) return { trigger: "climb.step.big", context: { hours: Math.round((t.todayMinutes / 60) * 10) / 10 } };
  if (t.todayStudied) return { trigger: "climb.step.today", context: { steps: t.steps } };
  return { trigger: "climb.step.pending", context: {} };
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const monthLabel = (month: string) => `${MONTHS[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;
export const dayLabel = (date: string) => `${Number(date.slice(8, 10))} ${MONTHS[Number(date.slice(5, 7)) - 1]!.slice(0, 3)}`;

export function minutesLabel(m: number): string {
  if (m <= 0) return "Quiet day";
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h ? (r ? `${h}h ${r}m` : `${h}h`) : `${r}m`;
}

export const TEST_TYPE: Record<string, string> = { full_mock: "Full mock", sectional: "Sectional test", chapter_test: "Chapter test", phase_test: "Phase test", toppers_test: "Toppers test" };
export const testTypeLabel = (t: string) => TEST_TYPE[t] ?? "Mock";
