"use client";

import { Suspense, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { UserMenu } from "@/components/layout/UserMenu";
import { CircularProgress } from "@/components/ui/CircularProgress";
import { useTheme } from "@/components/theme/ThemeProvider";
import { ListIcon, CheckCircleIcon } from "@/components/ui/icons";
import { PageLoader } from "@/components/ui/PageLoader";
import {
  ClockIcon,
  LayersIcon,
  AlertTriangleIcon,
  PlayIcon,
  NoteIcon,
  LoderIcon,
  ArrowLeftIcon,
  } from "@/assets/icons";
import { ApiError } from "@/lib/api/http";
import { chapterResourcesHref } from "@/lib/revision/resourceLinks";
import {
  addToRevisionRotation,
  getFocusTopic,
  getWeaknessTopicDetail,
  startTargetedPractice,
  type WeaknessRecommendedAction,
  type WeaknessSignal,
  type WeaknessSignalKey,
  type WeaknessSignalLevel,
  type WeaknessTier,
  type WeaknessTopicDetail,
} from "@/lib/api/weakness";

const SIGNAL_STYLES: Record<WeaknessSignalLevel, string> = {
  high: "bg-tint text-ink",
  medium: "bg-warning/10 text-warning",
  low: "bg-brand/5 text-muted",
};

const SIGNAL_ICONS: Record<WeaknessSignalKey, ReactNode> = {
  practice: <LayersIcon />,
  revision: <AlertTriangleIcon />,
  abandonment: <ClockIcon />,
  time: <ClockIcon />,
};

const ACTION_ICONS: Record<string, ReactNode> = {
  watch_lecture: <PlayIcon />,
  targeted_practice: <NoteIcon />,
  revision_rotation: <LoderIcon />,
};

const ACTION_ROW =
  "flex w-full items-center gap-3 rounded-xl p-2 -mx-2 text-left transition-colors hover:bg-tint-strong disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent";

/** Signal and action icon chip — a 32×32 circle holding a 14×14 icon, whatever
 *  size the source SVG was exported at. Same on every screen: already compact,
 *  and shrinking it further would make the tap row harder to hit. */
const ICON_CHIP =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-icon-chip-bg text-ink dark:bg-[#FAF7F2]/8 [&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:shrink-0";

function formatDay(iso: string | null): string {
  if (!iso) return "soon";
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

function priorityLabel(tier: WeaknessTier): string {
  if (tier === "CRITICAL" || tier === "STRONG") return "High Priority";
  if (tier === "MODERATE") return "Moderate Priority";
  if (tier === "MILD") return "Mild Priority";
  return "On Track";
}

export default function FocusTopicPage() {
  return (
    <Suspense fallback={null}>
      <FocusTopicContent />
    </Suspense>
  );
}

function FocusTopicContent() {
  const searchParams = useSearchParams();
  const chapterIdParam = searchParams.get("chapterId");
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const router = useRouter();
  const [detail, setDetail] = useState<WeaknessTopicDetail | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // "Focus This Week" actions — which one is running, and what each reported.
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ key: string; ok: boolean; text: string } | null>(null);
  // "Apply targeted week" is a one-shot — it reads "Applied" once it has run.
  const [targetedWeekApplied, setTargetedWeekApplied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // With a chapterId in the URL (from "Where to focus next"), load that topic.
    // Without one (opened as "This Week's Focus Topic"), resolve the stabilised
    // Top Focus Topic first, then load its detail.
    const load = async () => {
      try {
        const chapterId =
          chapterIdParam ?? (await getFocusTopic()).focusTopic?.chapterId ?? null;
        const result = chapterId ? await getWeaknessTopicDetail(chapterId) : null;
        if (!cancelled) setDetail(result);
      } catch {
        if (!cancelled) setError("Couldn't load this topic. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [chapterIdParam]);

  // Phones: back arrow + actions share the top row, the title gets its own
  // full-width row (the actions alone are ~220px). sm+: one row.
  const header = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <Link href="/home" aria-label="Back to Home" className="order-1 flex h-11 shrink-0 items-center text-ink">
        <ArrowLeftIcon />
      </Link>
      <h1 className="order-3 min-w-0 basis-full break-words text-[22px] font-bold leading-tight text-ink sm:order-2 sm:flex-1 sm:basis-auto sm:truncate lg:text-h1 lg:leading-normal">
        This Week&apos;s Focus Topic
      </h1>
      <div className="order-2 ml-auto flex shrink-0 items-center gap-2 sm:order-3 sm:gap-4">
        <ThemeToggle />
        <NotificationBell />
        <UserMenu />
      </div>
    </div>
  );

  if (isLoading) {
    return <PageLoader label="Loading focus topic…" />;
  }

  if (error || !detail) {
    return (
      <div className="flex flex-col gap-4 p-4 sm:gap-6 sm:p-6 lg:p-8">
        {header}
        <p className="py-8 text-center text-sm text-warning">
          {error ?? "No weakness data for this topic yet. Keep practising and check back soon."}
        </p>
      </div>
    );
  }

  const score = Math.round(Number(detail.weaknessScore));
  const subjectName = detail.chapter?.subject?.name ?? null;
  const chapterName = detail.chapter?.name ?? null;
  const lectureHref = subjectName && chapterName ? chapterResourcesHref(subjectName, chapterName, "YOUTUBE") : null;

  const runPractice = async () => {
    setBusyAction("targeted_practice");
    setActionMessage(null);
    try {
      const { data } = await startTargetedPractice(detail.chapterId);
      router.push(`/practice?taskId=${data.taskId}`);
    } catch (err) {
      setActionMessage({
        key: "targeted_practice",
        ok: false,
        text: err instanceof ApiError ? err.message : "Couldn't start the practice set. Please try again.",
      });
      setBusyAction(null);
    }
  };

  // Shared by "Add to revision rotation" and the footer's "Apply targeted
  // week" — both pull the chapter back into revision (stage − 1, next
  // revision brought forward). `source` decides whose button shows the result.
  const runRotation = async (source: "revision_rotation" | "targeted_week" = "revision_rotation") => {
    setBusyAction(source);
    setActionMessage(null);
    try {
      const { data } = await addToRevisionRotation(detail.chapterId);
      if (source === "targeted_week") setTargetedWeekApplied(true);
      setActionMessage({
        key: source,
        ok: true,
        text: `${source === "targeted_week" ? "Applied" : "Added"} — next revision ${formatDay(data.nextRevisionAt)}, every ${data.currentIntervalDays ?? 1} day${data.currentIntervalDays === 1 ? "" : "s"} for now.`,
      });
    } catch (err) {
      setActionMessage({
        key: source,
        ok: false,
        text: err instanceof ApiError ? err.message : "Couldn't update your revision schedule. Please try again.",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const renderAction = (action: WeaknessRecommendedAction) => {
    const icon = (
      <span className={ICON_CHIP}>
        {ACTION_ICONS[action.key] ?? <NoteIcon />}
      </span>
    );
    const label = <span className="text-[13px] font-semibold leading-5 text-ink sm:text-[14px]">{action.label}</span>;

    if (action.key === "watch_lecture") {
      return lectureHref ? (
        <Link href={lectureHref} className={ACTION_ROW}>
          {icon}
          {label}
        </Link>
      ) : (
        <button type="button" disabled className={ACTION_ROW}>
          {icon}
          {label}
        </button>
      );
    }

    const isPractice = action.key === "targeted_practice";
    const isBusy = busyAction === action.key;
    return (
      <button
        type="button"
        onClick={isPractice ? runPractice : () => runRotation()}
        disabled={busyAction !== null}
        className={ACTION_ROW}
      >
        {icon}
        <span className="flex min-w-0 flex-col">
          {label}
          {isBusy && (
            <span className="text-[11px] text-muted sm:text-[12px]">{isPractice ? "Preparing your questions…" : "Updating your schedule…"}</span>
          )}
        </span>
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-4 p-4 sm:gap-6 sm:p-6 lg:p-8">
      {header}

      {/* Main card */}
      <div className="overflow-hidden rounded-2xl border border-brand/10 bg-surface">
        {/* Top: title + tags + score circle */}
        <div className="flex items-center justify-between gap-4 p-4 sm:gap-6 sm:p-6 lg:p-8">
          {/* Left — the title wraps on phones (beside the 88px ring there's
              only ~200px), and truncates from sm up. */}
          <div className="min-w-0 flex-1">
            <p className="break-words text-[16px] font-bold leading-6 text-ink sm:truncate sm:text-[18px] sm:leading-none">
              {detail.chapter?.name ?? "Unknown topic"}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              {subjectName && (
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold leading-4 sm:px-3 sm:text-[12px] ${isDark ? "bg-white text-[#1A1A4E]" : "bg-tint-strong text-ink"}`}
                >
                  {subjectName}
                </span>
              )}

              <span className="flex items-center gap-1 rounded-full bg-cta/10 px-2.5 py-1 text-[11px] font-bold uppercase leading-4 tracking-[1px] text-cta sm:px-3 sm:text-[12px] sm:tracking-[1.5px]">
                <span className="h-1.5 w-1.5 rounded-full bg-cta" />
                {priorityLabel(detail.weaknessTier)}
              </span>
            </div>
          </div>

          {/* Right */}
          <div className="flex shrink-0 flex-col items-center">
            <CircularProgress percent={score} label="Score" suffix="" size={88} />

            <p className="mt-2 whitespace-nowrap text-[10px] font-bold uppercase tracking-wide text-ink sm:text-[12px]">
              {detail.tierLabel} Signal
            </p>
          </div>
        </div>

        {/* Two-column body */}
        {/* Two columns from md — at sm each column was only ~230px inside 32px padding. */}
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Left: Signal Breakdown */}
          <div className="flex flex-col gap-4 border-t border-brand/10 p-4 sm:gap-6 sm:p-6 md:border-r lg:p-8">
            <p className="flex items-center gap-2 text-[12px] font-normal uppercase leading-[15px] tracking-[1px] sm:text-[14px]">
              <ListIcon />
              Signal Breakdown
            </p>
            {detail.signalBreakdown.length === 0 ? (
              <p className="text-xs text-muted">Not enough signal data for this topic yet.</p>
            ) : (
              <div className="flex flex-col divide-y divide-brand/10">
                {detail.signalBreakdown.map((signal: WeaknessSignal) => (
                  <div key={signal.key} className="flex items-start gap-3 py-3 first:pt-0">
                    <span className={ICON_CHIP}>
                      {SIGNAL_ICONS[signal.key]}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <p className="flex flex-wrap items-center gap-2 text-[13px] font-bold leading-5 text-ink sm:text-[14px]">
                        {signal.title}
                        {signal.level && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${SIGNAL_STYLES[signal.level]}`}
                          >
                            {signal.level} Signal
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted">{signal.description}</p>
                      {signal.note && (
                        <p className="mt-1 flex items-center gap-1 text-[10px] sm:text-[11px] md:text-[12px] font-medium leading-[17px] text-success">
                          <CheckCircleIcon className="h-[14px] w-[14px] shrink-0 sm:h-4 sm:w-4" />
                          <span className="truncate">{signal.note}</span>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
  
          {/* Right: Focus This Week */}
          <div className="flex flex-col gap-4 border-t border-brand/10 p-4 sm:gap-6 sm:p-6 lg:p-8">
            <p className="text-[12px] font-normal uppercase leading-[15px] tracking-[1px] sm:text-[14px]">
              Focus This Week
            </p>
            <div className="flex flex-col gap-2">
              {detail.recommendedActions.map((action) => (
                <div key={action.key}>
                  {renderAction(action)}
                  {actionMessage?.key === action.key && (
                    <p
                      role={actionMessage.ok ? "status" : "alert"}
                      className={`ml-11 text-[11px] font-medium sm:text-[12px] ${actionMessage.ok ? "text-success" : "text-danger"}`}
                    >
                      {actionMessage.text}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer CTA — offered once the topic is a real concern (PRD 14.6) */}
        {detail.planAdjustmentAvailable && (
          <div className="bg-[#1A1A4E] p-4 sm:p-6 lg:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl sm:gap-4 sm:p-4">
              <div className="min-w-0">
                <p className="text-[15px] font-bold leading-5 text-[#FAF7F2] sm:text-[16px]">
                  Plan adjustment available
                </p>
                {actionMessage?.key === "targeted_week" && (
                  <p
                    role={actionMessage.ok ? "status" : "alert"}
                    className={`mt-1 text-[11px] font-medium sm:text-[12px] ${actionMessage.ok ? "text-[#FAF7F2]/80" : "text-[#FF7A59]"}`}
                  >
                    {actionMessage.text}
                  </p>
                )}
              </div>
              {/* Same action as "Add to revision rotation". */}
              <button
                type="button"
                onClick={() => runRotation("targeted_week")}
                disabled={busyAction !== null || targetedWeekApplied}
                // Full-width on phones (it wraps under the heading); 224×54 from sm.
                className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#FF7A59] px-3 text-[15px] font-bold leading-5 text-[#FAF7F2] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70 sm:h-[54px] sm:w-[224px] sm:text-[16px]"
              >
                {busyAction === "targeted_week" ? "Applying…" : targetedWeekApplied ? "Applied" : "Apply targeted week"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
