"use client";

import { Lightbulb } from "@/assets/icons";
import { Button } from "@/components/ui/Button";
import { WhiteModal } from "@/components/ui/WhiteModal";
import { RefreshIcon, InfoIcon, PlusIcon, XIcon, PlusIcon1 } from "@/components/ui/icons";

const ALLOCATIONS = [
  { percent: 50, label: "Backlog clearing", caption: "Clearing pending chapters" },
  { percent: 30, label: "Revision", caption: "Strengthening what you know" },
  { percent: 20, label: "New learning", caption: "Moving forward steadily" },
];

type RecoveryModeModalProps = {
  open: boolean;
  onClose: () => void;
  onAddBacklogChapters?: () => void;
};

export function RecoveryModeModal({ open, onClose, onAddBacklogChapters }: RecoveryModeModalProps) {
  return (
    <WhiteModal
      open={open}
      onClose={onClose}
      ariaLabel="Recovery Mode"
      panelClassName="sm:w-full sm:max-w-[896px] sm:h-[813px] sm:max-h-[85vh] sm:rounded-[22px] sm:p-0 sm:overflow-y-auto"
    >
      {/* Header */}
      <div className="flex w-full items-center justify-between gap-3 px-4 pt-5 sm:h-7 sm:w-full sm:px-6 sm:pt-10">
        <span className="flex h-7 w-[167px] shrink-0 items-center gap-2 rounded-lg bg-(--sidebar-active-bg) px-4 py-1.5 text-(--sidebar-active-fg)">
          <RefreshIcon className="h-3.5 w-3.5 shrink-0" />

          <span className="h-4 w-[113px] shrink-0 whitespace-nowrap text-xs leading-4 font-bold tracking-[0.6px] uppercase">
            Recovery Mode
          </span>
        </span>


        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-tint-strong"
        >
          <XIcon className="h-6 w-6" />
        </button>
      </div>

      {/* Main content */}
      <div className="mt-5 w-full px-4 sm:mt-6 sm:px-6">
        {/* Heading */}
        <h2 className="mt-3 w-full text-2xl leading-[30px] font-bold text-modal-text sm:h-[35px] sm:w-full sm:text-[28px] sm:leading-[35px]">
          Want to enter Backlog Recovery Mode?
        </h2>

        {/* Subtext */}
        <p className="mt-2 w-full text-[14px] leading-[18px] font-semibold text-modal-subtext sm:h-5 sm:w-full sm:text-base sm:leading-4">
          For the next 7 days, your plans will shift to
        </p>

        {/* Allocation cards */}
        <div className="mt-3 grid w-full grid-cols-1 gap-3 py-5 sm:grid-cols-3 sm:gap-6 sm:py-7">
          {ALLOCATIONS.map((item) => (
            <div
              key={item.label}
              className="flex min-w-0 w-full flex-col rounded-xl border border-brand/10 p-4 sm:h-[146px] sm:p-6"
            >
              {/* Percentage + label */}
              <div className="h-auto w-full pb-3 sm:h-[56px] sm:pb-4">
                <div className="flex min-w-0 w-full items-end">
                  {/* Percentage */}
                  <p className="shrink-0 text-[28px] leading-8 font-extrabold text-modal-text sm:h-10 sm:w-[77px] sm:text-[32px] sm:leading-10">
                    {item.percent}%
                  </p>

                  {/* Label */}
                  <div className="min-w-0 flex-1 pl-2 sm:h-[18px] sm:w-[121px] sm:flex-none">
                    <p className="whitespace-nowrap text-[13px] leading-4 font-semibold text-[#4B5563] dark:text-[#8B8998] sm:h-[18px] sm:w-[113px] sm:text-sm sm:leading-[18px]">
                      {item.label}
                    </p>
                  </div>
                </div>
              </div>

              {/* Range */}
              <div className="h-[22px] w-full pb-4">
                <div className="h-1.5 w-full rounded-full bg-tint-strong">
                  <div
                    className="h-1.5 rounded-full bg-modal-text"
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>

              {/* Caption */}
              <p className="w-full truncate whitespace-nowrap text-[13px] leading-4 font-semibold text-modal-subtext sm:h-[18px] sm:text-sm sm:leading-[18px]">
                {item.caption}
              </p>
            </div>
          ))}
        </div>

        {/* Info banner */}
        <div className="flex w-full items-center rounded-2xl border border-[#FFE8CC] bg-[#FEF8EF] px-5 py-4 sm:h-[80px] sm:px-6 dark:border-brand/10 dark:bg-surface">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#F59E0B] p-3">
            <Lightbulb className="h-6 w-6 shrink-0" />
          </span>

          <div className="min-w-0 flex-1 pl-4">
            <p className="w-full text-base leading-6 font-medium text-modal-text sm:text-lg sm:leading-[29.25px]">
              This way you clear backlog while keeping revisions and new learning on track.
            </p>
          </div>
        </div>

        {/* Add backlog chapters */}
        <div className="flex w-full flex-col gap-4 pt-4 pb-5 sm:gap-5 sm:pt-6 sm:pb-7">
          <p className="w-full text-sm leading-[18px] font-medium text-modal-subtext sm:h-5 sm:text-base sm:leading-5">
            Want to add chapters or topics you know are pending but haven&apos;t been
            in your plan yet?
          </p>

          <Button
            variant="secondary"
            size="sm"
            onClick={onAddBacklogChapters}
            className="inline-flex h-[54px] w-full max-w-[243px] shrink-0 items-center justify-center gap-2 rounded-xl border border-brand/10 px-4 py-3 sm:w-[243px] sm:max-w-none sm:px-6"
          >
            <PlusIcon1 className="h-7 w-[13px] shrink-0" />

            <span className="whitespace-nowrap text-center text-ink leading-6 font-bold">
              Add backlog chapters
            </span>
          </Button>
        </div>

        {/* Footer */}
        <div className="flex w-full flex-col gap-2 pb-3 sm:h-[129px] sm:gap-5 sm:pb-0">
          {/* Action row */}
          <div className="flex w-full flex-wrap items-center justify-center gap-4 border-t border-brand/10 pt-4 sm:h-[69px] sm:flex-nowrap sm:justify-end sm:gap-0">
            <button
              type="button"
              onClick={onClose}
              className="h-5 w-[65px] shrink-0 text-center text-sm leading-5 font-semibold text-ink transition-opacity hover:opacity-80 sm:text-base"
            >
              Not now
            </button>

            <div className="ml-0 h-[52px] w-full sm:ml-8 sm:h-[52px] sm:w-[252px]">
              <Button
                variant="primary"
                size="sm"
                onClick={onClose}
                className="h-[52px] w-full rounded-xl px-4 py-4 sm:w-[252px] sm:px-10"
              >
                <span className="whitespace-nowrap">
                  Yes, recover for 7 days
                </span>
              </Button>
            </div>
          </div>

          {/* Helper text */}
          <p className="h-6 w-full text-center text-sm leading-6 font-medium text-modal-subtext sm:text-base">
            You can exit recovery mode anytime.
          </p>
        </div>
      </div>
    </WhiteModal>
  );
}