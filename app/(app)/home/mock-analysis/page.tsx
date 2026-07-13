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
  CalendarIcon,
  ClockIcon,
  ChevronDownIcon,
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
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="w-[166px] h-[32px] text-[24px] font-bold leading-[32px] text-ink">
          Mock Analysis
        </h1>
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

      {/* Top stats grid: gap-24 */}
      <div className="grid grid-cols-2 gap-[24px] lg:grid-cols-4">
        {STAT_CARDS.map((card) => (
          <div
            key={card.label}
            className="flex items-start gap-4 rounded-2xl border border-brand/10 bg-surface p-4"
          >
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] ${card.iconClass} [&>svg]:h-6 [&>svg]:w-6`}
            >
              {card.icon}
            </span>
            <div>
              <p className="text-[12px] font-semibold leading-[16px] text-muted">
                {card.label}
              </p>
              <p className="text-[24px] font-bold leading-[32px] text-ink">
                {card.value}
              </p>
              <p className="pt-[3px] text-[11px] font-bold leading-[16.5px] text-ink">
                {card.caption}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Scheduled Mocks */}
      <div className="flex flex-col gap-[24px] rounded-[16px] border border-[#F3F4F6] bg-surface p-[32px] shadow-[0px_4px_20px_0px_#00000008]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-tint p-2 text-ink [&>svg]:h-6 [&>svg]:w-6">
              <CalendarIcon />
            </span>
            <p className="text-[20px] font-bold leading-[28px] text-ink">
              Scheduled Mocks
            </p>
          </div>
          <button
            type="button"
            className="flex items-center gap-2 text-[16px] font-semibold leading-[24px] text-ink"
          >
            View Calendar
            <span className="[&>svg]:h-4 [&>svg]:w-4">
              <ChevronDownIcon className="-rotate-90" />
            </span>
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-6 sm:flex-nowrap sm:gap-0">
            <div className="flex shrink-0 flex-col items-center justify-center border-r border-brand/10 px-[32px] py-[14px] text-center">
              <span className="text-[36px] font-bold leading-[40px] text-ink">
                24
              </span>
              <span className="mt-1 text-[12px] font-semibold text-muted">
                May 2026
              </span>
              <span className="text-[11px] text-muted">Sunday</span>
            </div>

            <div className="min-w-0 flex-1 pl-[40px]">
              <p className="text-[18px] font-bold leading-[28px] text-ink">
                Allen Major Test – 15
              </p>
              <p className="mt-1 text-sm text-muted">Full Syllabus Mock</p>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-muted [&>svg]:h-4 [&>svg]:w-4">
                  <ClockIcon />
                </span>
                <span className="text-[14px] font-medium leading-[20px] text-muted">
                  180 Minutes
                </span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3 rounded-2xl bg-tint p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-ink [&>svg]:h-4 [&>svg]:w-4">
              <ClockIcon />
            </span>
            <div>
              <p className="text-sm font-bold text-ink">1 day to go</p>
              <p className="text-xs text-muted">
                Prepare well and stay consistent.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Mocks */}
      <div className="rounded-[32px] border border-[#F9FAFB] bg-surface shadow-[0px_4px_20px_0px_#00000008]">
        <div className="border-b border-brand/10 px-6 py-6 sm:px-[89px]">
          <p className="text-[18px] font-extrabold leading-[28px] text-ink">
            Recent Mocks
          </p>
        </div>

        <div className="overflow-x-auto px-6 pb-6 sm:px-[32px]">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-brand/10">
                <th className="px-[32px] py-4 text-[12px] font-bold uppercase tracking-[0.6px] leading-[16px] text-muted">
                  Mock Test
                </th>
                <th className="px-[32px] py-4 text-[12px] font-bold uppercase tracking-[0.6px] leading-[16px] text-muted">
                  Date
                </th>
                <th className="px-[32px] py-4 text-[12px] font-bold uppercase tracking-[0.6px] leading-[16px] text-muted">
                  Score
                </th>
                <th className="px-[32px] py-4 text-[12px] font-bold uppercase tracking-[0.6px] leading-[16px] text-muted">
                  Accuracy
                </th>
                <th className="px-[24px] py-4 text-[12px] font-bold uppercase tracking-[0.6px] leading-[16px] text-muted">
                  Action
                </th>
                <th className="px-[24px] py-4" />
              </tr>
            </thead>
            <tbody>
              {RECENT_MOCKS.map((mock) => (
                <tr key={mock.id} className="border-b border-brand/5 last:border-0">
                  <td className="px-[32px] py-[27px] text-[16px] font-bold leading-[100%] text-ink">
                    {mock.name}
                  </td>
                  <td className="px-[32px] py-[27px] text-[14px] text-muted">
                    {mock.date}
                  </td>
                  <td className="px-[32px] py-[27px] text-[16px] font-bold leading-[100%] text-ink">
                    {mock.score}
                  </td>
                  <td className="px-[32px] py-[27px] text-[14px] text-muted">
                    {mock.accuracy}
                  </td>
                  <td className="px-[24px] py-[24.5px]">
                    <Link
                      href="/home/mock-analysis/view-analytics"
                      className="inline-flex h-[30px] items-center justify-center rounded-[8px] border border-brand/15 bg-surface px-[16px] py-[6px] text-[12px] font-bold leading-[16px] text-ink transition-colors hover:border-cta hover:bg-cta hover:text-white"
                    >
                      {mock.action}
                    </Link>
                  </td>
                  <td className="px-[24px] py-[26.5px] text-right">
                    <button
                      type="button"
                      aria-label={`More options for ${mock.name}`}
                      className="flex h-5 w-5 items-center justify-center text-muted [&>svg]:h-5 [&>svg]:w-5"
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

        <p className="pb-6 text-center text-xs text-muted">Showing 4 of 12 mocks</p>
      </div>

      {/* Upload Scorecard */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[16px] border border-[#F3F4F6] bg-surface pt-[40px] pr-[32px] pb-[32px] pl-[32px] shadow-[0px_4px_20px_0px_#00000008]">
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
        <Button
          href="/home/mock-analysis/upload-scorecard"
          variant="primary"
          className="flex h-[60px] w-[224px] shrink-0 items-center justify-center gap-2 rounded-[12px] bg-cta pt-[16px] pr-[32px] pb-[16px] pl-[32px] text-[18px] font-bold leading-[28px] text-white"
        >
          <UploadIcon />
          Upload Scorecard
        </Button>
      </div>
    </div>
  );
}