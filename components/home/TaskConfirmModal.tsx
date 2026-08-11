"use client";

import { useEffect, useState } from "react";
import { WhiteModal } from "@/components/ui/WhiteModal";
import { Button } from "@/components/ui/Button";
import { AlertTriangleIcon } from "@/components/ui/icons";
import { ConfirmIcon } from "@/assets/icons";
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
    moveToBacklog: moveToBacklogProp = false,
    onMoveToBacklogChange,
}: ConfirmModalProps) {
    const [moveToBacklog, setMoveToBacklog] = useState(moveToBacklogProp);

    // Resets the checkbox each time the modal reopens instead of carrying
    // over the previous confirmation's tick.
    useEffect(() => {
        if (open) setMoveToBacklog(moveToBacklogProp);
    }, [open, moveToBacklogProp]);

    const handleMoveToBacklogChange = (checked: boolean) => {
        setMoveToBacklog(checked);
        onMoveToBacklogChange?.(checked);
    };

    return (
        <WhiteModal open={open} onClose={onClose} ariaLabel={title}>
            <div className="mx-auto flex w-full max-w-[340px] flex-col items-center gap-2 text-center">
                {/* Header icon */}
                <div className="flex h-16 w-full items-center justify-center">
                    <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-[#F59E0B1A] text-[#F59E0B]">
                        <ConfirmIcon />
                    </div>
                </div>

                {/* Title */}
                <div className="flex h-12 w-full items-center justify-center pt-4">
                    <h2 className="h-8 w-[213px] text-[24px] font-extrabold leading-8 text-ink">
                        {title}
                    </h2>
                </div>

                {/* Subtitle */}
                {subtitle && (
                    <div className="flex h-5 w-full items-center justify-center">
                        <p className="h-5 max-w-full text-[14px] font-bold leading-5 text-ink">
                            {subtitle}
                        </p>
                    </div>
                )}

                {/* Description */}
                <div className="flex h-7 w-full items-start justify-center px-4 pt-2">
                    <p className="h-5 w-full max-w-[284px] text-center text-[12px] font-semibold leading-[14.4px] tracking-[0.24px] text-[#64748B] dark:text-(--text-secondary,#8B8998)">
                        {description}
                    </p>
                </div>

                {/* Move to Backlog */}
                <div className="flex w-full items-start justify-center pt-6">
                    <label className="flex min-h-5 w-auto max-w-full items-center gap-2">
                        <input
                            type="checkbox"
                            checked={moveToBacklog}
                            onChange={(event) =>
                                handleMoveToBacklogChange(event.target.checked)
                            }
                            className="h-4 w-4 shrink-0 cursor-pointer rounded border border-[#CBD5E1] bg-white checked:border-brand checked:bg-brand disabled:cursor-not-allowed disabled:opacity-40 dark:border-(--text-secondary,#8B8998) dark:bg-[#111145] dark:checked:border-brand dark:checked:bg-brand"
                        />

                        <span className="w-[166px] text-center text-[12px] font-semibold leading-4 text-[#475569] dark:text-(--text-secondary,#8B8998) sm:text-[14px] sm:leading-5">
                            Move to Backlog instead
                        </span>
                    </label>
                </div>


                {/* Buttons */}
                <div className="flex h-[90px] w-full items-start gap-4 pt-8 max-[399px]:h-auto max-[399px]:flex-col">
                    <Button
                        variant="secondary"
                        onClick={onClose}
                        className="h-[58px] w-[162px] rounded-lg border-[#E2E8F0] px-4 py-4 text-[16px] font-bold leading-6 max-[399px]:w-full dark:border-(--text-secondary,#8B8998)"
                    >
                        {cancelLabel}
                    </Button>

                    <Button
                        variant="danger"
                        onClick={onConfirm}
                        className="h-[58px] w-[162px] rounded-lg border-[#F59E0B] px-4 py-4 text-[16px] font-bold leading-6 text-[#F59E0B] max-[399px]:w-full"
                    >
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </WhiteModal>
    );
}
