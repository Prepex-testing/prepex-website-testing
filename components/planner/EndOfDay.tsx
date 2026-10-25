"use client";

import { Check } from "lucide-react";
import type { PlanTask } from "@/lib/api/plannerV2";
import { formatDuration, subjectStyle } from "@/lib/planner/format";

type Props = {
  percent: number;
  rolling: PlanTask[];
  onOpenTomorrow: () => void;
};

/** True once the day's work is over: nothing left to do, or the evening has run out. Exported for tests. */
export function isEndOfDay(args: { isToday: boolean; nowMin: number; tasks: PlanTask[]; studyBlocks: { endMin: number }[] }): boolean {
  if (!args.isToday) return false;
  const live = args.tasks.filter((t) => t.status !== "skipped" && t.status !== "rolled_over");
  if (live.length === 0) return false;
  const open = live.filter((t) => t.status === "pending" || t.status === "in_progress");
  if (open.length === 0) return true;
  const lastEnd = Math.max(...args.studyBlocks.map((b) => b.endMin), ...live.map((t) => t.endMin ?? 0));
  return args.nowMin >= lastEnd;
}

export function EndOfDay({ percent, rolling, onOpenTomorrow }: Props) {
  return (
    <section aria-label="End of day" data-testid="end-of-day" className="flex flex-col items-center gap-4 rounded-3xl border border-brand/10 bg-surface p-6 text-center shadow-hover">
      <span className="flex size-16 items-center justify-center rounded-full bg-[var(--success-bg)] text-[var(--success)]">
        <Check className="size-9" strokeWidth={3} aria-hidden />
      </span>
      <p className="text-[18px] font-extrabold leading-snug text-ink">
        You hit {percent}% of today&apos;s plan.
        {rolling.length > 0 ? " Here's what rolls over to tomorrow." : " Nothing rolls over."}
      </p>
      {rolling.length > 0 && (
        <ul className="flex w-full flex-col gap-2" data-testid="rolling-list">
          {rolling.map((t) => (
            <li key={t.id} className="flex items-center gap-3 rounded-xl bg-tint-strong px-3 py-2.5 text-left dark:bg-[#FAF7F214]">
              <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: subjectStyle(t.subject).color }} />
              <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-ink">{t.title}</span>
              <span className="text-[12px] text-muted">{formatDuration(t.estimatedMinutes)}</span>
            </li>
          ))}
        </ul>
      )}
      <button type="button" data-testid="open-tomorrow" onClick={onOpenTomorrow} className="min-h-12 w-full max-w-xs rounded-[10px] border border-secondary-button-border bg-transparent px-5 text-[14px] font-medium text-ink transition-colors hover:bg-tint-strong">
        Open tomorrow
      </button>
    </section>
  );
}
