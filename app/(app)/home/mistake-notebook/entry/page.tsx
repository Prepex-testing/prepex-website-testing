import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import { Button } from "@/components/ui/Button";
import {
  ArrowLeftIcon,
  BellIcon,
  BookIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  CheckIcon,
  CalendarIcon,
  RefreshIcon,
} from "@/components/ui/icons";

const OPTIONS = [
  { key: "A", value: "2√11" },
  { key: "B", value: "3√5" },
  { key: "C", value: "√65" },
  { key: "D", value: "4/2" },
];

const CORRECT_KEY = "C";

type ScheduleStatus = "done" | "current" | "upcoming";

const SCHEDULE: { date: string; label: string; status: ScheduleStatus }[] = [
  { date: "24/06", label: "Initial", status: "done" },
  { date: "27/06", label: "Review 1", status: "done" },
  { date: "Tomorrow", label: "Next Review", status: "current" },
  { date: "04/07", label: "Review 3", status: "upcoming" },
  { date: "11/07", label: "Review 4", status: "upcoming" },
];

export default function MistakeNotebookEntryPage() {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/home/mistake-notebook"
            aria-label="Back to Mistake Notebook"
            className="text-ink"
          >
            <ArrowLeftIcon />
          </Link>
          <h1 className="text-h1 text-ink">Mistake Notebook</h1>
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

      <div>
        <h2 className="text-h2 text-ink">Coordinate Geometry • Common Tangents</h2>
        <div className="mt-1 flex items-center gap-2">
          <span className="rounded-full bg-cta/10 px-2 py-0.5 text-[10px] font-bold uppercase text-cta">
            Concept
          </span>
          <span className="text-xs text-muted">Added on 24 Jun 2025</span>
        </div>
      </div>

      <div className="rounded-2xl border border-brand/10 bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-bold text-ink">
            <BookIcon />
            Original Question
          </p>
          <Button variant="secondary" size="sm">
            View in Practice ↗
          </Button>
        </div>

        <p className="mt-3 text-sm text-body-text">
          Find the length of the common tangents to the circles x² + y² = 25 and (x−6)² +
          y² = 16.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {OPTIONS.map((option) => (
            <div
              key={option.key}
              className={`rounded-xl border p-3 text-center ${
                option.key === CORRECT_KEY
                  ? "border-brand bg-tint-strong"
                  : "border-brand/15"
              }`}
            >
              <span className="text-xs font-bold text-muted">{option.key}</span>
              <p className="text-sm font-semibold text-ink">{option.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl bg-warning/10 p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-warning">
            <AlertTriangleIcon />
            Your Answer (Incorrect)
          </p>
          <p className="mt-1 text-sm text-body-text">
            You selected <span className="font-semibold">Option B</span>
          </p>
          <span className="mt-2 inline-block rounded-full bg-surface px-3 py-1 text-xs font-semibold text-warning">
            3√5
          </span>
        </div>

        <div className="mt-3 rounded-xl bg-success-bg p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-success">
            <CheckCircleIcon />
            Correct Answer
          </p>
          <p className="mt-1 text-sm text-body-text">Option C</p>
          <span className="mt-2 inline-block rounded-full bg-surface px-3 py-1 text-xs font-semibold text-success">
            √65
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-brand/10 p-4">
            <p className="text-sm font-bold text-ink">Mistake Tag</p>
            <p className="mt-1 text-sm font-semibold text-cta">Concept</p>
            <p className="mt-1 text-xs text-muted">
              You struggled with understanding the concept.
            </p>
          </div>
          <div className="rounded-xl border border-brand/10 p-4">
            <p className="text-sm font-bold text-ink">Student Note</p>
            <div className="mt-1 rounded-lg bg-tint-strong p-2 text-xs italic text-muted">
              &ldquo;I need to memorize the 4 tangent cases.&rdquo;
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-brand/10 bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-ink">
              <CalendarIcon />
              Revision Schedule
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
              Spaced Repetition Track
            </p>
          </div>
          <span className="rounded-full bg-success-bg px-2 py-0.5 text-[10px] font-bold uppercase text-success">
            On Track
          </span>
        </div>

        <div className="mt-6 overflow-x-auto">
        <div className="relative flex min-w-105 items-start justify-between px-2">
          <div className="absolute left-6 right-6 top-4 h-0.5 bg-brand/10" />
          {SCHEDULE.map((step) => (
            <div
              key={step.label}
              className="relative z-10 flex flex-col items-center gap-1.5 text-center"
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                  step.status === "done"
                    ? "border-brand bg-brand text-white"
                    : step.status === "current"
                      ? "border-brand bg-surface text-ink ring-4 ring-tint-strong"
                      : "border-brand/15 bg-surface"
                }`}
              >
                {step.status === "done" && <CheckIcon />}
                {step.status === "current" && (
                  <span className="h-2 w-2 rounded-full bg-brand" />
                )}
              </span>
              <span
                className={`text-[10px] font-bold uppercase ${
                  step.status === "current" ? "text-ink" : "text-muted"
                }`}
              >
                {step.date}
              </span>
              <span className="text-[10px] text-muted">{step.label}</span>
            </div>
          ))}
        </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 rounded-xl border border-brand/10 p-4 sm:grid-cols-2">
          <div>
            <p className="flex items-center gap-1 text-xs font-bold text-ink">
              <RefreshIcon />
              Review Count
            </p>
            <p className="mt-1 text-2xl font-extrabold text-ink">3</p>
            <p className="text-[11px] text-muted">Times Reviewed</p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-semibold text-muted">Last Reviewed</p>
            <p className="mt-1 text-sm font-bold text-ink">
              27 Jun 2025 <span className="font-normal text-muted">(2 days ago)</span>
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        <Button variant="primary">
          <RefreshIcon />
          Review Now
        </Button>
        <p className="text-xs text-muted">Start a fresh attempt</p>
      </div>
    </div>
  );
}
