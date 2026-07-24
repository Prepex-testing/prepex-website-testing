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
      <div className="flex flex-col items-center gap-1 text-center">
        <h2 className="text-h2 text-ink">
          {isUpdateMode ? (
            <>Update Today&apos;s Mood</>
          ) : (
            `Good Morning, ${name} 👋`
          )}
        </h2>
        <p className="text-sm font-semibold text-ink">
          How are you feeling today?
        </p>
        <p className="text-xs text-muted">
          We&apos;ll adjust today&apos;s study plan accordingly.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-5">
        {MOODS.map((mood) => (
          <button
            key={mood.id}
            type="button"
            onClick={() => setSelectedMood(mood.id)}
            aria-pressed={selectedMood === mood.id}
            className={`flex flex-col items-center gap-2 rounded-xl border p-2 text-center transition-colors ${
              selectedMood === mood.id
                ? "border-brand bg-tint-strong"
                : "border-brand/10 bg-surface"
            }`}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-tint text-lg">
              {mood.emoji}
            </span>
            <span className="text-[11px] font-medium text-body-text">
              {mood.label}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-col items-center gap-2">
        {isUpdateMode ? (
          <>
            <Button
              type="button"
              variant="primary"
              disabled={!selected}
              onClick={() => selected && onSave?.(selected)}
              className="disabled:cursor-not-allowed disabled:opacity-40"
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
            <Button type="button" variant="primary" onClick={() => onContinue?.(selected)}>
              Continue to today&apos;s plan
            </Button>
            <button
              type="button"
              onClick={onSkip}
              className="text-xs font-medium text-muted underline"
            >
              Skip for today
            </button>
          </>
        )}
      </div>
    </>
  );
}
