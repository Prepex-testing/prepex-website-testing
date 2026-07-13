import Link from "next/link";
import { CircularProgress } from "@/components/ui/CircularProgress";
import { ArrowLeftIcon, BellIcon, BoltIcon, ClockIcon, CheckIcon, BoltIcons, BatteryIcon } from "@/components/ui/icons";
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

      <div className="flex h-[30px] w-full flex-wrap items-center gap-4">
        {/* Date */}
        <h2 className="font-['Plus_Jakarta_Sans'] text-[18px] font-bold leading-[23px] text-ink">
          Wednesday, May 14, 2026
        </h2>

        {/* Previous */}
        <button
          type="button"
          className="flex h-[30px] w-[30px] items-center justify-center rounded-md border border-brand/10 bg-surface text-ink"
          aria-label="Previous day"
        >
          <ArrowLeftIcon />
        </button>

        {/* Next */}
        <button
          type="button"
          className="flex h-[30px] w-[30px] items-center justify-center rounded-md border border-brand/10 bg-surface text-ink"
          aria-label="Next day"
        >
          <span className="rotate-180">
            <ArrowLeftIcon />
          </span>
        </button>

        {/* Recovery Badge */}
        <span className="rounded-full bg-tint px-3 py-1 font-['Plus_Jakarta_Sans'] text-[12px] font-bold uppercase tracking-[0.6px] text-ink">
          RECOVERY DAY
        </span>
      </div>

      <div className="flex items-center gap-4 rounded-2xl border border-brand/10 bg-surface p-6">
        {/* Icon */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tint-strong">
          <div className="flex h-6 w-6 items-center justify-center">
            <BoltIcons className="h-4.5 w-4 text-ink" />
          </div>
        </div>

        {/* Text */}
        <div className="w-160">
          <p className="text-[18px] font-medium leading-[29.25px] tracking-normal text-ink">
            Plan was lighter today. Energy was heavy,
            <br />
            so recovery activated automatically.
          </p>
        </div>
      </div>

      <div className="grid w-full grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-3">
        <div className="flex h-[247px] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-brand/10 bg-surface p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          <div className="flex h-[132px] w-[132px] items-center justify-center">
            <CircularProgress
              percent={75}
              displayValue="3/4"
              suffix=""
              size={132}
            />
          </div>

          <p className="font-['Plus_Jakarta_Sans'] text-[12px] font-bold uppercase tracking-[1.2px] leading-4 text-muted">
            TASKS COMPLETED
          </p>

          <p className="font-['Plus_Jakarta_Sans'] text-[30px] font-bold leading-9 text-ink">
            3 of 4
          </p>
        </div>

        {/* ===================== FOCUS TIME ===================== */}

        <div className="flex h-[247px] w-full flex-col rounded-2xl border border-brand/10 bg-surface p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          {/* Top Section */}
          <div className="flex flex-col items-center">
            <p className="font-['Plus_Jakarta_Sans'] text-[12px] font-bold uppercase tracking-[1.2px] leading-4 text-muted">
              FOCUS TIME
            </p>

            <h2 className="mt-3 font-['Plus_Jakarta_Sans'] text-[30px] font-bold leading-[36px] text-ink">
              1h 45m
            </h2>

            <p className="mt-3 text-[12px] leading-4 text-muted">
              vs 3h 20m average
            </p>

            <button
              type="button"
              className="mt-2 text-[10px] font-semibold leading-[15px] text-ink underline"
            >
              Toggle vs average
            </button>
          </div>

          {/* Push Divider Down */}
          <div className="flex-1" />

          {/* Divider with side gap */}
          <div className="mx-2 border-t border-brand/10" />

          {/* Bottom List */}
          <div className="mx-2 mt-6 flex flex-col gap-3">
            {FOCUS_BREAKDOWN.map((item) => (
              <div
                key={item.subject}
                className="flex items-center justify-between"
              >
                <span className="text-[12px] leading-4 text-muted">
                  {item.subject}
                </span>

                <span className="text-[12px] font-semibold leading-4 text-ink">
                  {item.value} / {item.total}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ===================== DAILY ENERGY ===================== */}

        <div className="flex h-[247px] w-full flex-col items-center rounded-2xl border border-brand/10 bg-surface px-5 pt-5 pb-7 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          <p className="font-['Plus_Jakarta_Sans'] text-[12px] font-bold uppercase tracking-[1.2px] leading-4 text-muted">
            DAILY ENERGY
          </p>

          <div className="mt-3 flex items-center justify-center gap-2">
            <BatteryIcon className="text-cta" />

            <span className="font-['Plus_Jakarta_Sans'] text-[20px] font-bold uppercase leading-7 text-cta">
              DRAINED
            </span>
          </div>

          <div className="mt-10 flex flex-col items-center">
            <div className="flex h-10 items-end gap-1">
              {ENERGY_TREND.map((value, index) => (
                <div
                  key={index}
                  className={`w-[8px] rounded-sm ${index === 3 ? "bg-brand" : "bg-tint-strong"
                    }`}
                  style={{ height: `${value}%` }}
                />
              ))}
            </div>

            <p className="mt-3 font-['Plus_Jakarta_Sans'] text-[12px] font-bold uppercase tracking-[1.2px] text-muted">
              7-DAY TREND
            </p>
          </div>
        </div>
      </div>

      <div className="w-full rounded-2xl border border-brand/10 bg-surface p-6 shadow-[0px_1px_2px_rgba(0,0,0,0.05)]">
        {/* Header */}
        <div className="flex h-[45px] items-start border-b border-brand/10 pb-4">
          <h2 className="font-['Plus_Jakarta_Sans'] text-[18px] font-bold uppercase leading-7 tracking-[-0.45px] text-ink">
            TASK LOG
          </h2>
        </div>

        {/* Task List */}
        <div className="mt-4 flex flex-col gap-4">
          {TASK_LOG.map((task) => (
            <div
              key={task.title}
              className="flex h-[70px] items-center justify-between rounded-lg border border-brand/10 px-3 py-3"
            >
              {/* Left Content */}
              <div className="flex flex-1 items-center gap-4 overflow-hidden">
                {/* Status Icon */}
                <div className="flex h-4 w-4 shrink-0 items-center justify-center">
                  {task.status === "done" ? (
                    <div className="flex h-4 w-4 items-center justify-center rounded bg-success">
                      <CheckIcon />
                    </div>
                  ) : (
                    <div className="flex h-4 w-4 items-center justify-center rounded bg-muted/30">
                      <div className="h-2 w-2 rounded-full bg-surface" />
                    </div>
                  )}
                </div>

                {/* Text */}
                <div className="min-w-0 flex-1">
                  <p className="font-['Plus_Jakarta_Sans'] text-[16px] font-semibold leading-6 text-ink">
                    {task.subject}
                  </p>

                  <p className="truncate font-['Plus_Jakarta_Sans'] text-[14px] font-normal leading-5 text-muted">
                    {task.title}
                  </p>
                </div>
              </div>

              {/* Right Badge */}
              <div className="ml-4 shrink-0">
                {task.status === "done" ? (
                  <span className="rounded-md bg-success/10 px-3 py-1 font-['Plus_Jakarta_Sans'] text-[12px] font-semibold uppercase leading-4 text-success">
                    DONE
                  </span>
                ) : (
                  <span className="rounded-md bg-tint px-3 py-1 font-['Plus_Jakarta_Sans'] text-[12px] font-semibold leading-4 text-ink">
                    Skipped
                  </span>
                )}
              </div>
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