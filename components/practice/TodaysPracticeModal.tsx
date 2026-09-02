"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { WhiteModal } from "@/components/ui/WhiteModal";
import {
  BookIcon,
  ClockIcon,
  ListIcon,
  TrendingUpIcon,
  TargetIcon,
  CheckIcon,
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

// Shown until the task's questions load, and for the static mock callers that
// pass no taskId.
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
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: T | null = null;
  let bestN = 0;
  for (const [v, n] of counts) {
    if (n > bestN) {
      best = v;
      bestN = n;
    }
  }
  return best;
}

function deriveInfo(data: TaskQuestionsResponse): PracticeInfo {
  const questions = data.questions.map((q) => q.question).filter((q) => q != null);

  const totalSeconds = questions.reduce(
    (sum, q) => sum + (q.expectedTimeSeconds ?? 0),
    0,
  );
  const count = data.totalQuestions || questions.length;
  const minutes = totalSeconds
    ? Math.round(totalSeconds / 60)
    : Math.max(10, Math.round(count * 1.5));

  const topic = mode(questions.map((q) => q.topic).filter(Boolean));
  const difficulty = mode(questions.map((q) => q.difficulty).filter(Boolean));
  const syllabusTag = mode(
    questions.map((q) => q.syllabusTag).filter((t): t is string => !!t),
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
    difficultyLabel: difficulty ? prettyDifficulty(difficulty) : "Mixed",
    focusLabel: "Accuracy",
  };
}

type TodaysPracticeModalProps = {
  open: boolean;
  onClose: () => void;
  onStart: () => void;
  /** Plan task to pull live session details from. Omitted by mock callers. */
  taskId?: string | null;
};

export function TodaysPracticeModal({
  open,
  onClose,
  onStart,
  taskId,
}: TodaysPracticeModalProps) {
  // Keyed by taskId so a stale response for a previous task is ignored without
  // a synchronous reset in the effect body.
  const [fetched, setFetched] = useState<{
    taskId: string;
    data: TaskQuestionsResponse;
  } | null>(null);

  useEffect(() => {
    if (!open || !taskId) return;
    let cancelled = false;
    getTaskQuestions(taskId)
      .then((res) => {
        if (!cancelled) setFetched({ taskId, data: res.data });
      })
      .catch(() => {
        // Best-effort — the modal falls back to generic copy.
      });
    return () => {
      cancelled = true;
    };
  }, [open, taskId]);

  const data = fetched && fetched.taskId === taskId ? fetched.data : null;
  const loading = !!taskId && !data;
  const info = useMemo(() => (data ? deriveInfo(data) : FALLBACK), [data]);

  const stats = [
    { icon: <ClockIcon />, label: "Duration", value: info.durationLabel },
    { icon: <ListIcon />, label: "Questions", value: info.questionsLabel },
    { icon: <TrendingUpIcon />, label: "Difficulty", value: info.difficultyLabel },
    { icon: <TargetIcon />, label: "Focus", value: info.focusLabel },
  ];

  return (
    <WhiteModal open={open} onClose={onClose} ariaLabel="Today's Practice">
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
            {info.subjectLabel}
          </p>
          <p className="text-sm font-bold text-ink sm:text-base md:text-lg">
            {loading ? "Loading session…" : info.title}
          </p>
          <p className="text-xs text-muted sm:text-sm">{info.description}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:mt-4 sm:gap-3">
        {stats.map((stat) => (
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
    </WhiteModal>
  );
}
