"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { WhiteModal } from "@/components/ui/WhiteModal";
import { CheckCircleIcon, ChevronDownIcon, XIcon } from "@/components/ui/icons";
import type { PartnerSummary } from "@/lib/api/partner";

// Describes how matching works in general — not per-match reasoning (the API
// doesn't return a reason breakdown for a specific match, only the result).
const MATCHING_CRITERIA = [
  "Same exam target — required for every match",
  "Similar daily hours and exam date",
  "Similar streak pattern (both consistent, or both rebuilding)",
];

type PartnerMatchModalProps = {
  open: boolean;
  onClose: () => void;
  onAccept: () => void;
  onDecline: () => void;
  partner: PartnerSummary | null;
  isSubmitting?: boolean;
  /** PRD 6.2.4 — declines are capped at 2 lifetime attempts. */
  declinesRemaining?: number;
};

export function PartnerMatchModal({
  open,
  onClose,
  onAccept,
  onDecline,
  partner,
  isSubmitting,
  declinesRemaining,
}: PartnerMatchModalProps) {
  const [showReasons, setShowReasons] = useState(true);

  return (
    <WhiteModal open={open} onClose={onClose} ariaLabel="We found a partner for you">
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
          {partner?.fullName?.trim()?.[0]?.toUpperCase() ?? "?"}
        </span>
        <div>
          <p className="text-h2 text-ink">{partner?.fullName ?? "—"}</p>
          <p className="text-sm text-muted">
            {partner?.city ? `from ${partner.city}` : "Location hidden"}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col divide-y divide-brand/10">
        <div className="py-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
            Targeting
          </p>
          <p className="text-sm font-bold text-ink">{partner?.examName ?? "—"}</p>
        </div>
        <div className="py-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
            Streak
          </p>
          <p className="text-sm font-bold text-ink">
            {partner ? `${partner.streak} day${partner.streak === 1 ? "" : "s"}` : "—"}
          </p>
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
          {MATCHING_CRITERIA.map((reason) => (
            <p key={reason} className="flex items-start gap-2 text-xs text-ink">
              <CheckCircleIcon />
              {reason}
            </p>
          ))}
        </div>
      )}

      <div className="mt-5 flex items-center gap-3">
        <div className="flex-1">
          <Button variant="secondary" onClick={onDecline} disabled={isSubmitting}>
            Decline &amp; Rematch
          </Button>
        </div>
        <div className="flex-1">
          <Button variant="primary" onClick={onAccept} disabled={isSubmitting}>
            Accept Partner
          </Button>
        </div>
      </div>

      {declinesRemaining !== undefined && (
        <p className="mt-3 text-center text-xs text-muted">
          {declinesRemaining > 0
            ? `${declinesRemaining} decline${declinesRemaining === 1 ? "" : "s"} left before matching needs a manual review.`
            : "This was your last decline — further matches need a manual review."}
        </p>
      )}
    </WhiteModal>
  );
}
