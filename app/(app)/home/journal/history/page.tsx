import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import { Button } from "@/components/ui/Button";
import {
  ArrowLeftIcon,
  BellIcon,
  ClockIcon,
  CalendarIcon,
} from "@/components/ui/icons";

type HistoryEntry = {
  id: string;
  badge: string;
  title: string;
  description?: string;
  progressLabel: string;
  progressValue: string;
  progressPercent: number;
  dateRange: string;
};

const MAY_ENTRIES: HistoryEntry[] = [
  {
    id: "consistency-streak",
    badge: "Best This Month",
    title: "14-Day Consistency Streak",
    description: "You completed every planned study session this week.",
    progressLabel: "Consistency Goal",
    progressValue: "100%",
    progressPercent: 100,
    dateRange: "May 12 - May 18",
  },
  {
    id: "mock-marks",
    badge: "Accuracy Improved by 6%",
    title: "+8 Marks in Mock",
    progressLabel: "Score Improvement",
    progressValue: "Active",
    progressPercent: 60,
    dateRange: "May 5 - May 11",
  },
];

const APRIL_ENTRIES: HistoryEntry[] = [
  {
    id: "recovery-week",
    badge: "Burnout Prevented",
    title: "Recovery Week Honored",
    progressLabel: "Recovery Status",
    progressValue: "Restored",
    progressPercent: 100,
    dateRange: "Apr 28 - May 4",
  },
  {
    id: "full-plan",
    badge: "Major Milestone",
    title: "First Full Weekly Plan Completed",
    description: "You stuck to your entire weekly plan without missing a single task.",
    progressLabel: "Plan Completion",
    progressValue: "100%",
    progressPercent: 100,
    dateRange: "Apr 21 - Apr 27",
  },
];

function HistoryCard({ entry }: { entry: HistoryEntry }) {
  return (
    <div className="rounded-2xl border border-brand/10 bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <span className="inline-block rounded-full bg-tint px-2 py-0.5 text-[10px] font-semibold uppercase text-ink">
            {entry.badge}
          </span>
          <p className="mt-1 text-base font-bold text-ink">{entry.title}</p>
          {entry.description && (
            <p className="mt-1 text-xs text-muted">{entry.description}</p>
          )}
          <div className="mt-3 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-muted">
            <span>{entry.progressLabel}</span>
            <span className="text-ink">{entry.progressValue}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-tint-strong">
            <div
              className="h-1.5 rounded-full bg-brand"
              style={{ width: `${entry.progressPercent}%` }}
            />
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-3">
          <span className="flex items-center gap-1 text-xs text-muted">
            <CalendarIcon />
            {entry.dateRange}
          </span>
          <Link
            href="/home/journal"
            className="inline-flex h-9 items-center justify-center rounded-lg border border-brand/15 bg-surface px-4 text-sm font-semibold text-body-text hover:bg-tint-strong"
          >
            View Card
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function WinJournalHistoryPage() {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/home/journal" aria-label="Back to Weekly Win Journal" className="text-ink">
            <ArrowLeftIcon />
          </Link>
          <div>
            <h1 className="text-h1 text-ink">Win Journal History</h1>
            <p className="flex items-center gap-1 text-xs text-muted">
              <ClockIcon />
              12 weeks tracked
            </p>
          </div>
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

      <div className="relative overflow-hidden rounded-2xl border border-brand/10 bg-surface p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-tint-strong" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-tint px-2 py-0.5 text-[10px] font-semibold uppercase text-ink">
                New Achievement
              </span>
              <span className="rounded-full bg-tint-strong px-2 py-0.5 text-[10px] font-semibold uppercase text-ink">
                This Week&apos;s Win
              </span>
            </div>
            <h2 className="mt-2 text-h1 text-ink">14-Day Consistency Streak</h2>
            <p className="mt-1 max-w-md text-sm text-muted">
              Your strongest streak this month. You showed up every day and maintained
              momentum.
            </p>
          </div>
          <Button href="/home/journal" variant="secondary" size="sm" className="shrink-0">
            View Full Card
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">May 2026</p>
        {MAY_ENTRIES.map((entry) => (
          <HistoryCard key={entry.id} entry={entry} />
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">
          April 2026
        </p>
        {APRIL_ENTRIES.map((entry) => (
          <HistoryCard key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  );
}
