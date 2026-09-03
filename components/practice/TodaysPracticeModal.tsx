"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckIcons } from "@/assets/icons";
import { Button } from "@/components/ui/Button";
import { WhiteModal } from "@/components/ui/WhiteModal";
import {
  BookIcon1,
  ClockIcon,
  ListIcon,
  TrendingUpIcon,
  TargetIcon,
} from "@/components/ui/icons";
import {
  getTaskQuestions,
  prettyDifficulty,
  type TaskQuestionsResponse,
} from "@/lib/api/practice";

const BENEFITS = [
  "Instant feedback",
  "AI performance analysis",
  "Mistakes saved automatically",
  "Updated readiness score",
];

type PracticeInfo = {
  subjectLabel: string;
  title: string;
  description: string;
  durationLabel: string;
  questionsLabel: string;
  difficultyLabel: string;
  focusLabel: string;
};

// Default values are shown when there is no taskId
// or while the API data is loading.
const FALLBACK: PracticeInfo = {
  subjectLabel: "Practice",
  title: "Today's Practice",
  description:
    "Improve accuracy in one of your weakest concepts based on recent performance.",
  durationLabel: "—",
  questionsLabel: "—",
  difficultyLabel: "—",
  focusLabel: "Accuracy",
};

function mode<T>(values: T[]): T | null {
  const counts = new Map<T, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  let best: T | null = null;
  let bestCount = 0;

  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }

  return best;
}

function deriveInfo(data: TaskQuestionsResponse): PracticeInfo {
  const questions = data.questions
    .map((q) => q.question)
    .filter((q) => q != null);

  const totalSeconds = questions.reduce(
    (sum, question) => sum + (question.expectedTimeSeconds ?? 0),
    0,
  );

  const count = data.totalQuestions || questions.length;

  const minutes = totalSeconds
    ? Math.round(totalSeconds / 60)
    : Math.max(10, Math.round(count * 1.5));

  const topic = mode(
    questions.map((question) => question.topic).filter(Boolean),
  );

  const difficulty = mode(
    questions.map((question) => question.difficulty).filter(Boolean),
  );

  const syllabusTag = mode(
    questions
      .map((question) => question.syllabusTag)
      .filter((tag): tag is string => !!tag),
  );

  const sessionKind =
    data.sessionType === "DPP"
      ? "Daily Practice Problems"
      : data.sessionType === "CUSTOM"
        ? "Custom Practice"
        : "Daily Plan";

  return {
    subjectLabel: syllabusTag ?? sessionKind,

    title: data.taskTitle || "Today's Practice",

    description: topic
      ? `Focused set on ${topic} — sharpen accuracy on a recent weak spot.`
      : FALLBACK.description,

    durationLabel: `${minutes} Min${minutes === 1 ? "" : "s"}`,

    questionsLabel: `${count} Q${count === 1 ? "" : "s"}`,

    difficultyLabel: difficulty
      ? prettyDifficulty(difficulty)
      : "Mixed",

    focusLabel: "Accuracy",
  };
}

type TodaysPracticeModalProps = {
  open: boolean;
  onClose: () => void;
  onStart: () => void;

  /** Plan task to pull live session details from. */
  taskId?: string | null;
};

export function TodaysPracticeModal({
  open,
  onClose,
  onStart,
  taskId,
}: TodaysPracticeModalProps) {
  const [fetched, setFetched] = useState<{
    taskId: string;
    data: TaskQuestionsResponse;
  } | null>(null);

  /*
   * Fetch questions whenever the modal opens
   * and a taskId is available.
   */
  useEffect(() => {
    if (!open || !taskId) return;

    let cancelled = false;

    getTaskQuestions(taskId)
      .then((res) => {
        if (!cancelled) {
          setFetched({
            taskId,
            data: res.data,
          });
        }
      })
      .catch(() => {
        // Best effort.
        // FALLBACK UI will continue to be displayed.
      });

    return () => {
      cancelled = true;
    };
  }, [open, taskId]);

  /*
   * Make sure old task data is never displayed
   * for a newly selected task.
   */
  const data =
    fetched && fetched.taskId === taskId
      ? fetched.data
      : null;

  const loading = !!taskId && !data;

  const info = useMemo(
    () => (data ? deriveInfo(data) : FALLBACK),
    [data],
  );

  /*
   * Dynamic stats.
   * Values come from the API-derived info.
   */
  const stats = [
    {
      icon: <ClockIcon />,
      label: "Duration",
      value: info.durationLabel,
    },
    {
      icon: <ListIcon />,
      label: "Questions",
      value: info.questionsLabel,
    },
    {
      icon: <TrendingUpIcon />,
      label: "Difficulty",
      value: info.difficultyLabel,
    },
    {
      icon: <TargetIcon />,
      label: "Focus",
      value: info.focusLabel,
    },
  ];

  return (
    <WhiteModal
      open={open}
      onClose={onClose}
      ariaLabel="Today's Practice"
    >
      {/* Header */}
      <div className="text-center">
        <h2 className="text-center text-[20px] font-bold leading-7 tracking-[-0.5px] text-ink sm:text-[22px] sm:leading-8 sm:tracking-[-0.55px] md:text-[24px] md:leading-8 md:tracking-[-0.6px]">
          Today&apos;s Practice
        </h2>

        <p className="mt-1 text-xs text-muted sm:text-sm">
          AI has prepared your next practice session.
        </p>
      </div>

      {/* Practice information */}
      <div className="mt-4 flex w-full items-start gap-3 rounded-2xl border border-[#EEF0F8] bg-white p-4 shadow-[0_2px_8px_#1A1A4E14] sm:mt-5 sm:gap-4 sm:p-5 dark:border-[#FAF7F214] dark:bg-[#111145]">
        {/* Icon */}
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-tint text-ink sm:h-14 sm:w-14">
          <BookIcon1
            width={28}
            height={28}
            className="sm:h-8 sm:w-8"
          />
        </span>

        {/* Content */}
        <div className="min-w-0 w-full flex-1 sm:max-w-[384px]">
          {/* Subject */}
          <p className="h-4 truncate text-[12px] font-bold uppercase leading-4 tracking-[0.6px] text-muted">
            {info.subjectLabel}
          </p>

          {/* Title */}
          <p className="mt-0 line-clamp-2 text-[16px] font-bold leading-[22.5px] text-ink sm:text-[18px]">
            {loading ? "Loading session…" : info.title}
          </p>

          {/* Description */}
          <p className="line-clamp-2 w-full text-[14px] font-normal leading-[22.75px] tracking-normal text-muted">
            {info.description}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid w-full grid-cols-2 gap-1 border-y border-[#F3F4F6] py-4 sm:mt-6 sm:gap-4 sm:py-5 dark:border-[#FAF7F20F]">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex h-[98px] w-full flex-col rounded-xl border border-[#EEF0F8] bg-white p-4 shadow-[0_2px_8px_#1A1A4E14] dark:border-[#FAF7F214] dark:bg-[#111145]"
          >
            {/* Stat label */}
            <p className="flex h-4 w-full items-center gap-2 text-[12px] font-semibold uppercase leading-4 tracking-[0.6px] text-muted">
              <span className="flex h-[15px] w-[15px] shrink-0 items-center justify-center">
                {stat.icon}
              </span>

              <span>{stat.label}</span>
            </p>

            {/* Stat value */}
            <p className="mt-2 h-7 w-full text-[16px] font-bold leading-7 tracking-normal text-ink sm:text-[18px]">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Benefits heading */}
      <p className="mt-6 h-5 w-full text-[14px] font-bold leading-5 tracking-normal text-ink">
        After this session you&apos;ll receive:
      </p>

      {/* Benefits */}
      <div className="mt-2 flex w-full flex-col gap-3">
        {BENEFITS.map((benefit) => (
          <p
            key={benefit}
            className="flex h-5 w-full items-center gap-2 text-[14px] font-normal leading-5 tracking-normal text-body-text"
          >
            <span className="flex h-4 w-4 shrink-0 items-center justify-center text-ink">
              <CheckIcons
                width={16}
                height={16}
              />
            </span>

            <span>{benefit}</span>
          </p>
        ))}
      </div>

      {/* Start Practice */}
      <Button
        variant="primary"
        className="mt-4 sm:mt-5"
        onClick={onStart}
      >
        Start Practice
      </Button>

      {/* Not Now */}
      <button
        type="button"
        onClick={onClose}
        className="mt-2 w-full text-center text-sm font-semibold text-muted"
      >
        Not Now
      </button>
    </WhiteModal>
  );
}