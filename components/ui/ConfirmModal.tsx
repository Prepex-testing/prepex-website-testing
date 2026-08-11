"use client";

import { WhiteModal } from "@/components/ui/WhiteModal";
import { Button } from "@/components/ui/Button";
import { AlertTriangleIcon } from "@/components/ui/icons";

type ConfirmModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
};

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
}: ConfirmModalProps) {
  return (
    <WhiteModal open={open} onClose={onClose} ariaLabel={title}>
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-bg text-danger">
          <AlertTriangleIcon />
        </span>
        <h2 className="text-h2 text-ink">{title}</h2>
        <p className="text-sm text-muted">{description}</p>
      </div>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
        <Button variant="secondary" className="sm:flex-1" onClick={onClose}>
          {cancelLabel}
        </Button>
        <Button
          variant="secondary"
          className="border-danger text-danger sm:flex-1"
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </div>
    </WhiteModal>
  );
}
