"use client";

import { useState } from "react";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Switch } from "@/components/ui/Switch";
import { ApiError } from "@/lib/api/http";
import { setPlannerMode, type PlannerMode } from "@/lib/api/plannerV2";
import { trackPlanner } from "@/lib/telemetry/planner";

type Props = {
  mode: PlannerMode;
  onChanged: (mode: PlannerMode) => void | Promise<void>;
};

export const MODE_CONFIRM: Record<PlannerMode, { title: string; description: string; confirm: string }> = {
  manual: {
    title: "Switch to manual?",
    description: "Switching to manual will stop auto-generating future days. Your existing plan stays.",
    confirm: "Switch to manual",
  },
  auto: {
    title: "Switch to auto?",
    description: "Switching to auto will generate tomorrow's plan tonight.",
    confirm: "Switch to auto",
  },
};

/** Auto (on) / Manual (off), top right of the planner. Switching asks first and says what will happen. */
export function ModeToggle({ mode, onChanged }: Props) {
  const [pending, setPending] = useState<PlannerMode | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copy = pending ? MODE_CONFIRM[pending] : null;

  async function confirm() {
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      await setPlannerMode(pending);
      trackPlanner("planner_manual_toggle", { to: pending });
      await onChanged(pending);
      setPending(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't switch modes. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2" data-testid="mode-toggle">
        <span className="text-[13px] font-bold text-ink" data-testid="mode-label">
          {mode === "auto" ? "Auto" : "Manual"}
        </span>
        <Switch checked={mode === "auto"} label={mode === "auto" ? "Auto planning is on. Switch to manual." : "Manual planning is on. Switch to auto."} onChange={(on) => setPending(on ? "auto" : "manual")} />
      </div>
      <ConfirmModal
        open={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={() => void confirm()}
        title={copy?.title ?? ""}
        description={copy?.description ?? ""}
        confirmLabel={copy?.confirm ?? "Switch"}
        busy={busy}
        error={error}
      />
    </>
  );
}
