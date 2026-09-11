"use client";

import { Button } from "@/components/ui/Button";
import { WhiteModal } from "@/components/ui/WhiteModal";
import { XIcon } from "@/components/ui/icons";

type LeaveSessionModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** Shown away from the session page (e.g. while reviewing resources) — returns to it. */
  onBackToSession?: () => void;
};

export function LeaveSessionModal({ open, onClose, onConfirm, onBackToSession }: LeaveSessionModalProps) {
  return (
    <WhiteModal open={open} onClose={onClose} ariaLabel="Leave focus session">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-h2 text-ink">Leave this session?</h2>
          <p className="mt-1 text-sm text-muted">
            Your progress so far will be saved, but the session won&apos;t be marked complete.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-tint-strong"
        >
          <XIcon />
        </button>
      </div>

      {onBackToSession ? (
        <div className="mt-6 flex flex-col gap-2">
          <Button variant="primary" onClick={onBackToSession}>
            Back to session
          </Button>
          <Button
            variant="secondary"
            className="border-[#F59E0B]! text-[#F59E0B]! hover:bg-[#F59E0B33]!"
            onClick={onConfirm}
          >
            Yes, leave session
          </Button>
          <button
            type="button"
            onClick={onClose}
            className="mt-1 w-full text-center text-sm font-semibold text-muted transition-colors hover:text-ink"
          >
            Stay on this page
          </button>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-2">
          <Button variant="primary" onClick={onConfirm}>
            Yes, leave session
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Stay on this page
          </Button>
        </div>
      )}
    </WhiteModal>
  );
}
