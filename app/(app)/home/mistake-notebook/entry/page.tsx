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
  ExternalLinkIcon,
  CircleXIcon,
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

      <div className="flex w-full min-w-0 flex-col gap-2">
        <h2 className="truncate text-[20px] sm:text-[22px] lg:text-[24px] font-bold leading-8 text-ink">
          Coordinate Geometry &bull; Common Tangents
        </h2>

        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-tint px-3 py-1 text-[12px] font-semibold leading-4 text-ink">
            Concept
          </span>

          <span className="text-[12px] font-medium leading-4 text-muted">
            Added on 24 Jun 2025
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-brand/10 bg-surface p-6 shadow-sm sm:p-8">
        {/* Header row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-[18px] font-bold leading-7 text-ink">
            <BookIcon />
            Original Question
          </p>
          <Link
            href="#"
            className="inline-flex h-[30px] items-center justify-center gap-1.5 rounded-lg border border-brand px-3 text-[12px] font-semibold leading-4 text-ink transition-colors hover:bg-tint"
          >
            View in Practice
            <ExternalLinkIcon />
          </Link>
        </div>

        {/* Question text */}
        <p className="mt-4 text-[16px] leading-[26px] text-body-text">
          Find the length of the common tangents to the circles x² + y² = 25 and
          (x − 6)² + y² = 16.
        </p>

        {/* Options row */}
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {OPTIONS.map((option) => (
            <div
              key={option.key}
              className={`flex items-center gap-4 rounded-lg border p-3 ${option.key === CORRECT_KEY
                ? "border-brand bg-tint"
                : "border-brand/10 bg-tint-strong/40"
                }`}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-brand/15 bg-surface text-[14px] font-bold leading-5 text-muted">
                {option.key}
              </span>
              <p className="text-[16px] font-medium leading-6 text-body-text underline decoration-1 underline-offset-2">
                {option.value}
              </p>
            </div>
          ))}
        </div>
      </div>


      <div className="rounded-xl border border-warning/50 bg-warning-bg p-5">
        <p className="flex items-center gap-2 text-[16px] font-bold leading-6 text-warning">
          <CircleXIcon />
          Your Answer (Incorrect)
        </p>
        <p className="mt-3 text-[14px] leading-5 text-body-text">
          You selected <span className="font-bold text-ink">Option B</span>
        </p>
        <span className="mt-3 inline-flex h-[42px] items-center justify-center rounded-lg border border-warning bg-warning/10 px-6 text-[14px] font-bold text-warning">
          3√5
        </span>
      </div>


      <div className="mt-3 rounded-xl border border-success/50 bg-success-bg p-5">
        <p className="flex items-center gap-2 text-[16px] font-bold leading-6 text-success">
          <CheckCircleIcon />
          Correct Answer
        </p>
        <p className="mt-3 text-[14px] font-bold leading-5 text-ink">Option C</p>
        <span className="mt-3 inline-flex h-[42px] items-center justify-center rounded-lg border border-success bg-success/10 px-6 text-[14px] font-bold text-success">
          √65
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Mistake Tag */}
        <div className="flex flex-col gap-3 rounded-xl border border-brand/10 bg-surface p-6 shadow-sm">
          <p className="text-[16px] font-bold leading-6 text-ink">Mistake Tag</p>
          <span className="inline-flex w-fit items-center rounded-full bg-cta/10 px-3 py-1 text-[14px] font-semibold leading-5 text-cta">
            Concept
          </span>
          <p className="text-[14px] leading-[22.75px] text-muted">
            You struggled with understanding the concept.
          </p>
        </div>

        {/* Student Note */}
        <div className="flex flex-col gap-4 rounded-xl border border-brand/10 bg-surface p-6 shadow-sm">
          <p className="text-[16px] font-bold leading-6 text-ink">Student Note</p>
          <div className="rounded-lg border border-brand/10 bg-tint p-4">
            <p className="text-[14px] italic leading-5 text-ink">
              &ldquo;I need to memorize the 4 tangent cases.&rdquo;
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-brand/10 bg-surface p-6 shadow-[0px_1px_2px_0px_#C7D2FE80]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tint text-ink">
              <CalendarIcon />
            </span>
            <div>
              <p className="text-[16px] font-bold leading-6 text-ink">Revision Schedule</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                Spaced Repetition Track
              </p>
            </div>
          </div>
          <span className="rounded-full bg-success-bg px-3 py-1 text-[10px] font-bold uppercase text-success">
            On Track
          </span>
        </div>

        <div className="mt-8 overflow-x-auto">
          <div className="relative flex min-w-[720px] items-start justify-between px-2">
            {/* base faded line across full width */}
            <div className="absolute left-6 right-6 top-4 h-0.5 bg-brand/10" />
            {/* solid progress line up to current step */}
            <div
              className="absolute left-6 top-4 h-0.5 bg-brand"
              style={{
                width: `calc(${(SCHEDULE.findIndex((s) => s.status === "current") /
                  (SCHEDULE.length - 1)) *
                  100
                  }% - 24px)`,
              }}
            />
            {SCHEDULE.map((step) => (
              <div
                key={step.label}
                className="relative z-10 flex flex-col items-center gap-1.5 text-center"
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${step.status === "done"
                    ? "border-brand bg-brand text-white"
                    : step.status === "current"
                      ? "border-brand bg-surface text-ink"
                      : "border-dashed border-brand/15 bg-surface"
                    }`}
                >
                  {step.status === "done" && <CheckIcon />}
                  {step.status === "current" && (
                    <span className="h-2.5 w-2.5 rounded-full bg-brand" />
                  )}
                  {step.status === "upcoming" && (
                    <span className="h-1.5 w-1.5 rounded-full bg-brand/15" />
                  )}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase ${step.status === "upcoming" ? "text-muted/50" : "text-muted"
                    }`}
                >
                  {step.date}
                </span>
                <span
                  className={`text-[10px] font-semibold ${step.status === "upcoming" ? "text-muted/50" : "text-ink"
                    }`}
                >
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col items-stretch gap-6 rounded-xl border border-brand/10 bg-surface p-8 shadow-sm sm:flex-row sm:items-center sm:justify-center sm:gap-16 lg:gap-24">
        {/* Review Count */}
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="flex items-center gap-1.5 text-sm font-bold text-ink">
            <RefreshIcon />
            Review Count
          </p>
          <p className="text-[32px] font-extrabold leading-none text-ink">3</p>
          <p className="text-[12px] text-muted">Times Reviewed</p>
        </div>

        {/* Divider */}
        <div className="hidden h-16 w-px shrink-0 bg-brand/10 sm:block" />

        {/* Last Reviewed */}
        <div className="flex flex-col items-center gap-1 text-center sm:items-start sm:text-left">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">
            Last Reviewed
          </p>
          <p className="text-[14px] font-bold text-ink">
            27 Jun 2025{" "}
            <span className="font-normal text-muted">(2 days ago)</span>
          </p>
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
