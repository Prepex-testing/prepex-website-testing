import Link from "next/link";
import { UserMenu } from "@/components/layout/UserMenu";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
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

const TONE_CLASSES: Record<Tone, { icon: string; badge: string }> = {
  danger: { icon: "bg-danger-bg text-danger", badge: "text-danger" },
  warning: { icon: "bg-warning-bg text-warning", badge: "text-warning" },
  info: { icon: "bg-info-bg text-info", badge: "text-info" },
  success: { icon: "bg-success-bg text-success", badge: "text-success" },
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
      <div className="flex flex-wrap items-center justify-between gap-6 rounded-3xl border border-brand/10 bg-surface px-6 py-6 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_1px_3px_rgba(0,0,0,0.05)] sm:pt-8">
        <div className="flex min-w-0 items-center gap-5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-tint text-ink [&>svg]:h-6 [&>svg]:w-6">
            <FileIcon />
          </span>
          <div className="min-w-0">
            <p className="text-lg font-bold text-ink">Allen GT 14</p>
            <p className="text-sm font-semibold text-muted">Full Syllabus Mock</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-8 sm:gap-12">
          {HEADER_STATS.map((stat) => (
            <div key={stat.label} className="flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-sm font-medium text-muted">
                {stat.label}
                <span className="[&>svg]:h-3.5 [&>svg]:w-3.5">{stat.icon}</span>
              </span>
              <span className="text-sm font-bold text-ink">{stat.value}</span>
            </div>
          ))}
        </div>
        <Button variant="secondary" size="sm" className="shrink-0">
          <DownloadIcon />
          Download Report
        </Button>
      </div>

      {/* Score summary row */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="flex flex-col justify-center rounded-2xl border border-brand/10 bg-surface p-8 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_1px_3px_rgba(0,0,0,0.05)]">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted">
            Total Score
          </p>
          <p className="mt-2 flex items-baseline gap-1">
            <span className="text-4xl font-extrabold text-ink">168</span>
            <span className="text-xl font-semibold text-muted">/300</span>
          </p>
          <div className="mt-4 flex w-fit items-center gap-3 rounded-xl bg-success-bg px-3 py-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success/15 text-success [&>svg]:h-4 [&>svg]:w-4">
              <TrendingUpIcon />
            </span>
            <div>
              <p className="text-sm font-bold leading-tight text-success">12 Marks</p>
              <p className="text-[11px] leading-tight text-success/80">vs last mock</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-brand/10 bg-surface p-8 text-center shadow-[0_1px_2px_rgba(0,0,0,0.03),0_1px_3px_rgba(0,0,0,0.05)]">
          <CircularProgress
            percent={56}
            label="Accuracy"
            size={100}
            trackColor="var(--tint-strong)"
            progressColor="var(--brand)"
          />
        </div>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-brand/10 bg-surface p-8 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_1px_3px_rgba(0,0,0,0.05)]">
          <PercentileGauge value={82} label="Percentile" size={110} />
        </div>
      </div>

      {/* AI insight */}
      <div className="flex items-start gap-4 rounded-2xl border border-brand/20 bg-surface p-6">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-tint text-brand [&>svg]:h-6 [&>svg]:w-6">
          <SparkleIcon />
        </span>
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-ink">AI Insight</p>
          <p className="mt-1 text-base leading-6 text-body-text">
            Insight detected: You spent <strong className="font-bold">90 min</strong> on{" "}
            <strong className="font-bold">Maths</strong> (your middle subject), leaving only{" "}
            <strong className="font-bold">45 min</strong> for{" "}
            <strong className="font-bold">Chemistry</strong>. Your{" "}
            <strong className="font-bold">12 &lsquo;Time Pressure&rsquo; errors</strong> were all
            in Chemistry.
          </p>
        </div>
      </div>

      {/* Mistake patterns + side column */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[11fr_10fr]">
        <div className="flex flex-col gap-6 rounded-2xl border border-brand/10 bg-surface p-6 shadow-[0_8px_32px_rgba(23,22,88,0.04)] backdrop-blur-xl">
          <p className="text-xl font-bold text-ink">Mistake Patterns &middot; ALLEN GT 14</p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {MISTAKE_PATTERNS.map((pattern) => {
              const tone = TONE_CLASSES[pattern.tone];
              return (
                <div
                  key={pattern.label}
                  className="flex flex-col gap-1 rounded-2xl border border-brand/10 bg-tint-strong/30 p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={`flex h-10.5 w-10.5 items-center justify-center rounded-lg ${tone.icon} [&>svg]:h-5 [&>svg]:w-5`}
                    >
                      {pattern.icon}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-wide ${tone.badge}`}
                    >
                      {pattern.badge}
                    </span>
                  </div>
                  <p className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-ink">
                      {pattern.marksValue}
                    </span>
                    <span className="text-xs font-medium text-muted">Marks</span>
                  </p>
                  <p className="text-sm font-semibold text-ink">{pattern.label}</p>
                  <p className="text-xs text-muted">{pattern.description}</p>
                  <p className="mt-2 border-t border-brand/10 pt-2 text-[11px] text-muted">
                    {pattern.detail}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl border border-warning bg-warning-bg p-6 text-sm leading-5 text-body-text">
            <strong className="font-bold">
              Biggest score leak: Conceptual Gaps. Focus on these areas to recover
            </strong>{" "}
            <span className="font-bold text-cta">+12 to +16 marks.</span>
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
                    <span className="font-bold text-ink">{subject.percent}/100</span>
                    <span className="flex items-center gap-1 font-bold text-ink">
                      {subject.percent}%
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
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-xs font-bold text-white">
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

            <div className="rounded-lg border border-brand/10 bg-tint-strong p-4">
              <p className="text-[11px] font-bold uppercase tracking-[1.1px] text-ink">
                Strategy Note
              </p>
              <p className="mt-2 text-xs leading-5 text-muted">
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
          <SwapVerticalIcon />
          Swap &amp; Solve
        </Button>
      </div>

      <div className="rounded-2xl bg-brand py-3 text-center text-xs font-medium text-white">
        Mock scores never visible to partner.
      </div>
    </div>
  );
}
