"use client";

import Link from "next/link";
import { UserMenu } from "@/components/layout/UserMenu";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Button } from "@/components/ui/Button";
import { CircularProgress } from "@/components/ui/CircularProgress";
import { PercentileGauge } from "@/components/ui/PercentileGauge";
import {
  ArrowLeftIcon,
  BellIcon,
  FileIcon,
  DownloadIcon,
  SparkleIcon,
  BookIcon,
  AlertTriangleIcon,
  ClockIcon,
  HelpCircleIcon,
  SwapVerticalIcon,
  CalendarIcon,
  TrendingUpIcon,
} from "@/components/ui/icons";
import type { ReactNode } from "react";

type Tone = "danger" | "warning" | "info" | "success";
const TONE_CLASSES = {
  danger: {
    icon: "bg-danger-bg text-danger",
    badge: "bg-tint text-ink",
  },
  warning: {
    icon: "bg-warning-bg text-warning",
    badge: "bg-tint text-ink",
  },
  info: {
    icon: "bg-info-bg text-info",
    badge: "bg-tint text-ink",
  },
  success: {
    icon: "bg-success-bg text-success",
    badge: "bg-tint text-ink",
  },
};
const HEADER_STATS: { icon: ReactNode; label: string; value: string }[] = [
  { icon: <CalendarIcon />, label: "Test Date", value: "20 Nov 2026, Fri" },
  { icon: <ClockIcon />, label: "Duration", value: "180 min" },
  { icon: <FileIcon />, label: "Total Marks", value: "300" },
];

const MISTAKE_PATTERNS: {
  label: string;
  marksValue: string;
  description: string;
  detail: string;
  badge: string;
  tone: Tone;
  icon: ReactNode;
}[] = [
    {
      label: "Conceptual Gap",
      marksValue: "16",
      description: "Recoverable with targeted practice",
      detail: "14 questions",
      badge: "Critical",
      tone: "danger",
      icon: <BookIcon />,
    },
    {
      label: "Silly Error",
      marksValue: "12",
      description: "Recoverable with careful revision",
      detail: "15 questions",
      badge: "Optimize",
      tone: "warning",
      icon: <AlertTriangleIcon />,
    },
    {
      label: "Time Pressure",
      marksValue: "8",
      description: "Recoverable with time management",
      detail: "6 questions, avg extra 30 min",
      badge: "Strategic",
      tone: "info",
      icon: <ClockIcon />,
    },
    {
      label: "Wild Guess",
      marksValue: "4",
      description: "Recoverable with better elimination",
      detail: "12 questions, both negative marked",
      badge: "Refined",
      tone: "success",
      icon: <HelpCircleIcon />,
    },
  ];

const SUBJECT_PERFORMANCE = [
  { label: "Physics", percent: 62, delta: "+4" },
  { label: "Maths", percent: 55, delta: null },
  { label: "Chemistry", percent: 51, delta: "+6" },
];

const TEST_STRATEGY = [
  { label: "Physics", time: "52 min", pace: "1.2 min/m", percent: 56 },
  { label: "Maths", time: "90 min", pace: "1.5 min/m", percent: 100 },
  { label: "Chemistry", time: "45 min", pace: "1.6 min/m", percent: 50 },
];

export default function ViewAnalyticsPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="flex flex-col gap-8 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/home/mock-analysis"
            aria-label="Back to Mock Analysis"
            className="text-ink"
          >
            <ArrowLeftIcon />
          </Link>
          <h1 className="text-h1 text-ink">View Analytics</h1>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <button
            type="button"
            aria-label="Notifications"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-muted hover:bg-tint-strong"
          >
            <BellIcon />
          </button>
          <UserMenu />
        </div>
      </div>

      {/* Mock summary card */}
      <div className="flex flex-col gap-6 rounded-[24px] border border-brand/10 bg-surface px-[24px] pt-[32px] pb-[24px] shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.03)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.2)] sm:flex-row sm:items-center sm:justify-between">
        {/* Left Section */}
        <div className="flex items-center gap-5">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] bg-tint"
            style={isDark ? { backgroundColor: "var(--ink)" } : undefined}
          >
            <FileIcon />
          </div>

          <div>
            <h2 className="text-[18px] font-bold leading-[28px] text-ink">
              Allen GT 14
            </h2>

            <p className="text-[14px] font-medium leading-[20px] text-muted">
              Full Syllabus Mock
            </p>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex flex-wrap gap-4 sm:gap-[64px]">
          {HEADER_STATS.map((stat) => (
            <div key={stat.label} className="flex flex-col">
              {/* Label */}
              <span
                className="text-[14px] font-medium leading-[20px] text-muted"
                style={isDark ? { color: "var(--ink)" } : undefined}
              >
                {stat.label}
              </span>

              {/* Icon + Value */}
              <div className="mt-[4px] flex items-center gap-[6px]">
                <span
                  className="flex h-4 w-4 items-center justify-center text-ink [&>svg]:h-4 [&>svg]:w-4"
                  style={isDark ? { color: "var(--muted)" } : undefined}
                >
                  {stat.icon}
                </span>

                <span
                  className="text-[16px] font-bold leading-[24px] text-ink whitespace-nowrap"
                  style={isDark ? { color: "var(--muted)" } : undefined}
                >
                  {stat.value}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Score summary row */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">

        <div className="flex flex-col items-center rounded-[16px] border border-brand/10 bg-surface px-[32px] pt-[28px] pb-[24px] shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.03)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.2)]">
          {/* Title */}
          <p className="text-[18px] font-bold uppercase leading-[28px] tracking-[0.5px] text-muted">
            Total Score
          </p>

          {/* Score */}
          <div className="mt-3 flex items-end justify-center">
            <span className="text-[68px] font-extrabold leading-none text-ink">
              168
            </span>

            <span className="mb-[5px] text-[40px] font-bold leading-none text-muted/50">
              /300
            </span>
          </div>

          {/* Improvement */}
          <div
            className={`mt-6 flex w-full items-center gap-4 rounded-[16px] px-5 py-3 ${
              isDark ? "" : "bg-success-bg"
            }`}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] bg-success/20">
              <span className="text-success [&>svg]:h-6 [&>svg]:w-6">
                <TrendingUpIcon />
              </span>
            </div>

            <div>
              <p className="text-[18px] font-bold leading-[24px] text-success">
                ↑ 12 Marks
              </p>

              <p className="text-[16px] leading-[20px] text-muted">
                vs last mock
              </p>
            </div>
          </div>
        </div>


        <div className="flex flex-col items-center rounded-[16px] border border-brand/10 bg-surface px-[32px] py-[28px] shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.03)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.2)]">
          <CircularProgress
            percent={56}
            size={140}
            trackColor="var(--tint-strong)"
            progressColor={isDark ? "var(--ink)" : undefined}
            progressGradient={
              isDark ? undefined : { from: "#1A1A4E", to: "#4C1D95" }
            }
          />

          <p className="mt-5 text-[16px] font-semibold leading-none text-muted">
            Accuracy
          </p>
        </div>


        <div className="flex flex-col items-center justify-center rounded-[16px] border border-brand/10 bg-surface px-8 py-7 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.03)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.2)]">
          <PercentileGauge
            value={82}
            size={250}
            showLabel={false}
            progressColor={isDark ? "#4C1D95" : undefined}
          />

          <p className="-mt-3 text-[16px] font-semibold text-muted">
            Percentile
          </p>
        </div>
      </div>

      {/* AI insight */}
      <div className="flex items-start gap-4 rounded-2xl border border-brand/20 bg-surface p-6">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-tint text-brand [&>svg]:h-6 [&>svg]:w-6">
          <SparkleIcon />
        </span>
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-ink">AI Insight</p>
          <p
            className="mt-1 text-[18px] leading-6 text-body-text"
            style={{ color: isDark ? "var(--muted)" : "#374151" }}
          >
            Insight detected: You spent <strong className="font-bold">90 min</strong> on{" "}
            <strong className="font-bold">Maths</strong> (your middle subject), leaving only{" "}
            <strong className="font-bold">45 min</strong> for{" "}
            <strong className="font-bold">Chemistry</strong>. <br />Your{" "}
            <strong className="font-bold">12 &lsquo;Time Pressure&rsquo; errors</strong> were all
            in Chemistry.
          </p>
        </div>
      </div>

      {/* Mistake patterns + side column */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[11fr_10fr]">
        <div className="flex flex-col gap-6 rounded-2xl border border-brand/10 bg-surface p-6 shadow-[0_8px_32px_rgba(23,22,88,0.04)] backdrop-blur-xl">
          <p className="text-xl font-bold text-ink">Mistake Patterns &middot; ALLEN GT 14</p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {MISTAKE_PATTERNS.map((pattern) => {
              const tone = TONE_CLASSES[pattern.tone];

              return (
                <div
                  key={pattern.label}
                  className="flex h-[237px] flex-col rounded-2xl border border-brand/10 bg-tint-strong/30 p-5"
                >
                  {/* Icon + Badge */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`flex h-[42px] w-[42px] items-center justify-center rounded-[12px] [&>svg]:h-[18px] [&>svg]:w-[18px] ${tone.icon}`}
                    >
                      {pattern.icon}
                    </span>

                    <span
                      className={`inline-flex h-[23px] items-center justify-center rounded-[4px] px-2 py-1 font-['Plus_Jakarta_Sans'] text-[10px] font-black uppercase leading-[15px] ${tone.badge}`}
                    >
                      {pattern.badge}
                    </span>
                  </div>

                  {/* Title */}
                  <h3
                    className="mt-4 text-[14px] font-semibold leading-none text-muted break-words"
                    style={isDark ? { color: "var(--ink)" } : undefined}
                  >
                    {pattern.label}
                  </h3>

                  {/* Marks */}
                  <div className="mt-4 flex items-end gap-2">
                    <span className="text-[22px] font-bold leading-none text-ink">
                      {pattern.marksValue}
                    </span>

                    <span className="text-[14px] font-semibold leading-5 text-muted">
                      Marks
                    </span>
                  </div>

                  {/* Description */}
                  <p
                    className="mt-4 text-[14px] leading-5 text-muted break-words"
                    style={isDark ? { color: "var(--ink)" } : undefined}
                  >
                    {pattern.description}
                  </p>

                  {/* Push footer to bottom */}
                  <div className="flex-1" />

                  {/* Divider */}
                  <div className="border-t border-brand/10" />

                  {/* Footer */}
                  <p className="pt-4 text-[14px] font-semibold leading-5 text-muted break-words">
                    {pattern.detail}
                  </p>
                </div>
              );
            })}
          </div>

          <div
            className={`rounded-2xl p-6 text-sm leading-5 text-body-text ${
              isDark ? "bg-tint-strong" : "border border-warning bg-warning-bg"
            }`}
          >
            <strong className="font-bold">
              Biggest score leak: Conceptual Gaps. Focus on these areas to recover
            </strong>{" "}
            <span
              className="font-bold text-cta"
              style={!isDark ? { color: "#F59E0B" } : undefined}
            >
              +12 to +16 marks.
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-6 rounded-2xl border border-brand/10 bg-surface p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
            <p className="text-sm font-bold uppercase tracking-[0.4px] text-ink">
              Subject Performance
            </p>
            <div className="flex flex-col gap-4">
              {SUBJECT_PERFORMANCE.map((subject) => (
                <div key={subject.label} className="flex flex-col gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-muted">
                    {subject.label}
                  </span>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold">
                      <span className="text-ink">{subject.percent}</span>
                      <span className="text-muted/50">/100</span>
                    </span>

                    <span className="flex items-center gap-1 font-bold text-ink">
                      <span>{subject.percent}%</span>

                      {subject.delta && (
                        <span className="text-success">&uarr; {subject.delta}</span>
                      )}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-tint-strong">
                    <div
                      className="h-1.5 rounded-full bg-brand"
                      style={{ width: `${subject.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-6 rounded-2xl border border-brand/10 bg-surface p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <p className="text-sm font-bold uppercase tracking-[0.4px] text-ink">Test Strategy</p>
            <div className="flex flex-col gap-4">
              {TEST_STRATEGY.map((item, index) => (
                <div key={item.label} className="flex items-center gap-3">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink text-xs font-bold text-white"
                    style={isDark ? { color: "#1A1A4E" } : undefined}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-ink">{item.label}</span>
                      <span className="text-right leading-tight">
                        <span className="block text-xs font-bold text-ink">{item.time}</span>
                        <span className="block text-[11px] text-muted">{item.pace}</span>
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-tint-strong">
                      <div
                        className="h-1.5 rounded-full bg-brand"
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="w-full max-w-[320px] rounded-lg border border-brand/10 bg-tint-strong p-4">
              <p className="text-[11px] font-bold uppercase tracking-[1.1px] text-ink">
                Strategy Note
              </p>
              <p className="mt-2 text-link leading-5">
                Excessive time in Maths impacted Chemistry quality. Rebalance next time.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Swap & Solve */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-brand/10 bg-surface px-6 py-8">
        <div className="min-w-0">
          <p className="text-lg font-bold text-ink">Swap &amp; Solve</p>
          <p className="mt-1 text-sm font-semibold text-ink">Struggling with Conceptual Gaps?</p>
          <p className="text-sm text-muted">
            Swap the next practice session with a targeted Concept Builder session.
          </p>
        </div>
        <Button variant="primary" size="sm">
          Swap &amp; Solve
        </Button>
      </div>

      <div className="rounded-sm bg-tint-strong/30 py-3 text-center text-[16px] font-semibold leading-none text-ink">
        Mock scores never visible to partner.
      </div>
    </div>
  );
}
