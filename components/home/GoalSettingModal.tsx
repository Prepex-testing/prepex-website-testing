"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { OptionCard } from "@/components/ui/OptionCard";
import {
  BookIcon,
  ClockIcon,
  FlameIcon,
  FileIcon,
  PencilIcon,
  InfoIcon,
  CheckCircleIcon,
  XIcon,
} from "@/components/ui/icons";

const SUGGESTIONS = [
  { id: "finish-topic", icon: <BookIcon />, label: "Finish [topic]" },
  { id: "hit-hours", icon: <ClockIcon />, label: "Hit __ focus hours total" },
  { id: "maintain-streak", icon: <FlameIcon />, label: "Maintain streak through week" },
  { id: "attempt-mock", icon: <FileIcon />, label: "Attempt mock" },
  { id: "write-own", icon: <PencilIcon />, label: "Write your own (one line, free)" },
];

type GoalSettingModalProps = {
  open: boolean;
  onClose: () => void;
};

export function GoalSettingModal({ open, onClose }: GoalSettingModalProps) {
  const [selected, setSelected] = useState("finish-topic");
  const [customGoal, setCustomGoal] = useState("");

  return (
    <Modal open={open} onClose={onClose} ariaLabel="Goal Setting Sunday">
      <div className="relative text-center">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-0 top-0 flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-tint-strong"
        >
          <XIcon />
        </button>
        <h2 className="text-h1 text-ink">Goal Setting Sunday</h2>
        <p className="mt-1 text-sm text-muted">Set this week&apos;s goal with Priya</p>
      </div>

      <p className="mt-5 text-center text-xs font-bold uppercase tracking-wide text-muted">
        Pick from suggestions
      </p>

      <div className="mt-3 flex flex-col gap-3">
        {SUGGESTIONS.map((item) => (
          <OptionCard
            key={item.id}
            icon={item.icon}
            title={item.label}
            selected={selected === item.id}
            onClick={() => setSelected(item.id)}
          />
        ))}
      </div>

      {selected === "write-own" && (
        <input
          type="text"
          value={customGoal}
          onChange={(event) => setCustomGoal(event.target.value)}
          placeholder="Type your goal here..."
          className="mt-3 w-full rounded-xl border border-brand/15 bg-surface px-4 py-3 text-sm text-body-text outline-none placeholder:text-muted/70 focus:border-focus-ring"
        />
      )}

      <div className="mt-4 flex flex-col items-center gap-1 text-center text-xs text-muted">
        <p className="flex items-center gap-1">
          <InfoIcon />
          When both partners set goals, they become visible to each other.
        </p>
        <p className="flex items-center gap-1">
          <CheckCircleIcon />
          End of week: review if you both hit your targets.
        </p>
      </div>

      <Button variant="primary" className="mt-5" onClick={onClose}>
        Set my goal
      </Button>
    </Modal>
  );
}
