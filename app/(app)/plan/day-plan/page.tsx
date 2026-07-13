import Link from "next/link";
import { CircularProgress } from "@/components/ui/CircularProgress";
import { ArrowLeftIcon, BellIcon, BoltIcon, ClockIcon, CheckIcon, BoltIcons } from "@/components/ui/icons";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";

const FOCUS_BREAKDOWN = [
  { subject: "Physics", value: "45m", total: "60m" },
  { subject: "Wellness", value: "10m", total: "10m" },
  { subject: "Maths", value: "50m", total: "45m" },
];

const TASK_LOG = [
  { subject: "Physics", title: "Newton's Laws (revision)", status: "done" as const },
  { subject: "Wellness", title: "Wellness · 10-min mindful walk", status: "done" as const },
  { subject: "Maths", title: "5 easy practice questions", status: "done" as const },
  { subject: "Chemistry", title: "Postponed for recovery", status: "skipped" as const },
];

const ENERGY_TREND = [30, 55, 40, 65, 45, 60, 25];

export default function DayPlanPage() {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/plan" aria-label="Back to Plan" className="text-ink">
            <ArrowLeftIcon />
          </Link>
          <h1 className="text-h1 text-ink">Day Plan</h1>
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

      <div className="flex flex-wrap items-center gap-3">
        <p className="text-base font-bold text-ink">Wednesday, May 14, 2026</p>
        <button type="button" aria-label="Previous day">
          <ArrowLeftIcon />
        </button>
        <button type="button" aria-label="Next day">
          <span className="inline-block rotate-180">
            <ArrowLeftIcon />
          </span>
        </button>
        <span className="ml-auto rounded-full bg-tint px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-ink">
          Recovery Day
        </span>
      </div>

      <div className="flex items-center gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-6">
        {/* Icon */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F3F4F6]">
          <div className="flex h-6 w-6 items-center justify-center">
            <BoltIcons className="h-4.5 w-4 text-[#1A1A4E]" />
          </div>
        </div>

        {/* Text */}
        <div className="w-160">
          <p className="text-[18px] font-medium leading-[29.25px] tracking-normal text-[#333333]">
            Plan was lighter today. Energy was heavy,
            <br />
            so recovery activated automatically.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-brand/10 bg-surface p-5 text-center">
          <CircularProgress percent={75} displayValue="3/4" suffix="" size={90} />
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
            Tasks Completed
          </p>
          <p className="text-sm font-semibold text-ink">3 of 4</p>
        </div>

        <div className="rounded-2xl border border-brand/10 bg-surface p-5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
            Focus Time
          </p>
          <p className="mt-1 text-2xl font-extrabold text-ink">1h 45m</p>
          <p className="text-xs text-muted">vs 3h 20m average</p>
          <button type="button" className="mt-1 text-xs font-semibold text-ink underline">
            Toggle vs average
          </button>
          <div className="mt-3 flex flex-col gap-1 border-t border-brand/10 pt-2">
            {FOCUS_BREAKDOWN.map((item) => (
              <div key={item.subject} className="flex items-center justify-between text-xs">
                <span className="text-muted">{item.subject}</span>
                <span className="font-semibold text-ink">
                  {item.value} / {item.total}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-brand/10 bg-surface p-5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
            Daily Energy
          </p>
          <p className="mt-1 flex items-center gap-1 text-lg font-extrabold text-cta">
            <ClockIcon />
            Drained
          </p>
          <div className="mt-3">
            <div className="flex h-10 items-end gap-1">
              {ENERGY_TREND.map((value, index) => (
                <div
                  key={index}
                  className="flex-1 rounded-sm bg-tint-strong"
                  style={{ height: `${value}%` }}
                />
              ))}
            </div>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
              7-Day Trend
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-brand/10 bg-surface p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">Task Log</p>
        <div className="mt-3 flex flex-col gap-3">
          {TASK_LOG.map((task) => (
            <div key={task.title} className="flex items-center gap-3 rounded-xl border border-brand/10 p-3">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${task.status === "done"
                  ? "bg-success text-white"
                  : "border-2 border-brand/15 text-transparent"
                  }`}
              >
                {task.status === "done" && <CheckIcon />}
              </span>
              <div className="flex-1">
                <p
                  className={`text-sm font-semibold ${task.status === "skipped" ? "text-muted" : "text-ink"
                    }`}
                >
                  {task.subject}
                </p>
                <p
                  className={`text-xs ${task.status === "skipped" ? "italic text-muted/70" : "text-muted"
                    }`}
                >
                  {task.title}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${task.status === "done"
                  ? "bg-success-bg text-success"
                  : "bg-tint-strong text-muted"
                  }`}
              >
                {task.status === "done" ? "Done" : "Skipped"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-brand/10 bg-surface p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">
          Streak Status
        </p>
        <p className="mt-1 text-lg font-bold text-ink">Maintained</p>
        <p className="text-xs text-muted">
          50% daily quota reached despite recovery mode. You listened to your body
        </p>
      </div>
    </div>
  );
}
