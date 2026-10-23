"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";

type OnboardingNavProps = {
  /** Where Back goes. Leave out on the first screen, which has no Back. */
  backHref?: string;
  nextLabel?: string;
  onNext: () => void;
  /** Next stays off until the screen is valid; `hint` says what is missing. */
  nextDisabled?: boolean;
  hint?: ReactNode;
  busy?: boolean;
  /** Pins the row to the bottom of the screen on long pages, so Next is always in thumb reach. */
  sticky?: boolean;
  className?: string;
};

/**
 * The Back / Next row every onboarding screen ends with. Back is a plain link (the answers are already saved
 * on the device, so going back loses nothing); Next is disabled until the screen is valid and says why.
 */
export function OnboardingNav({
  backHref,
  nextLabel = "Next",
  onNext,
  nextDisabled = false,
  hint,
  busy = false,
  sticky = false,
  className = "",
}: OnboardingNavProps) {
  return (
    <div
      className={`${sticky ? "sticky bottom-0 z-20 -mx-6 mt-6 border-t border-brand/10 bg-surface px-6 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:-mx-12 sm:px-12 dark:border-white/10" : "mt-6"} ${className}`}
    >
      {hint && (
        <p role="status" aria-live="polite" className="mb-2 text-center text-[13px] font-medium text-muted">
          {hint}
        </p>
      )}
      <div className="flex gap-3">
        {backHref && (
          <Button href={backHref} variant="secondary" className="w-28 shrink-0">
            Back
          </Button>
        )}
        <Button
          variant="primary"
          onClick={onNext}
          disabled={nextDisabled || busy}
          className="flex-1 disabled:cursor-not-allowed"
          data-testid="onboarding-next"
        >
          {busy ? "Saving…" : nextLabel}
        </Button>
      </div>
    </div>
  );
}
