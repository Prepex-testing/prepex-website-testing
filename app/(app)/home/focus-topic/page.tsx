"use client";

import { Suspense, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
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
  BellIcon,
} from "@/assets/icons";
import {
  getFocusTopic,
  getWeaknessTopicDetail,
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

const ACTION_ICONS: ReactNode[] = [<PlayIcon key="0" />, <NoteIcon key="1" />, <LoderIcon key="2" />];

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

  const [detail, setDetail] = useState<WeaknessTopicDetail | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Link href="/home" aria-label="Back to Home" className="text-ink">
          <ArrowLeftIcon />
        </Link>
        <h1 className="text-h1 text-ink">This Week&apos;s Focus Topic</h1>
      </div>
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
  );

  if (isLoading) {
    return <PageLoader label="Loading focus topic…" />;
  }

  if (error || !detail) {
    return (
      <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
        {header}
        <p className="py-8 text-center text-sm text-warning">
          {error ?? "No weakness data for this topic yet. Keep practising and check back soon."}
        </p>
      </div>
    );
  }

  const score = Math.round(Number(detail.weaknessScore));
  const subjectName = detail.chapter?.subject?.name ?? null;

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      {header}

      {/* Main card */}
      <div className="overflow-hidden rounded-2xl border border-brand/10 bg-surface">
        {/* Top: title + tags + score circle */}
        <div className="flex items-center justify-between gap-6 p-8">
          {/* Left */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[18px] font-bold leading-none text-ink">
              {detail.chapter?.name ?? "Unknown topic"}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              {subjectName && (
                <span
                  className={`rounded-full px-3 py-1 text-[12px] font-bold leading-4 ${isDark ? "bg-white text-[#1A1A4E]" : "bg-tint-strong text-ink"}`}
                >
                  {subjectName}
                </span>
              )}

              <span className="flex items-center gap-1 rounded-full bg-cta/10 px-3 py-1 text-[12px] font-bold uppercase leading-4 tracking-[1.5px] text-cta">
                <span className="h-1.5 w-1.5 rounded-full bg-cta" />
                {priorityLabel(detail.weaknessTier)}
              </span>
            </div>
          </div>

          {/* Right */}
          <div className="flex shrink-0 flex-col items-center">
            <CircularProgress percent={score} label="Score" suffix="" size={88} />

            <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-muted whitespace-nowrap">
              {detail.tierLabel} Signal
            </p>
          </div>
        </div>

        {/* Two-column body */}
        <div className="grid grid-cols-1 sm:grid-cols-2">
          {/* Left: Signal Breakdown */}
          <div className="flex flex-col gap-6 border-t border-brand/10 p-8 sm:border-r">
            <p className="flex items-center gap-2 text-[14px] font-normal uppercase leading-[15px] tracking-[1px]">
              <ListIcon />
              Signal Breakdown
            </p>
            {detail.signalBreakdown.length === 0 ? (
              <p className="text-xs text-muted">Not enough signal data for this topic yet.</p>
            ) : (
              <div className="flex flex-col divide-y divide-brand/10">
                {detail.signalBreakdown.map((signal: WeaknessSignal) => (
                  <div key={signal.key} className="flex items-start gap-3 py-3 first:pt-0">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-icon-chip-bg text-ink dark:bg-[#FAF7F2]/8">
                      {SIGNAL_ICONS[signal.key]}
                    </span>
                    <div className="flex flex-col gap-0.5">
                      <p className="flex flex-wrap items-center gap-2 text-[14px] font-bold leading-5 text-ink">
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
          <div className="flex flex-col gap-6 border-t border-brand/10 p-8">
            <p className="text-[14px] font-normal uppercase leading-[15px] tracking-[1px]">
              Focus This Week
            </p>
            <div className="flex flex-col gap-4">
              {detail.recommendedActions.map((action, index) => (
                <div key={action.key} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-icon-chip-bg text-ink dark:bg-[#FAF7F2]/8">
                    {ACTION_ICONS[index % ACTION_ICONS.length]}
                  </span>
                  <p className="text-[14px] font-semibold leading-5 text-ink">{action.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer CTA — offered once the topic is a real concern (PRD 14.6) */}
        {detail.planAdjustmentAvailable && (
          <div className="bg-[#1A1A4E] p-8">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl p-4">
              <p className="text-[16px] font-bold leading-5 text-[#FAF7F2]">
                Plan adjustment available
              </p>
              <Link
                href="#"
                className="flex h-[54px] w-[224px] items-center justify-center gap-2 rounded-lg bg-[#FF7A59] px-3 text-[16px] font-bold leading-5 text-[#FAF7F2] transition-opacity hover:opacity-90"
              >
                Apply targeted week
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
