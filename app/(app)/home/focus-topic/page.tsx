"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import { Button } from "@/components/ui/Button";
import { CircularProgress } from "@/components/ui/CircularProgress";
import { useTheme } from "@/components/theme/ThemeProvider";
import {
  ArrowLeftIcon,
  BellIcon,
  ListIcon,
  CheckCircleIcon,
  // FileIcon,
  TargetIcon,
  // AlertTriangleIcon,
  // ClockIcon,
  // PlayIcon,
  // PencilIcon,
  // RefreshIcon,
} from "@/components/ui/icons";
import {ClockIcon,FileIcon,LayersIcon,AlertTriangleIcon,PlayIcon,NoteIcon,LoderIcon} from "@/assets/icons";
type SignalLevel = "high" | "medium";

// HIGH -> navy/lavender pill (matches "Coordinate Geometry" tag treatment in both screenshots)
// MEDIUM -> orange pill (matches "MEDIUM SIGNAL" in the screenshot)
const SIGNAL_STYLES: Record<SignalLevel, string> = {
  high: "bg-tint text-ink",
  medium: "bg-warning/10 text-warning",
};

const SIGNALS: {
  icon: React.ReactNode;
  title: string;
  signal: SignalLevel | null;
  description: string;
  note?: string;
}[] = [
    {
      icon: <FileIcon />,
      title: "Mock data",
      signal: "high",
      description: "0/3 correct in last mock",
    },
    {
      icon: <LayersIcon />,
      title: "Practice accuracy",
      signal: "high",
      description: "38% across 13 attempts",
    },
    {
      icon: <AlertTriangleIcon />,
      title: "Revision difficulty",
      signal: "medium",
      description: "2 Hard ratings recently",
    },
    {
      icon: <ClockIcon />,
      title: "Task abandonment",
      signal: null,
      description: "Skipped 3 sessions on this topic",
      note: "Corroborated by accuracy data",
    },
  ];

const FOCUS_ACTIONS = [
  { icon: <PlayIcon />, text: "Watch foundation lecture (Library)" },
  { icon: <NoteIcon />, text: "Practice 10 questions targeted" },
  { icon: <LoderIcon />, text: "Add to revision rotation" },
];

export default function FocusTopicPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/home" aria-label="Back to Home" className="text-ink">
            <ArrowLeftIcon />
          </Link>
          <h1 className="text-h1 text-ink">This Week&apos;s Focus Topic</h1>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <button
            type="button"
            aria-label="Notifications"
            className="flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-tint-strong"
          >
            <BellIcon />
          </button>
          <UserMenu />
        </div>
      </div>

      {/* Main card */}
      <div className="overflow-hidden rounded-2xl border border-brand/10 bg-surface">
        {/* Top: title + tags + score circle */}
        <div className="flex items-center justify-between gap-6 p-8">
          {/* Left */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[18px] font-bold leading-none text-ink">
              Coord Geo · Common Tangents
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-[12px] font-bold leading-4 ${isDark ? "bg-white text-[#1A1A4E]" : "bg-tint-strong text-ink"}`}
              >
                Coordinate Geometry
              </span>

              <span className="flex items-center gap-1 rounded-full bg-cta/10 px-3 py-1 text-[12px] font-bold uppercase leading-4 tracking-[1.5px] text-cta">
                <span className="h-1.5 w-1.5 rounded-full bg-cta" />
                High Priority
              </span>
            </div>
          </div>

          {/* Right */}
          <div className="flex shrink-0 flex-col items-center">
            <CircularProgress
              percent={78}
              label="Score"
              suffix=""
              size={88}
            />

            <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-muted whitespace-nowrap">
              Strong Signal
            </p>
          </div>
        </div>

        {/* Two-column body */}
        <div className="grid grid-cols-1 sm:grid-cols-2">
          {/* Left: Signal Breakdown */}
          <div className="flex flex-col gap-6 border-t border-brand/10 p-8 sm:border-r">
            <p className="flex items-center gap-2 text-[14px] font-normal uppercase leading-[15px] tracking-[1px] text-muted">
              <ListIcon />
              Signal Breakdown
            </p>
            <div className="flex flex-col divide-y divide-brand/10">
              {SIGNALS.map((signal) => (
                <div key={signal.title} className="flex items-start gap-3 py-3 first:pt-0">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-icon-chip-bg text-ink dark:bg-[#FAF7F2]/8">
                    {signal.icon}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <p className="flex flex-wrap items-center gap-2 text-[14px] font-bold leading-5 text-ink">
                      {signal.title}
                      {signal.signal && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${SIGNAL_STYLES[signal.signal]}`}
                        >
                          {signal.signal} Signal
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted">{signal.description}</p>
                    {signal.note && (
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-success">
                        <CheckCircleIcon />
                        {signal.note}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Focus This Week */}
          <div className="flex flex-col gap-6 border-t border-brand/10 p-8">
            <p className="text-[14px] font-normal uppercase leading-[15px] tracking-[1px] text-muted">
              Focus This Week
            </p>
            <div className="flex flex-col gap-4">
              {FOCUS_ACTIONS.map((action) => (
                <div key={action.text} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-icon-chip-bg text-ink dark:bg-[#FAF7F2]/8">
                    {action.icon}
                  </span>
                  <p className="text-[14px] font-semibold leading-5 text-ink">
                    {action.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer CTA — fixed navy/orange, same in both themes per screenshots */}
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
      </div>
    </div>
  );
}