"use client";

import { Modal } from "@/components/ui/Modal";
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
  subtitle?: string;
  showBacklogCheckbox?: boolean;
  moveToBacklog?: boolean;
  onMoveToBacklogChange?: (checked: boolean) => void;
};

export function TaskConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  subtitle,
  showBacklogCheckbox = false,
  moveToBacklog = false,
  onMoveToBacklogChange,
}: ConfirmModalProps) {
  return (
    <Modal open={open} onClose={onClose} ariaLabel={title}>
      <div className="mx-auto flex w-full max-w-[340px] flex-col items-center text-center">
        {/* Header icon */}
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-danger-bg text-danger">
          <AlertTriangleIcon />
        </div>

        {/* Title */}
        <div className="flex h-12 w-full items-center justify-center pt-4">
          <h2 className="text-[24px] font-extrabold leading-8 text-ink">
            {title}
          </h2>
        </div>

        {/* Subtitle */}
        {subtitle && (
          <div className="flex h-5 w-full items-center justify-center">
            <p className="text-[14px] font-bold leading-5 text-muted">
              {subtitle}
            </p>
          </div>
        )}

        {/* Description */}
        <div className="flex min-h-7 w-full items-start justify-center px-4 pt-2">
          <p className="text-center text-[12px] font-semibold leading-[14.4px] tracking-[0.24px] text-muted">
            {description}
          </p>
        </div>

        {/* Move to Backlog */}
        {showBacklogCheckbox && (
          <div className="flex h-11 w-full items-start pt-6">
            <label className="flex h-5 items-center gap-2 pl-2">
              <input
                type="checkbox"
                checked={moveToBacklog}
                onChange={(event) =>
                  onMoveToBacklogChange?.(event.target.checked)
                }
                className="h-4 w-4 cursor-pointer rounded border border-input-border accent-brand disabled:cursor-not-allowed"
              />

              <span className="text-[14px] font-semibold leading-5 text-body-text">
                Move to Backlog instead
              </span>
            </label>
          </div>
        )}

        {/* Buttons */}
        <div className="flex w-full flex-col gap-3 pt-8 sm:flex-row sm:gap-4">
          <Button
            variant="secondary"
            onClick={onClose}
            className="h-[58px] w-full rounded-lg px-4 py-4 text-[16px] font-bold leading-6 sm:w-[162px]"
          >
            {cancelLabel}
          </Button>

          <Button
            variant="secondary"
            onClick={onConfirm}
            className="h-[58px] w-full rounded-lg border-danger px-4 py-4 text-[16px] font-bold leading-6 text-danger sm:w-[162px]"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}