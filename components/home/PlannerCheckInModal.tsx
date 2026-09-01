"use client";

import { useState } from "react";
import { WhiteModal } from "@/components/ui/WhiteModal";
import { Button } from "@/components/ui/Button";
import { RadioOption } from "@/components/ui/RadioOption";
import { XIcon } from "@/components/ui/icons";
import {
  respondToDisengagementInquiry,
  type DisengagementResponse,
} from "@/lib/api/checkin";

const OPTIONS: { id: DisengagementResponse; label: string }[] = [
  { id: "WORKING_WELL", label: "It's working well, just a tough week" },
  { id: "PLANS_OFF", label: "Plans feel off — too much/too little" },
  { id: "TOPICS_WRONG", label: "Topics aren't right for me" },
  { id: "MOTIVATION", label: "I'm losing motivation" },
  { id: "NEED_TO_TALK", label: "I need to talk to someone" },
];

type PlannerCheckInModalProps = {
  open: boolean;
  inquiryId: string | null;
  onClose: () => void;
  /** Called with the server's follow-up action code (Section 4.4.3). */
  onResolved: (actionTaken: string) => void;
};

/**
 * Section 4.4.2 — the soft-inquiry card. Also the burnout Tier 2 response
 * (Section 4.2.2), which shares this exact card. A card, not a notification.
 */
export function PlannerCheckInModal({
  open,
  inquiryId,
  onClose,
  onResolved,
}: PlannerCheckInModalProps) {
  const [choice, setChoice] = useState<DisengagementResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (response: DisengagementResponse) => {
    if (!inquiryId) {
      onClose();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { data } = await respondToDisengagementInquiry(inquiryId, response);
      onResolved(data.actionTaken);
    } catch {
      setError("Couldn't send that. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <WhiteModal
      open={open}
      onClose={onClose}
      ariaLabel="Quick check-in"
      panelClassName="sm:max-w-[460px] sm:px-8 sm:py-8"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[22px] font-semibold leading-7 text-ink">
            Quick check-in
          </h2>
          <p className="mt-1 text-[13px] font-semibold text-muted">
            This is just for you. How&apos;s the planner working for you?
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-tint-strong"
        >
          <XIcon width={14} height={14} />
        </button>
      </div>

      <div className="mt-6 flex w-full flex-col gap-3">
        {OPTIONS.map((option) => (
          <RadioOption
            key={option.id}
            name="planner-check-in"
            value={option.id}
            label={option.label}
            selected={choice === option.id}
            onSelect={() => setChoice(option.id)}
            compact
          />
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <div className="mt-8 grid w-full grid-cols-2 gap-3">
        <Button
          variant="secondary"
          size="sm"
          className="h-[54px] w-full rounded-lg px-6 text-body-lg"
          onClick={() => submit("SKIPPED")}
          disabled={busy}
        >
          Skip for now
        </Button>
        <Button
          variant="primary"
          size="sm"
          className="h-[54px] w-full rounded-xl px-6 text-[18px]"
          onClick={() => choice && submit(choice)}
          disabled={busy || !choice}
        >
          {busy ? "Sending..." : "Tell us"}
        </Button>
      </div>
    </WhiteModal>
  );
}
