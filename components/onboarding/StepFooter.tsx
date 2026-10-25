"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type StepFooterProps = {
  /** Where Back goes (a link: the answers are already saved on the device, so going back loses nothing). */
  backHref?: string;
  /** Back as an action instead of a link, for a screen that has to do something first. Leave both out on the first screen. */
  onBack?: () => void;
  nextLabel?: string;
  onNext: () => void;
  /** Next stays off until the screen is valid; `hint` says what is missing. */
  nextDisabled?: boolean;
  hint?: ReactNode;
  busy?: boolean;
  /** Pins the row to the bottom of the screen on long pages, so Next is always in thumb reach. */
  sticky?: boolean;
  nextTestId?: string;
  className?: string;
};

// Every onboarding screen ends with this row, so the sizes live here and nowhere else. The buttons are plain
// elements on purpose: a shared Button that is `w-full` by default let Back swallow the row and squash Next.
const BUTTON =
  "inline-flex min-h-14 items-center justify-center rounded-xl text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] disabled:cursor-not-allowed";
// Back is 120px wide where there is room and 96px on the narrowest phones, so Next always has the larger share of the row.
const BACK = `${BUTTON} min-w-[96px] shrink-0 px-4 min-[380px]:min-w-[120px] min-[380px]:px-6 border border-brand/25 bg-transparent text-body-text hover:bg-tint-strong disabled:opacity-60 dark:border-white/25 dark:text-ink`;
const NEXT = `${BUTTON} min-w-0 flex-1 px-6 border border-primary-button-border bg-cta text-white hover:bg-[#E8623F] active:bg-[#D9552F] disabled:border-primary-button-disabled-bg disabled:bg-primary-button-disabled-bg disabled:text-primary-button-disabled-text disabled:hover:bg-primary-button-disabled-bg`;

/**
 * The Back / Next row. Back is a quiet outlined button of fixed width; Next is the filled one and takes all the
 * room that is left, so the primary action is always the biggest thing in reach. Both are at least 56px tall.
 */
export function StepFooter({
  backHref,
  onBack,
  nextLabel = "Next",
  onNext,
  nextDisabled = false,
  hint,
  busy = false,
  sticky = false,
  nextTestId = "onboarding-next",
  className = "",
}: StepFooterProps) {
  return (
    <div
      data-testid="step-footer"
      className={`${sticky ? "sticky bottom-0 z-20 -mx-6 mt-6 border-t border-brand/10 bg-surface px-6 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:-mx-12 sm:px-12 dark:border-white/10" : "mt-6"} ${className}`}
    >
      {hint && (
        <p role="status" aria-live="polite" className="mb-2 text-center text-[13px] font-medium text-muted">
          {hint}
        </p>
      )}
      <div className="flex flex-row gap-3">
        {backHref && (
          <Link href={backHref} className={BACK} data-testid="onboarding-back">
            Back
          </Link>
        )}
        {!backHref && onBack && (
          <button type="button" onClick={onBack} disabled={busy} className={BACK} data-testid="onboarding-back">
            Back
          </button>
        )}
        <button type="button" onClick={onNext} disabled={nextDisabled || busy} className={NEXT} data-testid={nextTestId}>
          {busy ? "Saving…" : nextLabel}
        </button>
      </div>
    </div>
  );
}
