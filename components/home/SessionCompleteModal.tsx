"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { CheckIcon, ClockIcon, CheckCircleIcon, StarIcon, XIcon } from "@/components/ui/icons";

type SessionCompleteModalProps = {
  open: boolean;
  onClose: () => void;
  onContinue: () => void;
  topic: string;
  minutesStudied: number;
  milestonesCompleted: number;
  milestonesTotal: number;
};

export function SessionCompleteModal({
  open,
  onClose,
  onContinue,
  topic,
  minutesStudied,
  milestonesCompleted,
  milestonesTotal,
}: SessionCompleteModalProps) {
  return (
    <Modal open={open} onClose={onClose} ariaLabel="Session Complete">
      <div className="relative text-center">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-0 top-0 flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-tint-strong"
        >
          <XIcon />
        </button>
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white">
          <CheckIcon />
        </span>
        <h2 className="mt-3 text-h1 text-ink">Session Complete</h2>
        <p className="text-sm text-muted">{topic}</p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-brand/10 p-4 text-center">
          <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-tint text-ink">
            <ClockIcon />
          </span>
          <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-muted">
            Time Studied
          </p>
          <p className="text-lg font-extrabold text-ink">{minutesStudied} mins</p>
        </div>
        <div className="rounded-xl border border-brand/10 p-4 text-center">
          <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-tint text-ink">
            <CheckCircleIcon />
          </span>
          <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-muted">
            Milestones Completed
          </p>
          <p className="text-lg font-extrabold text-ink">
            {milestonesCompleted} / {milestonesTotal}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-xl border border-brand/10 p-4">
        <span className="mt-0.5 text-ink">
          <StarIcon />
        </span>
        <div>
          <p className="text-sm font-bold text-ink">Progress</p>
          <p className="text-xs text-muted">
            You&apos;ve reached your daily concentration goal. Consistency score: 98%
            consistency
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <Button variant="primary" onClick={onContinue}>
          Continue Studying
        </Button>
        <Link
          href="/home/today-plan"
          className="flex h-14 w-full items-center justify-center rounded-lg border border-brand/15 bg-surface text-base font-semibold text-body-text hover:bg-tint-strong"
        >
          Back To Planner
        </Link>
      </div>
    </Modal>
  );
}
