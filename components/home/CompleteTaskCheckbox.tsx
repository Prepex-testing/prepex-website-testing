"use client";

import { useState } from "react";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { CheckIcon } from "@/components/ui/icons";
import { updatePlannerTask } from "@/lib/api/planner";

type CompleteTaskCheckboxProps = {
  taskId: string;
  title: string;
  secondsCompleted: number;
  isCompleted?: boolean;
  /** Called after the task is successfully marked complete, so the parent list can refetch. */
  onCompleted?: () => void;
};

/** Shared by TaskRow and PlanTaskRow so /home and /home/today-plan behave identically. */
export function CompleteTaskCheckbox({
  taskId,
  title,
  secondsCompleted,
  isCompleted,
  onCompleted,
}: CompleteTaskCheckboxProps) {
  const [isConfirmOpen, setConfirmOpen] = useState(false);
  const [isCompleting, setCompleting] = useState(false);

  if (isCompleted) {
    return (
      <span
        aria-label={`${title} completed`}
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#EAF2FF] text-[#1A1A4E] dark:bg-[#FFFFFF14] dark:text-white"
      >
        <CheckIcon className="h-3.5 w-3.5" />
      </span>
    );
  }

  const handleConfirm = async () => {
    setCompleting(true);
    try {
      await updatePlannerTask(taskId, {
        secondsCompleted,
        status: "COMPLETED",
        isStudyingCrossApp: false,
      });
      setConfirmOpen(false);
      onCompleted?.();
    } catch {
      // Best-effort — the confirm modal stays open so the user can retry.
    } finally {
      setCompleting(false);
    }
  };

  return (
    <>
      <input
        type="checkbox"
        checked={false}
        onChange={() => setConfirmOpen(true)}
        aria-label={`Mark "${title}" complete`}
        className="h-5 w-5 shrink-0 appearance-none rounded border border-[#333333] bg-transparent checked:border-[#1A1A4E] checked:bg-[#1A1A4E] dark:border-[#8B8998]"
      />

      <ConfirmModal
        open={isConfirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
        title="Mark task complete?"
        description="Are you sure you want to mark this task completed?"
        confirmLabel={isCompleting ? "Completing..." : "Yes, Mark Complete"}
      />
    </>
  );
}
