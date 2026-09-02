"use client";

import { Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useTheme } from "@/components/theme/ThemeProvider";
import { UserMenu } from "@/components/layout/UserMenu";
import { Button } from "@/components/ui/Button";
import { CircularProgress } from "@/components/ui/CircularProgress";
import { AddCustomTaskModal } from "@/components/plan/AddCustomTaskModal";
import {
  AlertTriangleIcon,
  BellIcon,
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
    icon: <ConceptualGapIcon />,
    badge: "Critical",
    badgeClass: "bg-[rgba(245,158,11,0.12)] text-[#F59E0B]",
    fallbackAction: "Recoverable with targeted practice",
  },
  SILLY_ERROR: {
    icon: <SillyErrorIcon />,
    badge: "Optimize",
    badgeClass: "bg-tint text-ink",
    fallbackAction: "Recoverable with careful revision",
  },
  TIME_PRESSURE: {
    icon: <TimePressureIcon />,
    badge: "Strategic",
    badgeClass: "bg-tint text-ink",
    fallbackAction: "Recoverable with time management",
  },
  WILD_GUESS: {
    icon: <WildGuessIcon />,
    badge: "Refined",
    badgeClass: "bg-[rgba(67,176,144,0.12)] text-[#28B485]",
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
    <Suspense fallback={null}>
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

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h1 text-ink">Practice Complete</h1>
        <div className="flex shrink-0 items-center gap-4">
          <ThemeToggle />
          <button
            type="button"
            aria-label="Notifications"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-icon-action-bg text-icon-action-text transition-colors hover:bg-tint-strong"
          >
            <BellIcon />
          </button>
          <UserMenu />
        </div>
      </div>

      {!session ? (
        <p className="text-sm text-muted">Loading analysis…</p>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Score card */}
          <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-brand/10 bg-surface p-6">
            <CircularProgress
              percent={Math.max(percent, 2)}
              displayValue={`${correct}/${total}`}
              suffix=""
              label="Score"
              size={120}
              progressColor={resolvedTheme === "dark" ? "#ffffff" : "#1A1A4E"}
            />

            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <h2 className="text-[28px] font-extrabold leading-8 tracking-[-0.5px] text-ink">
                Practice Complete
              </h2>
              <p className="text-[15px] font-bold text-muted">{primaryTopic}</p>
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1.5 rounded-full border border-brand/15 px-3 py-1.5 text-[13px] font-semibold text-body-text">
                  <ClockIcon className="h-4 w-4" />
                  {minutes} min
                </span>
                <span className="flex items-center gap-1.5 rounded-full border border-brand/15 px-3 py-1.5 text-[13px] font-semibold text-body-text">
                  <BoltIcon />
                  Avg {avgPerQuestion} min/Q
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddTaskOpen(true)}
              className="h-[42px]! shrink-0 gap-2! rounded-xl! px-5! text-[14px]! font-semibold!"
            >
              <PlusIcon />
              Add Custom Practice
            </Button>
          </div>

          {/* Patterns + side rail */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.9fr_1fr]">
            {/* Mistake patterns — opens the full notebook */}
            <div
              role="button"
              tabIndex={0}
              onClick={openNotebook}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openNotebook();
                }
              }}
              className="cursor-pointer rounded-2xl border border-brand/10 bg-surface p-6 transition-colors hover:border-brand/30 hover:bg-tint/40"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[16px] font-bold text-ink">
                  Mistake Patterns
                  {patterns ? ` · Last ${patterns.windowDays} Days` : ""}
                </p>
                <span className="flex items-center gap-3">
                  {patterns && (
                    <span className="text-caption font-semibold text-muted">
                      ~{patterns.totalMarksLost} marks lost
                    </span>
                  )}
                  <span className="text-caption font-bold text-cta">Open notebook →</span>
                </span>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {patternTiles.map((t) => (
                  <div
                    key={t.tag}
                    className="flex flex-col rounded-xl border border-brand/10 p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-tint text-ink">
                        {TAG_META[t.tag].icon}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.6px] ${TAG_META[t.tag].badgeClass}`}
                      >
                        {TAG_META[t.tag].badge}
                      </span>
                    </div>

                    <p className="mt-3 text-[14px] font-bold text-ink">{t.label}</p>
                    <p className="mt-1 text-[18px] font-extrabold text-ink">
                      {t.marks}{" "}
                      <span className="text-caption font-semibold text-muted">Marks</span>
                    </p>
                    <p className="mt-1 text-caption leading-4 text-muted">{t.action}</p>

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
              <div className="rounded-2xl border border-brand/10 bg-surface p-5">
                <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[1.2px] text-[#F59E0B]">
                  <AlertTriangleIcon />
                  {weakTopic ? "Weakness Detected" : "Next Focus"}
                </p>
                <h3 className="mt-2 text-[15px] font-bold text-ink">
                  {weakTopic ? `${weakTopic.topic} needs work` : "Solid session — keep the streak"}
                </h3>
                <p className="mt-1 text-[13px] leading-5 text-muted">
                  {weakTopic
                    ? "System analysis suggests reviewing this topic's core concepts before your next attempt."
                    : "No weak topics flagged this session."}
                </p>
              </div>

              <div className="rounded-2xl border border-brand/10 bg-surface p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-tint text-ink">
                    <BookOpenIcon />
                  </span>
                  <div>
                    <p className="text-[14px] font-bold text-ink">
                      {wrong} question{wrong === 1 ? "" : "s"} added to Mistake Notebook
                    </p>
                    <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.6px] text-muted">
                      Automated update
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-brand/10 bg-surface p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-tint text-ink">
                    <CalendarIcon />
                  </span>
                  <div>
                    <p className="text-[14px] font-bold text-ink">Tomorrow&apos;s plan updated</p>
                    <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.6px] text-muted">
                      AI scheduler
                    </p>
                  </div>
                </div>
              </div>

              {hasLeak && (
                <div className="rounded-2xl border border-[#FFE8CC] bg-[#FEF8EF] p-5 dark:border-brand/10 dark:bg-surface">
                  <p className="text-[13px] leading-5 text-body-text">
                    <span className="font-bold">Biggest score leak: {topLeak.label}.</span> Focus
                    here to recover{" "}
                    <span className="font-bold text-[#F59E0B]">
                      +{leakLow} to +{topLeak.marks}
                    </span>{" "}
                    marks.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <AddCustomTaskModal
        open={isAddTaskOpen}
        onClose={() => setAddTaskOpen(false)}
        lockedTaskType="Practice"
        title="Add Custom Practice Task"
      />
    </div>
  );
}
