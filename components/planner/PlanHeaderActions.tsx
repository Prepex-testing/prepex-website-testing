"use client";

import { useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { AddTaskSheet } from "@/components/planner/AddTaskSheet";
import type { usePlanDay } from "@/components/planner/usePlanDay";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import type { PlanTask } from "@/lib/api/plannerV2";
import { trackPlanner } from "@/lib/telemetry/planner";

type Plan = ReturnType<typeof usePlanDay>;

const OUTLINE = "flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] border border-secondary-button-border bg-transparent px-4 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-tint-strong disabled:cursor-not-allowed disabled:opacity-50";

type Props = {
  plan: Plan;
  /** The day being planned (YYYY-MM-DD); omitted means today. */
  date?: string;
  notify: (message: string) => void;
  /** Called once a task is added, so the screen can scroll to it. */
  onAdded?: (task: PlanTask) => void;
};

/**
 * Regenerate and Add task, side by side at the top of a plan. Regenerate is hidden in manual mode, asks before it
 * rebuilds, and says how many rebuilds are left today. Used on Home and on the full plan.
 */
export function PlanHeaderActions({ plan, date, notify, onAdded }: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const day = plan.day;
  if (!day) return null;
  const manual = day.mode === "manual";
  const regen = day.regenerate;

  async function regenerate() {
    setError(null);
    trackPlanner("planner_regenerate", { had_plan: Boolean(day?.plan) });
    const err = await plan.build(day?.plan ? "REGENERATE" : "SCHEDULED");
    if (err) setError(err);
    else setRegenOpen(false);
  }

  return (
    <div className="flex flex-col items-end gap-1" data-testid="plan-actions">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {!manual && (
          <button type="button" data-testid="regenerate" title={`${regen.remaining} left today`} disabled={plan.building || regen.remaining === 0} onClick={() => setRegenOpen(true)} className={OUTLINE}>
            <RefreshCw className={`size-4 ${plan.building ? "animate-spin" : ""}`} aria-hidden />
            Replan
          </button>
        )}
        <button type="button" data-testid="add-task" onClick={() => setAddOpen(true)} className={OUTLINE}>
          <Plus className="size-4" aria-hidden />
          Add task
        </button>
      </div>
      {!manual && (
        <p className="text-[11px] text-muted" data-testid="regen-counter">
          {regen.remaining} left today
        </p>
      )}

      <AddTaskSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        date={date ?? day.date}
        onAdded={(task, warning) => {
          notify(warning ?? "Added to your plan.");
          onAdded?.(task);
          void plan.refresh();
        }}
      />
      <ConfirmModal
        open={regenOpen}
        onClose={() => setRegenOpen(false)}
        onConfirm={() => void regenerate()}
        title="Rebuild today's plan?"
        description="Prepex will build it again from your weekly goals. Tasks you have finished, started or added yourself stay."
        confirmLabel="Regenerate"
        busy={plan.building}
        error={error}
      />
    </div>
  );
}
