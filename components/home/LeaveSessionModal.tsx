"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { XIcon } from "@/components/ui/icons";

type LeaveSessionModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function LeaveSessionModal({ open, onClose, onConfirm }: LeaveSessionModalProps) {
  return (
    <Modal open={open} onClose={onClose} ariaLabel="Leave focus session">
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

      <div className="mt-6 flex flex-col gap-2">
        <Button variant="primary" onClick={onConfirm}>
          Yes, leave session
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Stay on this page
        </Button>
      </div>
    </Modal>
  );
}
