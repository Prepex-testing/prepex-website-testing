"use client";

import { useState } from "react";
import { WhiteModal } from "@/components/ui/WhiteModal";
import { Button } from "@/components/ui/Button";
import { InfoIcon2 } from "@/components/ui/icons";

type BurnoutSignalModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Short non-alarmist lines describing what the app noticed (Section 4.7 — never say "burnout"). */
  signalText: string[];
  /** Optional lead-in sentence above the bullet list. */
  intro?: string;
  primaryLabel: string;
  onPrimary: () => void | Promise<void>;
  secondaryLabel?: string;
};

/**
 * Generic burnout tier pop-up (Section 4.2.2). Used for:
 *  - Tier 3 "Recovery Week suggested" — primary opts in, secondary dismisses.
 *  - Tier 4 "Recovery Week activated" — informational, primary views the plan.
 */
export function BurnoutSignalModal({
  open,
  onClose,
  title,
  signalText,
  intro,
  primaryLabel,
  onPrimary,
  secondaryLabel,
}: BurnoutSignalModalProps) {
  const [busy, setBusy] = useState(false);

  const handlePrimary = async () => {
    setBusy(true);
    try {
      await onPrimary();
    } finally {
      setBusy(false);
    }
  };

  return (
    <WhiteModal open={open} onClose={onClose} ariaLabel={title}>
      <div className="mx-auto flex w-full max-w-[360px] flex-col items-center text-center">
        <div className="flex h-16 w-full shrink-0 items-center justify-center">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-[#F59E0B1A] text-[#F59E0B]">
            <InfoIcon2 size={24} />
          </div>
        </div>

        <div className="flex min-h-8 w-full items-start justify-center pt-4">
          <h2 className="w-full text-[22px] font-extrabold leading-7 text-ink">{title}</h2>
        </div>

        {intro && (
          <p className="w-full px-2 pt-2 text-center text-[13px] font-semibold leading-5 text-[#64748B] dark:text-[var(--text-secondary)]">
            {intro}
          </p>
        )}

        {signalText.length > 0 && (
          <ul className="mt-3 flex w-full flex-col gap-2 rounded-xl bg-tint px-4 py-3 text-left">
            {signalText.map((line) => (
              <li
                key={line}
                className="flex gap-2 text-[13px] font-medium leading-5 text-ink"
              >
                <span aria-hidden className="text-[#F59E0B]">
                  •
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex w-full flex-col gap-3 pt-8">
          <Button variant="primary" className="w-full" onClick={handlePrimary} disabled={busy}>
            {primaryLabel}
          </Button>
          {secondaryLabel && (
            <button
              type="button"
              onClick={onClose}
              className="text-[14px] font-semibold text-muted transition-opacity hover:opacity-80"
            >
              {secondaryLabel}
            </button>
          )}
        </div>
      </div>
    </WhiteModal>
  );
}
