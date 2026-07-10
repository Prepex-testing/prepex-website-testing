"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { CheckCircleIcon, ChevronDownIcon, XIcon } from "@/components/ui/icons";

const MATCH_REASONS = [
  "Same Targeting: JEE Main + Advanced",
  "Daily Hours Overlap: 6-7 hrs ≈ Yours: 6 hrs",
  "Time Window Overlap: Evening + Night",
];

type PartnerMatchModalProps = {
  open: boolean;
  onClose: () => void;
  onAccept: () => void;
};

export function PartnerMatchModal({ open, onClose, onAccept }: PartnerMatchModalProps) {
  const [showReasons, setShowReasons] = useState(true);

  return (
    <Modal open={open} onClose={onClose} ariaLabel="We found a partner for you">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold text-muted">We found a partner for you</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-tint-strong"
        >
          <XIcon />
        </button>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand text-lg font-bold text-white">
          R
        </span>
        <div>
          <p className="text-h2 text-ink">Priya Sharma</p>
          <p className="text-sm text-muted">from Maharashtra</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col divide-y divide-brand/10">
        <div className="py-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
            Targeting
          </p>
          <p className="text-sm font-bold text-ink">JEE Main + Advanced</p>
        </div>
        <div className="py-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
            Daily Hours
          </p>
          <p className="text-sm font-bold text-ink">6–7 hours</p>
        </div>
        <div className="py-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
            Streak
          </p>
          <p className="text-sm font-bold text-ink">3 days • returning after a 7-day gap</p>
        </div>
        <div className="py-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
            Compatibility
          </p>
          <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-brand bg-tint-strong px-3 py-1 text-xs font-semibold text-ink">
            <CheckCircleIcon />
            Strong Match
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowReasons((value) => !value)}
        className="mt-3 flex items-center gap-1 text-sm font-semibold text-ink"
      >
        Why this match?
        <ChevronDownIcon
          className={`h-4 w-4 transition-transform ${showReasons ? "" : "-rotate-90"}`}
        />
      </button>

      {showReasons && (
        <div className="mt-2 flex flex-col gap-2 rounded-xl bg-tint-strong p-3">
          {MATCH_REASONS.map((reason) => (
            <p key={reason} className="flex items-start gap-2 text-xs text-ink">
              <CheckCircleIcon />
              {reason}
            </p>
          ))}
        </div>
      )}

      <div className="mt-5 flex items-center gap-3">
        <div className="flex-1">
          <Button variant="secondary" onClick={onClose}>
            Decline &amp; Rematch
          </Button>
        </div>
        <div className="flex-1">
          <Button variant="primary" onClick={onAccept}>
            Accept Partner
          </Button>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-muted">
        2 declines left before we pause matching for a week.
        <br />
        This keeps the pool fair for everyone.
      </p>
    </Modal>
  );
}
