"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { WhiteModal } from "@/components/ui/WhiteModal";
import { CheckCircleIcon, ChevronDownIcon, PracticeBenefitCheck, XIcon } from "@/components/ui/icons";
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
  // Collapsed by default — the reasons panel is opt-in.
  const [showReasons, setShowReasons] = useState(false);

  return (
    <WhiteModal
      open={open}
      onClose={onClose}
      ariaLabel="We found a partner for you"
      // Tighter side padding than the shared default (p-5 / sm:p-8) so the
      // content sits closer to the panel edges.
      panelClassName="px-4 sm:max-w-md sm:px-5 sm:py-8 sm:pb-10"
    >
      <div className="relative flex w-full items-center gap-3 rounded-2xl py-2 sm:gap-4 sm:py-3 md:h-24 md:max-w-[603px]">
        {/* Partner Avatar */}
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#2D2E6E] text-[24px] font-bold leading-7 text-white sm:h-16 sm:w-16 sm:text-[28px] sm:leading-8 md:h-[72px] md:w-[72px] md:text-[32px] md:leading-9 dark:bg-[#FAF7F2] dark:text-[#111145]">
          {partner?.fullName?.trim()?.[0]?.toUpperCase() ?? "?"}
        </span>

        {/* Partner Information */}
        <div className="min-w-0 flex-1 pr-8 sm:pr-10">
          <p className="truncate font-[Plus_Jakarta_Sans] text-xs font-normal leading-4 tracking-normal text-muted sm:text-sm sm:leading-5 md:text-sm md:leading-5">
            We found a partner for you
          </p>

          <p className="truncate font-[Plus_Jakarta_Sans] text-2xl font-extrabold leading-8 tracking-normal text-ink sm:text-[28px] sm:leading-9 md:text-[32px] md:leading-10">
            {partner?.fullName ?? "—"}
          </p>

          <p className="truncate font-[Plus_Jakarta_Sans] text-sm font-normal leading-5 tracking-normal text-muted sm:text-base sm:leading-6 md:text-base md:leading-6">
            {partner?.city ? `from ${partner.city}` : "Location hidden"}
          </p>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-0 top-0 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-tint-strong sm:h-8 sm:w-8"
        >
          <XIcon className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>
      </div>
      <div className="mt-4 flex w-full flex-col sm:mt-5 md:max-w-[603px]">
        {/* Targeting */}
        <div className="flex w-full flex-col gap-0.5 border-b border-brand/10 pb-2.5 sm:gap-1 sm:pb-3">
          <p className="font-[Plus_Jakarta_Sans] text-[10px] font-bold uppercase leading-4 tracking-[1px] text-muted">
            Targeting
          </p>
          <p className="truncate font-[Plus_Jakarta_Sans] text-[15px] font-semibold leading-6 tracking-normal text-ink sm:text-[16px] md:text-[18px] md:leading-7">
            {partner?.examName ?? "—"}
          </p>
        </div>

        {/* Streak */}
        <div className="mt-2.5 flex w-full flex-col gap-0.5 border-b border-brand/10 pb-2.5 sm:mt-3 sm:gap-1 sm:pb-3">
          <p className="font-[Plus_Jakarta_Sans] text-[10px] font-bold uppercase leading-4 tracking-[1px] text-muted">
            Streak
          </p>
          <p className="truncate font-[Plus_Jakarta_Sans] text-[15px] font-semibold leading-6 tracking-normal text-ink sm:text-[16px] md:text-[18px] md:leading-7">
            {partner ? `${partner.streak} day${partner.streak === 1 ? "" : "s"}` : "—"}
          </p>
        </div>

        {/* Compatibility */}
        <div className="mt-2.5 flex w-full flex-col gap-1 sm:mt-3 sm:gap-1.5">
          <p className="font-[Plus_Jakarta_Sans] text-[10px] font-bold uppercase leading-4 tracking-[1px] text-muted">
            Compatibility
          </p>
          <div className="flex items-center">
            <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#1A1A4E] bg-[#EEF0F8] px-2.5 font-[Plus_Jakarta_Sans] text-[13px] font-bold leading-5 text-[#1A1A4E] sm:h-9 sm:gap-1.5 sm:px-3 sm:text-[14px] md:h-[46px] md:gap-2 md:px-4 md:text-[18px] md:leading-7 dark:bg-[#FAF7F2] dark:text-[#1A1A4E]">
              {/* The chip stays light in dark mode, so the icon keeps its
                  light-mode colors instead of the default dark-mode inversion. */}
              <PracticeBenefitCheck className="h-3 w-3 shrink-0 md:h-4 md:w-4 dark:[&_circle]:fill-[#1A1A4E] dark:[&_circle]:stroke-[#1A1A4E] dark:[&_path]:stroke-white" />
              Strong Match
            </span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowReasons((value) => !value)}
        aria-expanded={showReasons}
        className="mt-4 flex items-center gap-1.5 font-[Plus_Jakarta_Sans] text-[15px] font-bold leading-6 tracking-normal text-ink sm:mt-5 sm:text-[16px] md:text-[18px] md:leading-7"
      >
        Why this match?
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 transition-transform md:h-5 md:w-5 ${showReasons ? "" : "-rotate-90"}`}
        />
      </button>

      {showReasons && (
        <div className="mt-3 flex w-full flex-col gap-3 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 pb-4 pt-4 sm:gap-4 sm:px-5 sm:pb-5 sm:pt-6 md:max-w-[603px] dark:border-[#FAF7F214] dark:bg-[#FAF7F214]">
          {MATCHING_CRITERIA.map((reason) => (
            <p
              key={reason}
              className="flex items-start gap-2 font-[Plus_Jakarta_Sans] text-[14px] font-medium leading-5 tracking-normal text-ink sm:gap-2.5 sm:text-[15px] md:text-[16px] md:leading-6"
            >
              <PracticeBenefitCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 md:h-4 md:w-4" />
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
