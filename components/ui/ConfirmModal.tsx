"use client";

import { WhiteModal } from "@/components/ui/WhiteModal";
import { Button } from "@/components/ui/Button";
import { ConfirmIcon } from "@/assets/icons";

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
      <div className="mx-auto flex w-full max-w-[340px] flex-col items-center text-center">
        {/* Header Icon — 340 × 64 */}
        <div className="flex h-16 w-full shrink-0 items-center justify-center">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-[#F59E0B1A] text-[#F59E0B]">
            <ConfirmIcon />
          </div>
        </div>

        {/* Title — 340 × auto */}
        <div className="flex min-h-8 w-full items-start justify-center pt-4">
          <h2 className="w-full max-w-[340px] text-[24px] font-extrabold leading-8 text-ink">
            {title}
          </h2>
        </div>

        {/* Description — 340 × auto */}
        <div className="flex w-full items-start justify-center px-4 pt-2">
          <p className="w-full max-w-[284px] text-center text-[12px] font-semibold leading-[14.4px] tracking-[0.24px] text-[#64748B] dark:text-[var(--text-secondary)]">
            {description}
          </p>
        </div>

        {/* Buttons — 340 × 90 */}
        <div className="flex h-[90px] w-full shrink-0 items-start gap-4 pt-8 max-[399px]:h-auto max-[399px]:flex-col">
          {/* Cancel */}
          <Button variant="secondary" className="sm:flex-1" onClick={onClose}>

            {cancelLabel}

          </Button>

          {/* Confirm */}
          <Button

            variant="primary"

            className="border-danger sm:flex-1"

            onClick={onConfirm}

          >

            {confirmLabel}

          </Button>
        </div>
      </div>
    </WhiteModal>
  );
}