"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { GoalAssistantSheet } from "@/components/goals/GoalAssistant";
import type { NewGoal } from "@/lib/api/goals";

type Props = {
  weekStart: string;
  /** Goals the student accepted from the suggestions. The page saves them. */
  onAccept: (goals: NewGoal[]) => void | Promise<void>;
};

/** "Suggest this week's goals": a small outlined button in the header that opens the Goal Assistant. */
export function SmartSuggestion({ weekStart, onAccept }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        data-testid="suggest-week"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-border-strong bg-transparent px-[18px] py-2.5 text-[14px] font-medium text-ink transition-colors hover:bg-surface-elevated-2 disabled:cursor-not-allowed disabled:opacity-50 !rounded-full"
      >
        <Sparkles className="size-4" aria-hidden />
        Suggest this week&apos;s goals
      </button>
      <GoalAssistantSheet open={open} onClose={() => setOpen(false)} weekStart={weekStart} onAccept={onAccept} />
    </>
  );
}
