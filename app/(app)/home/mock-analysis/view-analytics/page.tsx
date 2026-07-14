import Link from "next/link";
import { UserMenu } from "@/components/layout/UserMenu";
import { Button } from "@/components/ui/Button";
import { CircularProgress } from "@/components/ui/CircularProgress";
import {
  ArrowLeftIcon,
  BellIcon,
  RefreshIcon,
  FileIcon,
  DownloadIcon,
  SparkleIcon,
  BookIcon,
  AlertTriangleIcon,
  ClockIcon,
  HelpCircleIcon,
  SwapVerticalIcon,
} from "@/components/ui/icons";

const MISTAKE_PATTERNS = [
  {
    label: "Conceptual Gaps",
    marks: "36 Marks",
    description: "Misunderstood core concepts",
    detail: "24 questions",
    icon: <BookIcon />,
  },
  {
    label: "Silly Mistakes",
    marks: "12 Marks",
    description: "Careless calculation or reading errors",
    detail: "8 questions",
    icon: <AlertTriangleIcon />,
  },
  {
    label: "Time Pressure",
    marks: "8 Marks",
    description: "Rushed due to time management",
    detail: "6 questions",
    icon: <ClockIcon />,
  },
  {
    label: "Skipped / Guessed",
    marks: "4 Marks",
    description: "Left blank or randomly guessed",
    detail: "3 questions",
    icon: <HelpCircleIcon />,
  },
];

const SUBJECT_PERFORMANCE = [
  { label: "Physics", percent: 72 },
  { label: "Maths", percent: 58 },
  { label: "Chemistry", percent: 41 },
];

const TEST_STRATEGY = [
  { label: "Maths", time: "90 min avg" },
  { label: "Physics", time: "45 min avg" },
  { label: "Chemistry", time: "45 min avg" },
];

export default function ViewAnalyticsPage() {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
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
          <button
            type="button"
            aria-label="Refresh"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-muted hover:bg-tint-strong"
          >
            <RefreshIcon />
          </button>
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

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand/10 bg-surface p-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tint text-ink">
            <FileIcon />
          </span>
          <div className="min-w-0">
            <p className="text-base font-bold text-ink">Allen GT14</p>
            <p className="text-xs text-muted">
              Test Date: 30 Nov 2024 • Duration: 180 min • Total Marks: 300
            </p>
          </div>
        </div>
        <Button variant="secondary" size="sm">
          <DownloadIcon />
          Download Report
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-brand/10 bg-surface p-5">
          <p className="text-xs text-muted">Total Score</p>
          <p className="mt-1 text-2xl font-extrabold text-ink">168/300</p>
          <span className="mt-1 inline-block rounded-full bg-success-bg px-2 py-0.5 text-[10px] font-semibold text-success">
            +12 Marks
          </span>
        </div>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-brand/10 bg-surface p-5 text-center">
          <p className="text-xs text-muted">Accuracy</p>
          <p className="mt-1 text-2xl font-extrabold text-ink">56%</p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-brand/10 bg-surface p-5 text-center">
          <CircularProgress percent={82} label="Percentile" size={90} />
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-2xl bg-tint-strong p-4">
        <span className="mt-0.5 text-ink">
          <SparkleIcon />
        </span>
        <div>
          <p className="text-sm font-bold text-ink">AI Insight detected</p>
          <p className="text-xs text-muted">
            You spent 90 min on Maths (your mid-point subject), leaving only 45 min for
            Chemistry. Your 12 Time-Pressure errors were all in Chemistry.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-brand/10 bg-surface p-5">
          <p className="text-base font-bold text-ink">Mistake Patterns - ALLEN GT14</p>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {MISTAKE_PATTERNS.map((pattern) => (
              <div key={pattern.label} className="rounded-xl border border-brand/10 p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-ink">{pattern.icon}</span>
                  <span className="text-sm font-extrabold text-ink">{pattern.marks}</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-ink">{pattern.label}</p>
                <p className="text-xs text-muted">{pattern.description}</p>
                <p className="mt-1 text-[11px] text-muted">{pattern.detail}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl bg-cta/10 p-3 text-sm font-medium text-cta">
            Biggest score leak: Conceptual Gaps. Focus here to recover up to +36 Marks next
            mock.
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-brand/10 bg-surface p-4">
            <p className="text-sm font-bold text-ink">Subject Performance</p>
            <div className="mt-3 flex flex-col gap-3">
              {SUBJECT_PERFORMANCE.map((subject) => (
                <div key={subject.label}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-ink">{subject.label}</span>
                    <span className="text-muted">{subject.percent}%</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-tint-strong">
                    <div
                      className="h-1.5 rounded-full bg-brand"
                      style={{ width: `${subject.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-brand/10 bg-surface p-4">
            <p className="text-sm font-bold text-ink">Test Strategy</p>
            <div className="mt-3 flex flex-col gap-2">
              {TEST_STRATEGY.map((item, index) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between text-sm text-ink"
                >
                  <span className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-tint text-[10px] font-bold">
                      {index + 1}
                    </span>
                    {item.label}
                  </span>
                  <span className="text-xs text-muted">{item.time}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-lg bg-tint-strong p-3 text-xs text-muted">
              Excellent time discipline in Physics. Apply the same pacing to Chemistry next
              time.
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-brand/10 bg-surface p-5">
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink">Swap &amp; Solve</p>
          <p className="text-xs text-muted">
            Struggling with Conceptual Gaps? Swap your next mock for a focused
            Concept-Builder session instead.
          </p>
        </div>
        <Button variant="primary" size="sm">
          <SwapVerticalIcon />
          Swap &amp; Solve
        </Button>
      </div>

      <div className="rounded-2xl bg-brand py-3 text-center text-xs font-medium text-white">
        Mock scores are never visible to your partner.
      </div>
    </div>
  );
}
