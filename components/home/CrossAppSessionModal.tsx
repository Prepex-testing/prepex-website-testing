"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
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

const DURATION_OPTIONS = [
  { value: "30", label: "30 mins" },
  { value: "45", label: "45 mins" },
  { value: "60", label: "60 mins" },
  { value: "90", label: "90 mins" },
];

type CrossAppSessionModalProps = {
  open: boolean;
  onClose: () => void;
  onStart: (activityLabel: string) => void;
};

export function CrossAppSessionModal({ open, onClose, onStart }: CrossAppSessionModalProps) {
  const [activity, setActivity] = useState("coaching-lecture");
  const activityLabel = ACTIVITIES.find((item) => item.id === activity)?.label ?? activity;

  return (
    <Modal open={open} onClose={onClose} ariaLabel="Study outside prepex">
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
          />
        ))}
      </div>

      <div className="mt-4">
        <Select label="How long?" options={DURATION_OPTIONS} defaultValue="60" />
      </div>

      <Button variant="primary" className="mt-6" onClick={() => onStart(activityLabel)}>
        Start session
      </Button>
      <p className="mt-2 text-center text-xs text-muted">
        When you&apos;re done, return to Prepex and confirm. Counts as focus time.
      </p>
    </Modal>
  );
}
