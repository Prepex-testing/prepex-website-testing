"use client";

import { WhiteModal } from "@/components/ui/WhiteModal";
import { Button } from "@/components/ui/Button";
import type { GoalCompletionStatus } from "@/lib/api/partner";

const OPTIONS: { status: GoalCompletionStatus; label: string }[] = [
  { status: "NOT_COMPLETE", label: "Not complete" },
  { status: "PARTIAL", label: "Partially complete" },
  { status: "COMPLETE", label: "Complete" },
];

type GoalReflectionModalProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (status: GoalCompletionStatus) => void;
  goal?: string | null;
  isSubmitting?: boolean;
};

/** PRD 6.6.2 — Friday "Goal hit?" check-in. Reflects on the caller's own goal only. */
export function GoalReflectionModal({
  open,
  onClose,
  onSelect,
  goal,
  isSubmitting,
}: GoalReflectionModalProps) {
  return (
    <WhiteModal open={open} onClose={onClose} ariaLabel="Goal hit?">
      <div className="text-center">
        <h2 className="text-h1 text-ink">Goal Hit?</h2>
        {goal && <p className="mt-2 text-sm text-muted">&quot;{goal}&quot;</p>}
        <p className="mt-1 text-xs text-muted">This is shared with your partner.</p>
      </div>
      <div className="mt-6 flex flex-col gap-2">
        {OPTIONS.map((option) => (
          <Button
            key={option.status}
            variant="secondary"
            onClick={() => onSelect(option.status)}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving…" : option.label}
          </Button>
        ))}
      </div>
    </WhiteModal>
  );
}
