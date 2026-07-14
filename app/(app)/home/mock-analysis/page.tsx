import Link from "next/link";
import { UserMenu } from "@/components/layout/UserMenu";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
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
  CalendarIcon,
  ClockIcon,
  ChevronRightIcon,
} from "@/components/ui/icons";

const STAT_CARDS = [
  {
    label: "Total Mocks",
    value: "14",
    caption: "+2 this week",
    icon: <TargetIcon />,
    iconClass: "bg-cta/10 text-cta",
  },
  {
    label: "Avg Score",
    value: "168/300",
    caption: "Top 24% percentile",
    icon: <ChartBarIcon />,
    iconClass: "bg-tint text-ink",
  },
  {
    label: "Best Score",
    value: "212/300",
    caption: "Allen GT 9",
    icon: <TrophyIcon />,
    iconClass: "bg-info-bg text-info",
  },
  {
    label: "Score Trend",
    value: "+12",
    caption: "vs last mock",
    icon: <TrendingUpIcon />,
    iconClass: "bg-brand/10 text-ink",
  },
];

const RECENT_MOCKS = [
  {
    id: "allen-gt14",
    name: "Allen GT 14",
    date: "12 Oct, 2024",
    score: "168/300",
    accuracy: "62%",
    action: "View Analysis",
  },
  {
    id: "allen-gt13",
    name: "Allen GT 13",
    date: "05 Oct, 2024",
    score: "156/300",
    accuracy: "58%",
    action: "View Analysis",
  },
  {
    id: "allen-gt12",
    name: "Allen GT 12",
    date: "28 Sep, 2024",
    score: "148/300",
    accuracy: "54%",
    action: "Continue",
  },
  {
    id: "allen-gt11",
    name: "Allen GT 11",
    date: "21 Sep, 2024",
    score: "152/300",
    accuracy: "57%",
    action: "View Analysis",
  },
];

export default function MockAnalysisPage() {
  return (
    <div className="flex w-full flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[24px] font-bold leading-8 text-ink sm:text-[28px]">
          Mock Analysis
        </h1>
        <div className="flex items-center gap-2 sm:gap-4">
          <ThemeToggle />
          <button
            type="button"
            aria-label="Notifications"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-muted transition hover:bg-tint-strong sm:h-11 sm:w-11"
          >
            <BellIcon />
          </button>
          <UserMenu />
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STAT_CARDS.map((card) => (
          <div
            key={card.label}
            className="flex items-start gap-4 rounded-2xl border border-brand/10 bg-surface p-4 shadow-sm dark:shadow-[0_1px_4px_rgba(0,0,0,0.16)]"
          >
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${card.iconClass} [&>svg]:h-6 [&>svg]:w-6`}
            >
              {card.icon}
            </span>
            <div className="min-w-0">
              <p className="text-caption font-semibold leading-4 text-muted">
                {card.label}
              </p>
              <p className="text-[22px] font-bold leading-8 text-ink sm:text-[24px]">
                {card.value}
              </p>
              <p className="pt-1 text-[11px] font-bold leading-[16.5px] text-ink">
                {card.caption}
              </p>
            </div>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-6 rounded-[20px] border border-brand/10 bg-surface p-4 shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_6px_rgba(0,0,0,0.18)] sm:p-5 lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-tint p-2 text-ink [&>svg]:h-6 [&>svg]:w-6">
              <CalendarIcon />
            </span>
            <p className="text-[18px] font-bold leading-7 text-ink sm:text-[20px]">
              Scheduled Mocks
            </p>
          </div>
          <button
            type="button"
            className="flex items-center gap-2 text-body-lg font-semibold leading-6 text-ink"
          >
            View Calendar
            <span className="[&>svg]:h-4 [&>svg]:w-4">
              <ChevronRightIcon />
            </span>
          </button>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
          <div className="flex min-w-0 flex-1 flex-col items-start gap-4 rounded-xl border border-brand/10 bg-surface p-4 sm:flex-row sm:items-center sm:p-5">
            <div className="flex w-full shrink-0 flex-col items-center justify-center rounded-lg border border-brand/10 bg-surface px-4 py-3 text-center sm:w-[112px] sm:py-4">
              <span className="text-[32px] font-bold leading-8 text-ink sm:text-[36px]">
                24
              </span>
              <span className="mt-1 text-[14px] font-medium leading-5 text-muted">
                May 2026
              </span>
              <span className="text-[14px] leading-5 text-muted">Sunday</span>
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-[18px] font-bold leading-7 text-ink sm:text-[20px]">
                Allen Major Test – 15
              </h3>

              <p className="mt-1 text-[14px] leading-5 text-muted">
                Full Syllabus Mock
              </p>

              <div className="mt-4 flex items-center gap-2">
                <span className="text-muted [&>svg]:h-4 [&>svg]:w-4">
                  <ClockIcon />
                </span>

                <span className="text-[14px] font-medium leading-5 text-muted">
                  180 Minutes
                </span>
              </div>
            </div>
          </div>

          <div className="flex w-full items-center gap-4 rounded-xl border border-brand/10 bg-tint p-4 sm:p-5 lg:w-[320px] lg:flex-shrink-0">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface shadow-sm sm:h-13 sm:w-13">
              <span className="text-ink [&>svg]:h-5 [&>svg]:w-5">
                <ClockIcon />
              </span>
            </div>

            <div>
              <h4 className="text-[18px] font-bold leading-7 text-ink sm:text-[20px]">
                1 day to go
              </h4>

              <p className="mt-1 text-[14px] leading-5 text-muted">
                Prepare well and stay
                <br />
                consistent.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[24px] border border-brand/10 bg-surface shadow-sm dark:shadow-[0_1px_4px_rgba(0,0,0,0.16)]">
        <div className="border-b border-brand/10 px-4 py-5 sm:px-6 lg:px-8">
          <h2 className="text-[18px] font-extrabold leading-7 text-ink">
            Recent Mocks
          </h2>
        </div>

        <div className="hidden overflow-x-auto px-4 py-4 md:block sm:px-6 lg:px-8">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="border-b border-brand/10">
                <th className="py-4 pl-2 text-left text-caption font-bold uppercase tracking-[0.6px] text-muted sm:pl-4 lg:pl-6">
                  Mock Test
                </th>
                <th className="py-4 text-left text-caption font-bold uppercase tracking-[0.6px] text-muted">
                  Date
                </th>
                <th className="py-4 text-left text-caption font-bold uppercase tracking-[0.6px] text-muted">
                  Score
                </th>
                <th className="py-4 text-left text-caption font-bold uppercase tracking-[0.6px] text-muted">
                  Accuracy
                </th>
                <th className="py-4 text-center text-caption font-bold uppercase tracking-[0.6px] text-muted">
                  Action
                </th>
                <th className="w-10"></th>
              </tr>
            </thead>

            <tbody>
              {RECENT_MOCKS.map((mock) => (
                <tr
                  key={mock.id}
                  className="border-b border-brand/5 last:border-0"
                >
                  <td className="py-5 pl-2 sm:pl-4 lg:pl-6">
                    <p className="text-body-lg font-bold leading-5 text-ink">
                      {mock.name}
                    </p>
                  </td>

                  <td className="py-5">
                    <p className="text-[14px] leading-5 text-muted">
                      {mock.date}
                    </p>
                  </td>

                  <td className="py-5">
                    <p className="text-body-lg font-bold leading-5 text-ink">
                      {mock.score}
                    </p>
                    {mock.accuracy && (
                      <p className="mt-0.5 text-caption leading-4 text-muted">
                        {mock.accuracy}
                      </p>
                    )}
                  </td>

                  <td className="py-5">
                    <p className="text-body-lg font-bold leading-5 text-ink">
                      {mock.accuracy}
                    </p>
                  </td>

                  <td className="py-5 text-center">
                    <Link
                      href="/home/mock-analysis/view-analytics"
                      className="inline-flex h-8 min-w-[112px] items-center justify-center rounded-lg border border-brand bg-surface px-3 text-caption font-bold leading-4 text-brand transition hover:bg-brand hover:text-white"
                    >
                      {mock.action}
                    </Link>
                  </td>

                  <td className="py-5 text-center">
                    <button
                      type="button"
                      aria-label={`More options for ${mock.name}`}
                      className="inline-flex h-5 w-5 items-center justify-center text-muted"
                    >
                      <span className="rotate-90">
                        <MoreIcon />
                      </span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 p-4 md:hidden sm:p-6">
          {RECENT_MOCKS.map((mock) => (
            <div
              key={mock.id}
              className="rounded-xl border border-brand/10 bg-surface/90 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-body-lg font-bold leading-5 text-ink">
                    {mock.name}
                  </p>
                  <p className="mt-1 text-[14px] leading-5 text-muted">
                    {mock.date}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`More options for ${mock.name}`}
                  className="inline-flex h-5 w-5 items-center justify-center text-muted"
                >
                  <span className="rotate-90">
                    <MoreIcon />
                  </span>
                </button>
              </div>

              <div className="mt-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-[14px] font-medium text-muted">Score</p>
                  <p className="text-body-lg font-bold leading-5 text-ink">
                    {mock.score}
                  </p>
                </div>
                <div>
                  <p className="text-[14px] font-medium text-muted">Accuracy</p>
                  <p className="text-body-lg font-bold leading-5 text-ink">
                    {mock.accuracy}
                  </p>
                </div>
              </div>

              <Link
                href="/home/mock-analysis/view-analytics"
                className="mt-4 inline-flex h-9 items-center justify-center rounded-lg border border-brand bg-surface px-4 text-caption font-bold leading-4 text-brand transition hover:bg-brand hover:text-white"
              >
                {mock.action}
              </Link>
            </div>
          ))}
        </div>

        <div className="border-t border-brand/10 py-5 text-center">
          <p className="text-caption leading-4 text-muted">
            Showing 4 of 12 mocks
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-[20px] border border-brand/10 bg-surface px-4 py-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.18)] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8 lg:py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-brand/20 bg-surface text-ink">
            <UploadIcon />
          </div>

          <div>
            <h3 className="text-[18px] font-bold leading-7 text-ink">
              Have a new mock score?
            </h3>

            <p className="mt-1 text-body-lg leading-6 text-muted">
              Upload your scorecard or enter manually to get your analysis.
            </p>
          </div>
        </div>

        <div className="w-full shrink-0 sm:w-auto">
          <Button
            href="/home/mock-analysis/upload-scorecard"
            variant="primary"
            className="h-14 w-full rounded-xl px-6 py-4 text-[16px] font-bold leading-7 sm:w-56 sm:text-[18px]"
          >
            Upload Scorecard
          </Button>
        </div>
      </section>
    </div>
  );
}
