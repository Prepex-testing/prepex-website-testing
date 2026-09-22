"use client";

import { Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useTheme } from "@/components/theme/ThemeProvider";
import { UserMenu } from "@/components/layout/UserMenu";
import { Button } from "@/components/ui/Button";
import { CircularProgress } from "@/components/ui/CircularProgress";
import { PageLoader } from "@/components/ui/PageLoader";
import { AddCustomTaskModal } from "@/components/plan/AddCustomTaskModal";
import {

  ArrowRightIcon,
  // AlertTriangleIcons,
  // AlertTriangleIcon,
  BoltIcon,
  BookOpenIcon,
  CalendarIcon,
  ClockIcon,
  ConceptualGapIcon,
  PlusIcon,
  SillyErrorIcon,
  TimePressureIcon,
  WildGuessIcon,
} from "@/components/ui/icons";
import {
  getMistakePatterns,
  getPracticeSession,
  MISTAKE_TAG_LABELS,
  type MistakePatternsResponse,
  type MistakeTag,
  type PracticeSessionDetail,
  type PracticeTopicAnalysis,
} from "@/lib/api/practice";
import { AlertTriangleIcon, ConceptualIcon, ConfirmIcon, DiceIcon, TimeIcon, VectorIcon } from "@/assets/icons";

const TAG_ORDER: MistakeTag[] = [
  "CONCEPTUAL_GAP",
  "SILLY_ERROR",
  "TIME_PRESSURE",
  "WILD_GUESS",
];

const TAG_META: Record<
  MistakeTag,
  { icon: ReactNode; badge: string; badgeClass: string; fallbackAction: string }
> = {
  CONCEPTUAL_GAP: {
    icon: (
      <span className="flex size-5.5 shrink-0 [&>svg]:size-full">
        <ConceptualIcon />
      </span>
    ),
    badge: "Critical",
    badgeClass: "bg-[#EEF0F8] text-[#1A1A4E] dark:border-transparent dark:bg-[#242453] dark:text-white",
    fallbackAction: "Recoverable with targeted practice",
  },
  SILLY_ERROR: {
    icon: (
      <span className="flex size-5.5 shrink-0 [&>svg]:size-full">
        <VectorIcon />
      </span>
    ),
    badge: "Optimize",
    badgeClass: "bg-[#EEF0F8] text-[#1A1A4E] dark:border-transparent dark:bg-[#242453] dark:text-white",
    fallbackAction: "Recoverable with careful revision",
  },
  TIME_PRESSURE: {
    icon: (
      <span className="flex size-5.5 shrink-0 [&>svg]:size-full">
        <TimeIcon />
      </span>
    ),
    badge: "Strategic",
    badgeClass: "bg-[#EEF0F8] text-[#1A1A4E] dark:border-transparent dark:bg-[#242453] dark:text-white",
    fallbackAction: "Recoverable with time management",
  },
  WILD_GUESS: {
    icon: (
      <span className="flex size-5.5 shrink-0 [&>svg]:size-full">
        <DiceIcon />
      </span>
    ),
    badge: "Refined",
    badgeClass: "bg-[#EEF0F8] text-[#1A1A4E] dark:border-transparent dark:bg-[#242453] dark:text-white",
    fallbackAction: "Recoverable with better elimination",
  },
};

function weakestTopic(topics: PracticeTopicAnalysis[]): PracticeTopicAnalysis | null {
  const ranked = [...topics].sort((a, b) => {
    const pa = a.totalQuestions ? a.correctQuestions / a.totalQuestions : 1;
    const pb = b.totalQuestions ? b.correctQuestions / b.totalQuestions : 1;
    return pa - pb;
  });
  const first = ranked[0];
  if (!first) return null;
  const pct = first.totalQuestions ? first.correctQuestions / first.totalQuestions : 1;
  return first.weaknessDetected || pct < 0.65 ? first : null;
}

export default function MistakeAnalysisPage() {
  return (
    <Suspense fallback={<PageLoader label="Loading analysis…" />}>
      <MistakeAnalysisContent />
    </Suspense>
  );
}

function MistakeAnalysisContent() {
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");

  const [session, setSession] = useState<PracticeSessionDetail | null>(null);
  const [patterns, setPatterns] = useState<MistakePatternsResponse | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isAddTaskOpen, setAddTaskOpen] = useState(false);
  const error = fetchError ?? (sessionId ? null : "No session specified.");

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    getPracticeSession(sessionId)
      .then((res) => !cancelled && setSession(res.data))
      .catch(
        (err) =>
          !cancelled &&
          setFetchError(err instanceof Error ? err.message : "Could not load the analysis."),
      );
    getMistakePatterns()
      .then((res) => !cancelled && setPatterns(res.data))
      .catch(() => {
        // Best-effort — the patterns section just stays empty.
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const correct = session?.correctQuestions ?? 0;
  const total = session?.totalQuestions ?? 0;
  const wrong = session?.wrongQuestions ?? 0;
  const attempted = session?.attemptedQuestions ?? 0;
  const elapsedSeconds = session?.durationSeconds ?? 0;
  const minutes = Math.max(1, Math.round(elapsedSeconds / 60));
  const avgPerQuestion = attempted > 0 ? (elapsedSeconds / 60 / attempted).toFixed(1) : "0";
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;

  const topics = session?.topicAnalysis ?? [];
  const primaryTopic = useMemo(() => {
    if (!session) return "Practice";
    const counts = new Map<string, number>();
    for (const q of session.questions) {
      const t = q.question?.topic;
      if (t) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    let best = "Practice";
    let bestN = 0;
    for (const [t, n] of counts) if (n > bestN) [best, bestN] = [t, n];
    return best;
  }, [session]);
  const weakTopic = weakestTopic(topics);

  const patternByTag = new Map((patterns?.patterns ?? []).map((p) => [p.tag, p]));
  const patternTiles = TAG_ORDER.map((tag) => {
    const p = patternByTag.get(tag);
    return {
      tag,
      label: MISTAKE_TAG_LABELS[tag],
      marks: p?.marksLost ?? 0,
      count: p?.count ?? 0,
      action: p?.suggestedAction ?? TAG_META[tag].fallbackAction,
      topChapter: p?.topChapterName ?? null,
    };
  });
  const topLeak = [...patternTiles].sort((a, b) => b.marks - a.marks)[0];
  const hasLeak = !!topLeak && topLeak.marks > 0;
  const leakLow = hasLeak ? Math.max(1, Math.round(topLeak.marks * 0.7)) : 0;

  const openNotebook = () => router.push("/home/mistake-notebook");

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-h2 text-ink">Analysis unavailable</p>
        <p className="max-w-md text-sm text-muted">{error}</p>
        <Button href="/home/mistake-notebook" variant="secondary" size="sm">
          Open Mistake Notebook
        </Button>
      </div>
    );
  }

  if (!session) return <PageLoader label="Loading analysis…" />;

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <h1 className="min-w-0 flex-1 text-h1 text-ink">Practice Complete</h1>
        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <ThemeToggle />
          <NotificationBell />
          <UserMenu />
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {/* Score card */}
        <div className="flex w-full flex-col gap-5 rounded-2xl border border-brand/10 bg-surface p-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6 sm:p-6">
          {/* Score */}
          <div className="flex justify-center sm:justify-start sm:pl-6">
            <CircularProgress
              percent={Math.max(percent, 2)}
              displayValue={`${correct}/${total}`}
              suffix=""
              label="Score"
              size={110}
              progressColor={resolvedTheme === "dark" ? "#ffffff" : "#1A1A4E"}
            />
          </div>

          {/* Practice information */}
          <div className="flex min-w-0 flex-1 flex-col gap-2.5 sm:ml-8 sm:gap-3">
            <h2 className="text-[22px] font-extrabold leading-7 tracking-[-0.3px] text-ink sm:text-[28px] sm:leading-8 sm:tracking-[-0.5px]">
              Practice Complete
            </h2>

            <p className="text-[13px] font-bold leading-5 text-muted sm:text-[15px]">
              {primaryTopic}
            </p>

            {/* Stats */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="flex min-h-[36px] items-center gap-1.5 rounded-full border border-brand/15 px-3 py-1.5 text-[12px] font-semibold leading-4 text-body-text sm:text-[13px]">
                <ClockIcon className="h-4 w-4 shrink-0" />
                <span>{minutes} min</span>
              </span>

              <span className="flex min-h-[36px] items-center gap-1.5 rounded-full border border-brand/15 px-3 py-1.5 text-[12px] font-semibold leading-4 text-body-text sm:text-[13px]">
                <BoltIcon />
                <span>Avg {avgPerQuestion} min/Q</span>
              </span>
            </div>
          </div>

          {/* Add Practice button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddTaskOpen(true)}
            className="h-[42px]! w-full! shrink-0 gap-2! rounded-xl! px-4! text-[13px]! font-semibold! sm:w-auto! sm:px-5! sm:text-[14px]!"
          >
            <PlusIcon />
            Add Custom Practice
          </Button>
        </div>

        {/* Patterns + side rail */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.9fr_1fr]">
          {/* Mistake patterns — opens the full notebook */}
          <div
            className="rounded-2xl border border-brand/10 bg-surface p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex w-full max-w-[326px] flex-wrap items-center gap-1 text-[18px] font-bold leading-[100%] tracking-normal text-ink sm:text-[22px]">
                <span className="font-bold">Mistake Patterns</span>

                {patterns && (
                  <span className="font-semibold">
                    · Last {patterns.windowDays} Days
                  </span>
                )}
              </p>
              <span className="flex shrink-0 items-center gap-3">
                {patterns && (
                  <span className="whitespace-nowrap text-[10px] font-semibold leading-[15px] text-muted sm:text-[11px]">
                    ~{patterns.totalMarksLost} marks lost
                  </span>
                )}

                <button
                  type="button"
                  onClick={openNotebook}
                  className="flex shrink-0 items-center gap-1 whitespace-nowrap text-[10px] font-bold leading-[15px] text-cta hover:underline sm:text-[11px]"
                >
                  <span>Open notebook</span>
                  <ArrowRightIcon className="h-3 w-3" />
                </button>
              </span>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {patternTiles.map((t) => (
                <div
                  key={t.tag}
                  className="flex flex-col rounded-xl border border-brand/10 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-tint p-3 text-ink sm:h-[42px] sm:w-[42px]">
                      {TAG_META[t.tag].icon}
                    </span>
                    <span
                      className={`flex h-[23px] w-full max-w-[62.17px] items-center justify-center rounded-[4px] px-2.5 py-1 text-[10px] font-extrabold uppercase leading-[15px] tracking-[1px] ${TAG_META[t.tag].badgeClass}`}
                    >
                      {TAG_META[t.tag].badge}
                    </span>
                  </div>

                  <p className="mt-3 w-full max-w-[263px] text-[14px] font-semibold leading-[100%] tracking-normal text-ink">
                    {t.label}
                  </p>
                  <p className="mt-3 flex items-center gap-2">
                    <span className="text-[20px] font-bold leading-[100%] tracking-normal text-ink sm:text-[22px]">
                      {t.marks}
                    </span>

                    <span className="text-[14px] font-semibold leading-5 tracking-normal text-muted">
                      Marks
                    </span>
                  </p>

                  <p className="mt-2 w-full max-w-[263px] text-[12px] font-normal leading-4 tracking-normal text-muted">
                    {t.action}
                  </p>

                  <p className="mt-3 border-t border-brand/10 pt-3 text-caption text-muted">
                    {t.count} question{t.count === 1 ? "" : "s"}
                    {t.topChapter ? ` · mostly ${t.topChapter}` : ""}
                  </p>
                </div>
              ))}
            </div>

            {patterns?.insight && (
              <p className="mt-4 border-t border-brand/10 pt-4 text-[13px] leading-5 text-body-text">
                <span className="font-bold">Insight:</span> {patterns.insight}
              </p>
            )}
          </div>

          {/* Side rail */}
          <div className="flex flex-col gap-4">
            <div className="rounded-[24px] border border-brand/10 bg-surface px-6 py-7 sm:px-8 sm:py-8">
              <div className="flex items-start gap-5">

                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-tint text-ink sm:h-10 sm:w-10">
                  <span className="flex size-5.5 shrink-0 [&>svg]:size-full">
                    <SillyErrorIcon />
                  </span>
                </span>

                {/* Content */}
                <div className="min-w-0 pt-[-1px]">
                  <p className="text-[10px] font-extrabold uppercase leading-[15px] tracking-[1px] text-[#F59E0B]">
                    {weakTopic ? "Recovery Detected" : "Next Focus"}
                  </p> <h3 className="mt-1 max-w-[173px] text-[14px] font-bold leading-5 tracking-normal text-ink sm:max-w-[220px] md:max-w-[280px]">
                    {weakTopic
                      ? `${weakTopic.topic} needs work`
                      : "Solid session — keep the streak"}
                  </h3>

                </div>
              </div>

              <p className="mt-3 w-full max-w-[298px] text-[12px] font-normal leading-[19.5px] tracking-normal text-mute sm:mt-7 sm:max-w-[298px]">
                {weakTopic
                  ? "System analysis suggests reviewing geometric properties of intersecting circles before next attempt."
                  : "No weak topics flagged this session."}
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {/* Mistake Notebook */}
              <div className="w-full rounded-2xl border border-brand/10 bg-surface p-4">
                <div className="flex items-center gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-tint text-ink sm:h-10 sm:w-10">
                    <BookOpenIcon />
                  </span>

                  <div className="min-w-0">
                    <p className="text-[14px] font-bold leading-[17.5px] tracking-normal text-ink">
                      {wrong} question{wrong === 1 ? "" : "s"} added to Mistake Notebook
                    </p>

                    <p className="mt-1 text-[10px] font-semibold uppercase leading-[15px] tracking-normal text-muted">
                      Automated update
                    </p>
                  </div>
                </div>
              </div>

              {/* Tomorrow's Plan */}
              <div className="w-full rounded-2xl border border-brand/10 bg-surface p-4">
                <div className="flex items-center gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-tint text-ink sm:h-10 sm:w-10">
                    <CalendarIcon className="h-5 w-5" />
                  </span>

                  <div className="min-w-0">
                    <p className="text-[14px] font-bold leading-[17.5px] tracking-normal text-ink">
                      Tomorrow&apos;s plan updated
                    </p>

                    <p className="mt-1 text-[10px] font-semibold uppercase leading-[15px] tracking-normal text-muted">
                      AI scheduler
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {hasLeak && (
              <div className="w-full rounded-2xl border border-[#FFE8CC] bg-[#FEF8EF] px-4 py-3 dark:border-brand/10 dark:bg-surface sm:px-6 sm:pb-[34px] sm:pt-4">
                <div className="w-full">
                  <p className="text-[12px] font-normal leading-[17px] tracking-normal text-body-text sm:text-[14px] sm:leading-5">
                    <span className="font-bold">
                      Biggest score leak: {topLeak.label}.
                    </span>{" "}
                    Focus here to recover{" "}
                    <span className="font-bold text-[#F59E0B]">
                      +{leakLow} to +{topLeak.marks}
                    </span>{" "}
                    marks.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <AddCustomTaskModal
        open={isAddTaskOpen}
        onClose={() => setAddTaskOpen(false)}
        lockedTaskType="Practice"
        title="Add Custom Practice Task"
      />
    </div>
  );
}
