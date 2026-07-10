import Link from "next/link";
import { UserMenu } from "@/components/layout/UserMenu";
import { Button } from "@/components/ui/Button";
import {
  BellIcon,
  RefreshIcon,
  TargetIcon,
  ChartBarIcon,
  TrophyIcon,
  TrendingUpIcon,
  UploadIcon,
  MoreIcon,
} from "@/components/ui/icons";

const STAT_CARDS = [
  {
    label: "Mocks Attempted",
    value: "14",
    caption: "+2 this month",
    icon: <TargetIcon />,
  },
  {
    label: "Average Score",
    value: "168/300",
    caption: "Top 24% percentile",
    icon: <ChartBarIcon />,
  },
  {
    label: "Best Score",
    value: "212/300",
    caption: "Allen GT 9 • Sep 2024",
    icon: <TrophyIcon />,
  },
  {
    label: "Percentile Trend",
    value: "+12",
    caption: "vs last mock",
    icon: <TrendingUpIcon />,
  },
];

const RECENT_MOCKS = [
  {
    id: "allen-gt14",
    name: "Allen GT14",
    date: "11 Oct, 2024",
    score: "168/300",
    accuracy: "62%",
    action: "View Analysis",
  },
  {
    id: "allen-gt13",
    name: "Allen GT13",
    date: "05 Oct, 2024",
    score: "156/300",
    accuracy: "56%",
    action: "View Analysis",
  },
  {
    id: "allen-gt12",
    name: "Allen GT12",
    date: "28 Sep, 2024",
    score: "148/300",
    accuracy: "50%",
    action: "Continue",
  },
  {
    id: "allen-gt11",
    name: "Allen GT11",
    date: "21 Sep, 2024",
    score: "152/300",
    accuracy: "57%",
    action: "View Analysis",
  },
];

export default function MockAnalysisPage() {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h1 text-ink">Mock Analysis</h1>
        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Refresh"
            className="flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-tint-strong"
          >
            <RefreshIcon />
          </button>
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

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STAT_CARDS.map((card) => (
          <div key={card.label} className="rounded-2xl border border-brand/10 bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted">{card.label}</p>
              <span className="text-ink">{card.icon}</span>
            </div>
            <p className="mt-1 text-xl font-extrabold text-ink">{card.value}</p>
            <p className="text-xs text-muted">{card.caption}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-brand/10 bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-base font-bold text-ink">Scheduled Mocks</p>
          <button type="button" className="text-xs font-semibold text-ink underline">
            View Calendar
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-tint-strong p-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex shrink-0 flex-col items-center justify-center rounded-lg bg-surface px-3 py-2 text-center">
              <span className="text-lg font-extrabold text-ink">24</span>
              <span className="text-[10px] text-muted">May 2024</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-ink">Allen Major Test - 15</p>
              <p className="text-xs text-muted">Full-Length Mock • 3 hrs • Saturday</p>
            </div>
          </div>
          <div className="text-right">
            <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-ink">
              1 day to go
            </span>
            <p className="mt-1 text-[11px] text-muted">Prepare and rest well beforehand</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-brand/10 bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-base font-bold text-ink">Recent Mocks</p>
          <button type="button" className="text-xs font-semibold text-ink underline">
            View All
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-140 border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-brand/10 text-[10px] uppercase tracking-wide text-muted">
                <th className="pb-2 font-semibold">Mock Test</th>
                <th className="pb-2 font-semibold">Date</th>
                <th className="pb-2 font-semibold">Score</th>
                <th className="pb-2 font-semibold">Accuracy</th>
                <th className="pb-2 font-semibold">Action</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {RECENT_MOCKS.map((mock) => (
                <tr key={mock.id} className="border-b border-brand/5 last:border-0">
                  <td className="py-3 font-semibold text-ink">{mock.name}</td>
                  <td className="py-3 text-muted">{mock.date}</td>
                  <td className="py-3 font-semibold text-ink">{mock.score}</td>
                  <td className="py-3 text-muted">{mock.accuracy}</td>
                  <td className="py-3">
                    <Link
                      href="/home/mock-analysis/view-analytics"
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-brand/15 bg-surface px-4 text-sm font-semibold text-body-text transition-colors hover:border-cta hover:bg-cta hover:text-white"
                    >
                      {mock.action}
                    </Link>
                  </td>
                  <td className="py-3 text-right">
                    <button
                      type="button"
                      aria-label={`More options for ${mock.name}`}
                      className="flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-tint-strong"
                    >
                      <span className="inline-block rotate-90">
                        <MoreIcon />
                      </span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-center text-xs text-muted">Showing 4 of 12 mocks</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-brand/10 bg-surface p-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tint text-ink">
            <UploadIcon />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-ink">Have a new mock score?</p>
            <p className="text-xs text-muted">
              Upload your scorecard or enter manually to get instant analysis.
            </p>
          </div>
        </div>
        <Button href="/home/mock-analysis/upload-scorecard" variant="primary" size="sm" className="shrink-0">
          <UploadIcon />
          Upload Scorecard
        </Button>
      </div>
    </div>
  );
}
