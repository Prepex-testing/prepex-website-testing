"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { MOODS, type Mood } from "@/components/check-in/moods";

type CheckInBodyProps = {
  name: string;
  mode?: "onboarding" | "update";
  onSave?: (mood: Mood) => void;
  onCancel?: () => void;
  onContinue?: (mood: Mood | null) => void;
  onSkip?: () => void;
};

export function CheckInBody({
  name,
  mode = "onboarding",
  onSave,
  onCancel,
  onContinue,
  onSkip,
}: CheckInBodyProps) {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const isUpdateMode = mode === "update";
  const selected = MOODS.find((item) => item.id === selectedMood) ?? null;

  return (
    <>
      <div className="flex flex-col items-center gap-3 pb-6 text-center sm:gap-4 sm:pb-12">
        <h2 className="text-lg font-extrabold leading-tight text-ink sm:text-[32px] sm:leading-none">
          {isUpdateMode ? (
            <>Update Today&apos;s Mood</>
          ) : (
            `Good Morning, ${name} 👋`
          )}
        </h2>

        <p className="text-sm font-semibold leading-none text-body-text dark:text-ink sm:text-lg">
          How are you feeling today?
        </p>

        <p className="text-xs font-medium leading-snug text-muted sm:text-base sm:leading-none">
          We&apos;ll adjust today&apos;s study plan accordingly.
        </p>
      </div>

      {/*
        Mobile: flex-wrap + justify-center → 3 boxes on row 1, remaining 2 centered on row 2.
        sm and up: 5 boxes in a single row via grid.
        Each box is a square (aspect-square) so height === width at every breakpoint.
      */}
      <div className="flex flex-wrap justify-center gap-2 sm:grid sm:grid-cols-5 sm:gap-6">
        {MOODS.map((mood) => {
          const isSelected = selectedMood === mood.id;
          return (
            <button
              key={mood.id}
              type="button"
              onClick={() => setSelectedMood(mood.id)}
              aria-pressed={isSelected}
              className={`flex aspect-square w-[28%] flex-col items-center justify-center gap-1 rounded-lg border bg-white p-2 text-center transition-colors dark:bg-[#2A2A6E] sm:w-auto sm:gap-2 sm:rounded-2xl sm:border-2 sm:p-3 ${
                isSelected ? "border-brand" : "border-transparent"
              }`}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-mood-chip-bg text-lg leading-none sm:h-14 sm:w-14 sm:text-3xl">
                {mood.emoji}
              </span>

              <span className="text-[9px] font-semibold leading-tight text-body-text dark:text-ink sm:text-sm">
                {mood.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex flex-col items-center gap-3 sm:mt-12">
        {isUpdateMode ? (
          <>
            <Button
              type="button"
              variant="primary"
              disabled={!selected}
              onClick={() => selected && onSave?.(selected)}
              className="w-full rounded-xl disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:min-w-[388px]"
            >
              Save
            </Button>
            <button
              type="button"
              onClick={onCancel}
              className="text-xs font-medium text-muted underline"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="primary"
              onClick={() => onContinue?.(selected)}
              className="w-full rounded-xl sm:w-auto sm:min-w-[388px]"
            >
              Continue to today&apos;s plan
            </Button>
            <button
              type="button"
              onClick={onSkip}
              className="text-xs font-medium text-muted"
            >
              Skip for today
            </button>
          </>
        )}
      </div>
    </>
  );
}