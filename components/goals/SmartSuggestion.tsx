"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { WeekSuggestSheet } from "@/components/goals/WeekSuggestSheet";
import type { NewGoal } from "@/lib/api/goals";

type Props = {
  weekStart: string;
  subjectNames: Map<number, string>;
  chapterNames: Map<string, string>;
  /** Goals the student accepted from the suggestions. The page saves them. */
  onAccept: (goals: NewGoal[]) => void | Promise<void>;
};

/** "Suggest this week's goals": a small outlined button in the header that opens the week's suggestions. */
export function SmartSuggestion({ weekStart, subjectNames, chapterNames, onAccept }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        data-testid="suggest-week"
        onClick={() => setOpen(true)}
        className="flex min-h-11 items-center gap-1.5 rounded-full border border-secondary-button-border bg-transparent px-3.5 py-1.5 text-[13px] font-semibold text-ink transition-colors hover:bg-tint-strong"
      >
        <Sparkles className="size-4" aria-hidden />
        Suggest this week&apos;s goals
      </button>
      <WeekSuggestSheet open={open} onClose={() => setOpen(false)} weekStart={weekStart} subjectNames={subjectNames} chapterNames={chapterNames} onAccept={onAccept} />
    </>
  );
}
