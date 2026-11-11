"use client";

import { PexoBubble, usePexoLine } from "@/components/pexo/PexoBubble";
import type { NewGoal } from "@/lib/api/goals";
import { usePexo } from "@/lib/pexo/store";

/** The promise Pexo suggests, from the goals the student just picked: their hours and their questions. */
export function pledgeFromGoals(goals: Pick<NewGoal, "type" | "unit" | "target">[]): { hours: number; questions: number } {
  let minutes = 0;
  let questions = 0;
  for (const g of goals) {
    if (g.type === "HOURS") minutes += g.unit === "MINUTES" ? g.target : g.target * 60;
    if (g.type === "QUESTIONS") questions += g.target;
  }
  return { hours: Math.max(1, Math.round(minutes / 60)), questions };
}

/** "Here's your week." on the recap, and one tip chosen from the student's own week (their nudge, else the playbook). */
export function SundayIntro() {
  const { enabled, state } = usePexo();
  const intro = usePexoLine(enabled ? "sunday.intro" : null, {}, "sunday.intro");
  const tipTitle = usePexoLine(enabled ? "sunday.tip" : null, {}, "sunday.tip");
  const nudge = state?.nudge ?? null;
  const tip = usePexoLine(enabled ? (nudge ? [nudge.trigger, "playbook.4"] : ["playbook.5", "playbook.4"]) : null, nudge?.context ?? {}, `tip:${nudge?.trigger ?? "playbook"}`);
  if (!enabled || !intro) return null;
  return (
    <div className="flex flex-col gap-2" data-testid="sunday-pexo">
      <PexoBubble pick={intro} size={48} testId="sunday-intro" />
      {tipTitle && tip && (
        <p className="rounded-xl bg-tint-strong px-3 py-2 text-[13px] text-ink" data-testid="sunday-tip">
          <b className="font-semibold">{tipTitle.text}</b> {tip.text}
        </p>
      )}
    </div>
  );
}

type Pledge = { hours: number; questions: number; on: boolean };

/** The pledge card in the goals step: Pexo's prompt, the two numbers (prefilled), and a switch to skip it. */
export function PledgeCard({ value, onChange }: { value: Pledge; onChange: (p: Pledge) => void }) {
  const { enabled } = usePexo();
  const prompt = usePexoLine(enabled ? "pledge.prompt" : null, {}, "pledge.prompt");
  if (!enabled || !prompt) return null;
  const field = "h-11 w-24 rounded-xl border border-input-border bg-surface px-3 text-[15px] font-semibold text-ink outline-none focus:border-brand";
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-surface-elevated p-4" aria-label="This week's promise" data-testid="pledge-card">
      <PexoBubble pick={prompt} size={48} testId="pledge-prompt" />
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted">
          Hours
          <input type="number" inputMode="numeric" min={1} max={100} value={value.hours} disabled={!value.on} onChange={(e) => onChange({ ...value, hours: Math.max(1, Math.min(100, Number(e.target.value) || 1)) })} className={field} data-testid="pledge-hours" />
        </label>
        <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted">
          Questions
          <input type="number" inputMode="numeric" min={0} max={5000} value={value.questions} disabled={!value.on} onChange={(e) => onChange({ ...value, questions: Math.max(0, Math.min(5000, Number(e.target.value) || 0)) })} className={field} data-testid="pledge-questions" />
        </label>
        <label className="flex min-h-11 items-center gap-2 text-[13px] text-ink">
          <input type="checkbox" checked={!value.on} onChange={(e) => onChange({ ...value, on: !e.target.checked })} data-testid="pledge-skip" className="size-4 accent-[var(--brand)]" />
          Not this week
        </label>
      </div>
    </section>
  );
}
