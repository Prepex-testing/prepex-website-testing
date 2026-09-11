"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { WhiteModal } from "@/components/ui/WhiteModal";
import { CheckIcon, ClockIcon, CheckCircleIcon, StarIcon, XIcon, ClockIconss } from "@/components/ui/icons";
import { Right, Star, StarIcons } from "@/assets/icons";

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
    <WhiteModal open={open} onClose={onClose} ariaLabel="Session Complete">
      <div className="relative text-center">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-0 top-0 flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-tint-strong"
        >
          <XIcon />
        </button>
        <span className="
    mx-auto flex
    size-[clamp(64px,8vw,80px)]
    shrink-0 items-center justify-center
    rounded-full border-4 border-white
    bg-brand
    shadow-[0px_4px_6px_-4px_rgba(0,0,0,0.1),0px_10px_15px_-3px_rgba(0,0,0,0.1)]
    dark:bg-[var(--text-primary,#FAF7F2)]
  "
        >
          <span
            className="
      flex
      size-[clamp(26.67px,3.333vw,33.33px)]
      shrink-0 items-center justify-center
      rounded-full bg-white
      dark:bg-[var(--bg-card,#111145)]
    "
          >
            <CheckIcon
              className="
    size-[clamp(16px,2vw,20px)]
    shrink-0
    text-brand
    dark:text-[var(--text-primary,#FAF7F2)]
  "
              strokeWidth={3}
            />
          </span>
        </span>
        <h2 className="mt-3 text-center text-[24px] font-bold leading-[28.8px] tracking-[-0.48px] text-ink sm:text-[28px] sm:leading-[33.6px] sm:tracking-[-0.56px] lg:text-[32px] lg:leading-[38.4px] lg:tracking-[-0.64px]">
          Session Complete
        </h2>
        <p className="mt-1 text-center text-[20px] font-semibold leading-7 tracking-normal text-[#333333] dark:text-[#FAF7F2]">
          {topic}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-brand/10 p-4 text-center">
          <span className="mx-auto flex h-[21px] w-[18px] shrink-0 items-center justify-center text-ink">
            <ClockIconss width={18} height={21} />
          </span>
          <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-muted">
            Time Studied
          </p>
          <p className="text-lg font-extrabold text-ink">{minutesStudied} mins</p>
        </div>
        <div className="rounded-xl border border-brand/10 p-4 text-center">
          <span className="mx-auto flex h-[21px] w-[18px] shrink-0 items-center justify-center text-ink">
            <Right width={18} height={21} />
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
        <span className="mt-0.5 flex h-10 w-[38px] shrink-0 items-center justify-center rounded-full bg-[#EEF0F8] text-ink dark:bg-[#FAF7F2]">
          <Star width={20} height={19} />
        </span>
        <div>
          <p className="text-sm font-bold text-ink">Progress</p>
          <p className="mt-1 text-xs text-muted">
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
          className="flex h-14 w-full items-center justify-center rounded-lg border-[1.5px] border-[#1A1A4E] bg-surface text-base font-semibold text-body-text hover:bg-tint-strong dark:border-[#FAF7F2]"
        >
          Complete Session
        </Link>
      </div>
    </WhiteModal>
  );
}
