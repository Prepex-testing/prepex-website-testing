"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { RadioOption } from "@/components/ui/RadioOption";
import { XIcon } from "@/components/ui/icons";
import { regeneratePlan, type RegenReason } from "@/lib/api/planner";

const REASONS: { id: string; label: string; regenReason: RegenReason }[] = [
  { id: "too-heavy", label: "Plan feels too heavy", regenReason: "TOO_HEAVY" },
  { id: "too-light", label: "Plan feels too light", regenReason: "TOO_LIGHT" },
  { id: "wrong-subjects", label: "Wrong subjects today", regenReason: "WRONG_SUBJECTS" },
  { id: "time-slots", label: "Time slots don't work", regenReason: "TIME_SLOTS" },
  { id: "fresh-take", label: "Just want a fresh take", regenReason: "FRESH_TAKE" },
];

type RegeneratePlanModalProps = {
  open: boolean;
  onClose: () => void;
  onRegenerated?: () => void;
};

export function RegeneratePlanModal({ open, onClose, onRegenerated }: RegeneratePlanModalProps) {
  const [reasonId, setReasonId] = useState("too-heavy");
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegenerate = async () => {
    const selected = REASONS.find((option) => option.id === reasonId);
    if (!selected) return;

    setSubmitting(true);
    setError(null);
    try {
      await regeneratePlan(selected.regenReason);
      onRegenerated?.();
      onClose();
    } catch {
      setError("Couldn't regenerate the plan. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

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
            selected={reasonId === option.id}
            onSelect={() => setReasonId(option.id)}
          />
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <div className="mt-6 flex items-center justify-between">
        <button type="button" onClick={onClose} className="text-sm font-semibold text-ink">
          Cancel
        </button>
        <Button variant="primary" size="sm" onClick={handleRegenerate} disabled={isSubmitting}>
          {isSubmitting ? "Regenerating..." : "Regenerate"}
        </Button>
      </div>
    </Modal>
  );
}
