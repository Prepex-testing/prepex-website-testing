
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { WhiteModal } from "@/components/ui/WhiteModal";
import { RadioOption } from "@/components/ui/RadioOption";
import { XIcon } from "@/components/ui/icons";
import {
  regeneratePlan,
  type RegenReason,
} from "@/lib/api/planner";

const REASONS: {
  id: string;
  label: string;
  regenReason: RegenReason;
}[] = [
  {
    id: "too-heavy",
    label: "Plan feels too heavy",
    regenReason: "TOO_HEAVY",
  },
  {
    id: "too-light",
    label: "Plan feels too light",
    regenReason: "TOO_LIGHT",
  },
  {
    id: "wrong-subjects",
    label: "Wrong subjects today",
    regenReason: "WRONG_SUBJECTS",
  },
  {
    id: "time-slots",
    label: "Time slots don't work",
    regenReason: "TIME_SLOTS",
  },
  {
    id: "fresh-take",
    label: "Just want a fresh take",
    regenReason: "FRESH_TAKE",
  },
];

type RegeneratePlanModalProps = {
  open: boolean;
  onClose: () => void;
  onRegenerated?: () => void;
};

export function RegeneratePlanModal({
  open,
  onClose,
  onRegenerated,
}: RegeneratePlanModalProps) {
  const [reasonId, setReasonId] = useState("too-heavy");
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegenerate = async () => {
    const selected = REASONS.find(
      (option) => option.id === reasonId,
    );

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
    <WhiteModal
      open={open}
      onClose={onClose}
      ariaLabel="Regenerate today's plan"
      panelClassName="
        sm:max-w-[488px]
        sm:px-8
        sm:py-8
      "
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <h2 className="min-w-0 text-[24px] font-semibold leading-[30px] text-ink">
          Regenerate today&apos;s plan?
        </h2>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="
            flex
            h-8
            w-8
            shrink-0
            items-center
            justify-center
            rounded-full
            text-muted
            transition-colors
            hover:bg-tint-strong
          "
        >
          <XIcon width={14} height={14} />
        </button>
      </div>

      {/* Subtitle */}
      <p className="mt-2 text-body-lg font-semibold leading-5 text-muted">
        Why? (optional, helps us improve)
      </p>

      {/* Reasons */}
      <div className="mt-6 flex w-full flex-col gap-3">
        {REASONS.map((option) => (
          <RadioOption
            key={option.id}
            name="regenerate-reason"
            value={option.id}
            label={option.label}
            selected={reasonId === option.id}
            onSelect={() => setReasonId(option.id)}
            compact
          />
        ))}
      </div>

      {/* Error */}
      {error && (
        <p className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}

      {/* Actions */}
      <div
        className="
          mt-8
          grid
          w-full
          grid-cols-2
          gap-3
          sm:grid-cols-[141px_271px]
        "
      >
        {/* Cancel */}
        <Button
          variant="secondary"
          size="sm"
          onClick={onClose}
          className="
            h-[54px]
            w-full
            rounded-lg
            px-6
            py-0
            text-body-lg
          "
        >
          Cancel
        </Button>

        {/* Regenerate */}
        <Button
          variant="primary"
          size="sm"
          onClick={handleRegenerate}
          disabled={isSubmitting}
          className="
            h-[54px]
            w-full
            rounded-xl
            px-6
            py-0
            text-[18px]
          "
        >
          {isSubmitting ? "Regenerating..." : "Regenerate"}
        </Button>
      </div>
    </WhiteModal>
  );
}

