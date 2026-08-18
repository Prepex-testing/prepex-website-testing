"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { WhiteModal } from "@/components/ui/WhiteModal";
import { RadioOption } from "@/components/ui/RadioOption";
import { Select } from "@/components/ui/Select";
import { XIcon } from "@/components/ui/icons";

const ACTIVITIES = [
  { id: "coaching-lecture", label: "Watch coaching lecture" },
  { id: "physical-book", label: "Solve from physical book" },
  { id: "coaching-dpp", label: "Coaching DPP" },
  { id: "youtube-lecture", label: "YouTube lecture" },
  { id: "other", label: "Other" },
];

type CrossAppSessionModalProps = {
  open: boolean;
  onClose: () => void;
  onStart: (activityLabel: string) => void;
  task: { estimatedMinutes: number; secondsCompleted: number } | null;
};

export function CrossAppSessionModal({ open, onClose, onStart, task }: CrossAppSessionModalProps) {
  const [activity, setActivity] = useState("coaching-lecture");
  const activityLabel = ACTIVITIES.find((item) => item.id === activity)?.label ?? activity;

  const remainingMinutes = task
    ? Math.max(task.estimatedMinutes - Math.floor(task.secondsCompleted / 60), 0)
    : 0;
  const durationOptions = [{ value: String(remainingMinutes), label: `${remainingMinutes} mins` }];

  return (
    <WhiteModal open={open} onClose={onClose} ariaLabel="Study outside prepex">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-h2 text-ink">Study outside prepex.</h2>
          <p className="mt-1 text-sm text-muted">What are you about to do?</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-tint-strong"
        >
          <XIcon />
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {ACTIVITIES.map((item) => (
          <RadioOption
            key={item.id}
            name="cross-app-activity"
            value={item.id}
            label={item.label}
            selected={activity === item.id}
            onSelect={() => setActivity(item.id)}
            unselectedLabelClassName="text-[#666666] dark:text-[#8B8998]"
          />
        ))}
      </div>

      <div className="mt-4">
        <Select label="How long?" options={durationOptions} defaultValue={String(remainingMinutes)} />
      </div>

      <Button variant="primary" className="mt-6" onClick={() => onStart(activityLabel)}>
        Start session
      </Button>
      <p className="mt-2 text-center text-xs text-muted">
        When you&apos;re done, return to prepex and confirm. Counts as focus time.
      </p>
    </WhiteModal>
  );
}
