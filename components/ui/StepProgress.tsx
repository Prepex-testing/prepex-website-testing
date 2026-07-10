import Link from "next/link";
import { ArrowLeftIcon } from "@/components/ui/icons";

type StepProgressProps = {
  step: number;
  totalSteps: number;
  backHref?: string;
  showSkip?: boolean;
  skipHref?: string;
};

export function StepProgress({
  step,
  totalSteps,
  backHref,
  showSkip = false,
  skipHref,
}: StepProgressProps) {
  return (
    <div className="flex flex-col gap-2">
      {backHref && (
        <Link href={backHref} aria-label="Go back" className="w-fit text-ink">
          <ArrowLeftIcon />
        </Link>
      )}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-cta">
          Onboarding
        </span>
        {showSkip && skipHref && (
          <Link
            href={skipHref}
            className="text-xs font-semibold text-muted hover:text-ink"
          >
            Skip
          </Link>
        )}
      </div>
      <p className="text-sm font-bold text-ink">
        Step {step} of {totalSteps}
      </p>
      <div className="flex gap-1.5">
        {Array.from({ length: totalSteps }).map((_, index) => (
          <span
            key={index}
            className={`h-1.5 flex-1 rounded-full ${
              index < step ? "bg-brand" : "bg-brand/10"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
