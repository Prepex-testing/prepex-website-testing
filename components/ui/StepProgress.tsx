import Link from "next/link";
import { ArrowLeftIcon } from "@/components/ui/icons";

type StepProgressProps = {
  step: number;
  totalSteps: number;
  backHref?: string;
  showSkip?: boolean;
  skipHref?: string;
  onSkip?: () => void;
  skipDisabled?: boolean;
};

export function StepProgress({
  step,
  totalSteps,
  backHref,
  showSkip = false,
  skipHref,
  onSkip,
  skipDisabled = false,
}: StepProgressProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Back Button */}
      {backHref && (
        <Link
          href={backHref}
          aria-label="Go back"
          className="w-fit text-ink transition-colors hover:opacity-80"
        >
          <ArrowLeftIcon />
        </Link>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-bold uppercase leading-[15px] tracking-[2px] text-cta">
            Onboarding
          </span>

          <p className="text-[14px] font-extrabold leading-[20px] text-ink sm:text-[15px]">
            Step {step} of {totalSteps}
          </p>
        </div>

        {/* Skip Button */}
        {showSkip && onSkip && (
          <button
            type="button"
            onClick={onSkip}
            disabled={skipDisabled}
            className="
              pt-4
              text-[12px]
              font-semibold
              leading-[18px]
              text-muted
              transition-colors
              hover:text-ink
              disabled:cursor-not-allowed
              disabled:opacity-50
              sm:text-[13px]
              sm:leading-[19.5px]
            "
          >
            Skip
          </button>
        )}

        {/* Skip Link */}
        {showSkip && !onSkip && skipHref && (
          <Link
            href={skipHref}
            className="
              pt-4
              text-[12px]
              font-semibold
              leading-[18px]
              text-muted
              transition-colors
              hover:text-ink
              sm:text-[13px]
              sm:leading-[19.5px]
            "
          >
            Skip
          </Link>
        )}
      </div>

      {/* Progress Bar */}
      <div className="flex gap-1.5">
        {Array.from({ length: totalSteps }).map((_, index) => (
          <span
            key={index}
            className={`h-1 flex-1 rounded-full transition-colors ${
              index < step
                ? "bg-[linear-gradient(90.08deg,#1A1A4E_0.48%,#4C1D95_99.05%)] dark:bg-ink dark:bg-none"
                : "bg-brand/10 dark:bg-ink/15"
            }`}
          />
        ))}
      </div>
    </div>
  );
}