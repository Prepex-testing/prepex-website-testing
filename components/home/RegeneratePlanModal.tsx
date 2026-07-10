"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { RadioOption } from "@/components/ui/RadioOption";
import { XIcon } from "@/components/ui/icons";

const REASONS = [
  { id: "too-heavy", label: "Plan feels too heavy" },
  { id: "too-light", label: "Plan feels too light" },
  { id: "wrong-subjects", label: "Wrong subjects today" },
  { id: "time-slots", label: "Time slots don't work" },
  { id: "fresh-take", label: "Just want a fresh take" },
];

type RegeneratePlanModalProps = {
  open: boolean;
  onClose: () => void;
};

export function RegeneratePlanModal({ open, onClose }: RegeneratePlanModalProps) {
  const [reason, setReason] = useState("too-heavy");

  return (
    <Modal open={open} onClose={onClose} ariaLabel="Regenerate today's plan">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-h2 text-ink">Regenerate today&apos;s plan?</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-tint-strong"
        >
          <XIcon />
        </button>
      </div>
      <p className="mt-1 text-sm text-muted">Why? (optional, helps us improve)</p>

      <div className="mt-4 flex flex-col gap-3">
        {REASONS.map((option) => (
          <RadioOption
            key={option.id}
            name="regenerate-reason"
            value={option.id}
            label={option.label}
            selected={reason === option.id}
            onSelect={() => setReason(option.id)}
          />
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button type="button" onClick={onClose} className="text-sm font-semibold text-ink">
          Cancel
        </button>
        <Button variant="primary" size="sm" onClick={onClose}>
          Regenerate
        </Button>
      </div>
    </Modal>
  );
}
