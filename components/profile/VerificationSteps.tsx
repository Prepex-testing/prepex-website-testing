import { CheckCircleIcon, ClockIcon } from "@/components/ui/icons";

/**
 * Icon frame: 48×48 tile in a 64px column (16px right padding) with a 24×24
 * icon drawn at a 2.67px line from md, per Figma; 36px tile, 20px icon and a
 * 2px line on phones. The line width is forced because the two icons were
 * drawn on 18px and 14px grids.
 */
const ICON_COLUMN = "flex w-12 shrink-0 items-center pr-3 md:w-16 md:pr-4";
const ICON_TILE =
  "flex h-9 w-9 items-center justify-center md:h-12 md:w-12 [&_svg]:h-5 [&_svg]:w-5 md:[&_svg]:h-6 md:[&_svg]:w-6 **:stroke-2 md:**:stroke-[2.67px] **:[vector-effect:non-scaling-stroke]";

/** Step box: 82px tall with 16px padding from md (Figma), a step smaller on phones. */
const STEP_BOX = "flex min-h-[68px] min-w-0 items-center rounded-xl border p-3 md:min-h-[82px] md:flex-1 md:p-4";
const STEP_TITLE = "font-sans text-[13px] font-medium leading-none tracking-normal md:text-[14px]";
const STEP_SUBTITLE = "mt-1.5 font-sans text-[11px] font-normal leading-none tracking-normal md:text-[12px]";

/** Dotted connector with an arrowhead, pointing to the Verified step. */
function DotArrow({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 55 16" fill="none" aria-hidden="true" className={className}>
      <path d="M2 8h41" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="0.01 5" />
      <path d="M46 4.5 49.5 8 46 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Parent-connection progress: Pending → Verified (PRD 13.2).
 *
 * Figma panel: 32px padding and gap, a 16px semibold heading, then a row capped
 * at 672px with two 276.5px steps and a 119px connector. The row sits side by
 * side from md; below that the steps stack with a downward connector, and the
 * padding, type and icons step down so it reads cleanly on a 320px phone.
 */
export function VerificationSteps({ verified }: { verified: boolean }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-brand/10 p-4 sm:gap-6 sm:p-6 lg:gap-8 lg:p-8">
      <p className="font-sans text-[14px] font-semibold leading-none tracking-normal text-ink sm:text-[16px]">
        Verification status
        {!verified && <span className="font-medium text-muted"> (preview)</span>}
      </p>

      <div className="flex w-full max-w-[672px] flex-col md:flex-row md:items-center md:justify-between">
        {/* Pending */}
        <div
          className={`${STEP_BOX} border-[#E0E7FF] bg-[#EEF0F8] dark:border-(--text-secondary,#8B8998) dark:bg-(--border-card,#FAF7F214)`}
        >
          <span className={ICON_COLUMN}>
            <span className={`${ICON_TILE} text-ink`}>
              <ClockIcon />
            </span>
          </span>
          <div className="min-w-0">
            <p className={`${STEP_TITLE} text-ink`}>Pending</p>
            <p className={`${STEP_SUBTITLE} text-muted`}>Invitation sent to parent</p>
          </div>
        </div>

        {/* Connector — 119px with 32px side padding from lg, tighter at md,
            and a short downward arrow between the stacked steps on phones. */}
        <span className="flex h-7 items-center justify-center text-muted md:hidden" aria-hidden="true">
          <DotArrow className="h-4 w-8 rotate-90" />
        </span>
        <span className="hidden h-4 w-20 shrink-0 items-center px-4 text-muted md:flex lg:w-[119px] lg:px-8" aria-hidden="true">
          <DotArrow className="h-4 w-full" />
        </span>

        {/* Verified */}
        <div className={`${STEP_BOX} border-success/30 bg-success-bg`}>
          <span className={ICON_COLUMN}>
            <span className={`${ICON_TILE} text-success`}>
              <CheckCircleIcon />
            </span>
          </span>
          <div className="min-w-0">
            <p className={`${STEP_TITLE} text-success`}>Verified</p>
            <p className={`${STEP_SUBTITLE} text-success/80`}>Updates will start automatically</p>
          </div>
        </div>
      </div>
    </div>
  );
}
