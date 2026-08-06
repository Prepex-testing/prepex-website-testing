"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import {
  BookIcon,
  ClockIcon,
  ListIcon,
  TrendingUpIcon,
  TargetIcon,
  CheckIcon,
} from "@/components/ui/icons";

const STATS = [
  { icon: <ClockIcon />, label: "Duration", value: "25 Mins" },
  { icon: <ListIcon />, label: "Questions", value: "20 Qs" },
  { icon: <TrendingUpIcon />, label: "Difficulty", value: "Medium" },
  { icon: <TargetIcon />, label: "Focus", value: "Accuracy" },
];

const BENEFITS = [
  "Instant feedback",
  "AI performance analysis",
  "Mistakes saved automatically",
  "Updated readiness score",
];

type TodaysPracticeModalProps = {
  open: boolean;
  onClose: () => void;
  onStart: () => void;
};

export function TodaysPracticeModal({ open, onClose, onStart }: TodaysPracticeModalProps) {
  return (
    <Modal open={open} onClose={onClose} ariaLabel="Today's Practice">
      <div className="text-center">
        <h2 className="text-xl font-bold text-ink sm:text-2xl md:text-h1">
          Today&apos;s Practice
        </h2>
        <p className="mt-1 text-xs text-muted sm:text-sm">
          AI has prepared your next practice session.
        </p>
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-xl border border-brand/10 p-3 sm:mt-5 sm:gap-4 sm:p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-tint text-ink sm:h-10 sm:w-10">
          <BookIcon />
        </span>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted sm:text-xs">
            Physics
          </p>
          <p className="text-sm font-bold text-ink sm:text-base md:text-lg">
            Current Electricity
          </p>
          <p className="text-xs text-muted sm:text-sm">
            Improve accuracy in one of your weakest concepts based on recent performance.
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:mt-4 sm:gap-3">
        {STATS.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-brand/10 p-2.5 sm:p-3">
            <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-muted sm:text-xs">
              {stat.icon}
              {stat.label}
            </p>
            <p className="mt-1 text-sm font-bold text-ink sm:text-base md:text-lg">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-4 text-sm font-bold text-ink sm:mt-5 sm:text-base">
        After this session you&apos;ll receive:
      </p>
      <div className="mt-2 flex flex-col gap-1.5">
        {BENEFITS.map((benefit) => (
          <p key={benefit} className="flex items-center gap-2 text-xs text-body-text sm:text-sm">
            <span className="text-ink">
              <CheckIcon />
            </span>
            {benefit}
          </p>
        ))}
      </div>

      <Button variant="primary" className="mt-4 sm:mt-5" onClick={onStart}>
        Start Practice
      </Button>
      <button
        type="button"
        onClick={onClose}
        className="mt-2 w-full text-center text-sm font-semibold text-muted"
      >
        Not Now
      </button>
    </Modal>
  );
}
