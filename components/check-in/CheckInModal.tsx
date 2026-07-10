"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export const MOODS = [
  { id: "drained", emoji: "😴", label: "Drained" },
  { id: "heavy", emoji: "😐", label: "Heavy" },
  { id: "steady", emoji: "🙂", label: "Steady" },
  { id: "good", emoji: "😀", label: "Good" },
  { id: "energised", emoji: "🔥", label: "Energised" },
];

export type Mood = (typeof MOODS)[number];

type CheckInModalProps = {
  open: boolean;
  onClose: () => void;
  name: string;
  mode?: "onboarding" | "update";
  onSave?: (mood: Mood) => void;
};

export function CheckInModal({
  open,
  onClose,
  name,
  mode = "onboarding",
  onSave,
}: CheckInModalProps) {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const isUpdateMode = mode === "update";

  const handleSave = () => {
    const mood = MOODS.find((item) => item.id === selectedMood);
    if (mood) {
      onSave?.(mood);
    }
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} ariaLabel="Daily check-in">
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
              disabled={!selectedMood}
              onClick={handleSave}
              className="disabled:cursor-not-allowed disabled:opacity-40"
            >
              Save
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-medium text-muted underline"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <Button href="/home" variant="primary">
              Continue to today&apos;s plan
            </Button>
            <Link
              href="/home"
              className="text-xs font-medium text-muted underline"
            >
              Skip for today
            </Link>
          </>
        )}
      </div>
    </Modal>
  );
}
