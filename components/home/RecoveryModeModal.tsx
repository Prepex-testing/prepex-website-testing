"use client";

import { Button } from "@/components/ui/Button";
import { WhiteModal } from "@/components/ui/WhiteModal";
import { RefreshIcon, InfoIcon, PlusIcon, XIcon } from "@/components/ui/icons";

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
    <WhiteModal open={open} onClose={onClose} ariaLabel="Recovery Mode">
      <div className="flex items-start justify-between gap-3">
        <span className="flex items-center gap-1 rounded-full bg-tint-strong px-3 py-1 text-[10px] font-bold uppercase text-ink">
          <RefreshIcon />
          Recovery Mode
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-tint-strong"
        >
          <XIcon />
        </button>
      </div>

      <h2 className="mt-3 text-h2 text-ink">Want to enter Backlog Recovery Mode?</h2>
      <p className="mt-1 text-sm text-muted">
        For the next 7 days, your plans will shift to
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {ALLOCATIONS.map((item) => (
          <div key={item.label} className="rounded-xl border border-brand/10 p-3">
            <p className="text-lg font-extrabold text-ink">{item.percent}%</p>
            <p className="text-xs font-semibold text-ink">{item.label}</p>
            <div className="mt-2 h-1.5 rounded-full bg-tint-strong">
              <div
                className="h-1.5 rounded-full bg-brand"
                style={{ width: `${item.percent}%` }}
              />
            </div>
            <p className="mt-1 text-[10px] text-muted">{item.caption}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-xl bg-tint-strong p-3">
        <span className="mt-0.5 text-ink">
          <InfoIcon />
        </span>
        <p className="text-xs text-ink">
          This way you clear backlog while keeping revisions and new learning on track.
        </p>
      </div>

      <div className="mt-4">
        <p className="text-xs text-muted">
          Want to add chapters or topics you know are pending but haven&apos;t been in your
          plan yet?
        </p>
        <Button variant="secondary" size="sm" className="mt-2" onClick={onAddBacklogChapters}>
          <PlusIcon />
          Add backlog chapters
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-4 border-t border-brand/10 pt-4">
        <button type="button" onClick={onClose} className="text-sm font-semibold text-ink">
          Not now
        </button>
        <Button variant="primary" size="sm" onClick={onClose}>
          Yes, recover for 7 days
        </Button>
      </div>

      <p className="mt-3 text-center text-xs text-muted">
        You can exit recovery mode anytime.
      </p>
    </WhiteModal>
  );
}
