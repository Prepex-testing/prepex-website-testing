import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import {
  BellIcon,
  ClockIcon,
  FlameIcon,
  TrendingUpIcon,
  ChartBarIcon,
  TrophyIcon,
  ChevronDownIcon,
  ArrowLeftIcon,
} from "@/components/ui/icons";

const MEDALS: Record<number, string> = {
  1: "🥇",
  2: "🥈",
  3: "🥉",
};

type LeaderboardEntry = {
  rank: number;
  initial: string;
  name: string;
  tag: string;
  streak: number;
  highlightStreak: boolean;
  focusHours: number;
  score: number;
  breakdown: string;
};

const LEADERBOARD: LeaderboardEntry[] = [
  {
    rank: 1,
    initial: "A",
    name: "Aditya Sharma",
    tag: "IIT Bombay Aspirant",
    streak: 94,
    highlightStreak: true,
    focusHours: 128.5,
    score: 2847,
    breakdown: "S:470 · T:1200 · F:1177",
  },
  {
    rank: 2,
    initial: "P",
    name: "Priya Iyer",
    tag: "NIT Trichy Target",
    streak: 71,
    highlightStreak: true,
    focusHours: 96.2,
    score: 2214,
    breakdown: "S:380 · T:910 · F:924",
  },
  {
    rank: 3,
    initial: "V",
    name: "Vikram Singh",
    tag: "Self-Study Aspirant",
    streak: 58,
    highlightStreak: true,
    focusHours: 78.0,
    score: 1990,
    breakdown: "S:320 · T:610 · F:860",
  },
  {
    rank: 4,
    initial: "A",
    name: "Ananya Gupta",
    tag: "JEE 2026 Aspirant",
    streak: 47,
    highlightStreak: false,
    focusHours: 74.3,
    score: 1821,
    breakdown: "S:310 · T:740 · F:771",
  },
  {
    rank: 5,
    initial: "A",
    name: "Arjun Mehta",
    tag: "IIT Delhi Target",
    streak: 47,
    highlightStreak: false,
    focusHours: 69.6,
    score: 1760,
    breakdown: "S:290 · T:720 · F:750",
  },
];

export default function LeaderboardPage() {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/home" aria-label="Back to Home" className="text-ink">
            <ArrowLeftIcon />
          </Link>
          <h1 className="text-h1 text-ink">Leaderboard</h1>
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

      {/* Filters */}
      <div className="flex w-full flex-col gap-4">
        <button
          type="button"
          className="flex h-11 w-fit items-center justify-center rounded-full bg-[#1A1A4B] px-8 text-base font-semibold text-white"
        >
          Global
        </button>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
          <span className="text-sm font-semibold leading-6 text-[#6B7280] sm:text-base">
            Exam: JEE
          </span>
          <span className="text-sm font-semibold leading-6 text-[#6B7280] sm:text-base">
            City: Indore
          </span>
        </div>
      </div>

      {/* Leaderboard + You panel */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px] lg:gap-8">
        {/* Leaderboard table card */}
        <div className="overflow-hidden rounded-2xl border border-[#F3F4F6] bg-surface shadow-[0px_1px_2px_0px_#0000000D]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F9FAFB] px-4 py-4 text-xs text-[#9CA3AF] sm:px-6">
            <span className="flex items-center gap-1">
              <ClockIcon />
              Last updated: 6:00 AM today
            </span>
            <span>Showing top 50 students</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="bg-[#F9FAFB80] text-[10px] font-medium uppercase tracking-[0.6px] text-[#64748B]">
                  <th className="py-3 pl-4 sm:pl-6">Rank</th>
                  <th className="py-3 pl-8">User</th>
                  <th className="py-3 pl-8">Streak</th>
                  <th className="py-3 pl-8">Focus (hrs)</th>
                  <th className="py-3 pl-8 pr-4 sm:pr-6">Score</th>
                </tr>
              </thead>
              <tbody>
                {LEADERBOARD.map((entry) => (
                  <tr key={entry.rank} className="border-b border-[#F9FAFB] last:border-0">
                    <td className="py-4 pl-4 sm:pl-6">
                      {MEDALS[entry.rank] ? (
                        <span className="text-3xl leading-none">{MEDALS[entry.rank]}</span>
                      ) : (
                        <span className="text-sm font-semibold text-[#9CA3AF]">
                          {entry.rank}
                        </span>
                      )}
                    </td>
                    <td className="py-4 pl-8">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[6.67px] bg-[#EEF0F8] text-sm font-bold text-[#1A1A4B]">
                          {entry.initial}
                        </span>
                        <div>
                          <p className="text-base font-bold leading-6 text-[#1A1A4B]">
                            {entry.name}
                          </p>
                          <p className="text-[10px] leading-[15px] text-[#9CA3AF]">
                            {entry.tag}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 pl-8">
                      {entry.highlightStreak ? (
                        <span className="flex items-center gap-1 text-base font-semibold text-[#FF7F5C]">
                          <FlameIcon />
                          {entry.streak}d
                        </span>
                      ) : (
                        <span className="text-base font-semibold text-[#FF7F5C]">
                          {entry.streak}d
                        </span>
                      )}
                    </td>
                    <td className="py-4 pl-8 text-base font-medium text-[#4B5563]">
                      {entry.focusHours}
                    </td>
                    <td className="py-4 pl-8 pr-4 sm:pr-6">
                      <p className="text-base font-bold leading-6 text-[#1A1A4B]">
                        {entry.score}
                      </p>
                      <p className="text-[10px] leading-[15px] text-[#9CA3AF]">
                        {entry.breakdown}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination footer — was a fixed h-[65px] single row, now wraps on small screens */}
          <div className="flex flex-col items-center gap-3 border-t border-[#F3F4F6] px-4 py-4 text-xs sm:flex-row sm:justify-between sm:px-6">
            {/* Rows per page */}
            <div className="flex items-center gap-2 text-[#6B7280]">
              <span>Rows per page:</span>
              <button
                type="button"
                className="flex h-8 items-center gap-1 rounded-md border border-[#E5E7EB] px-2 text-[#6B7280]"
              >
                20
                <ChevronDownIcon className="h-3 w-3" />
              </button>
            </div>

            {/* Pagination controls */}
            <div className="order-first flex flex-wrap items-center justify-center gap-1 sm:order-none">
              <button
                type="button"
                disabled
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9CA3AF] disabled:opacity-40"
              >
                ‹
              </button>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FF7F5C] text-sm font-semibold text-white"
              >
                1
              </button>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium text-[#374151] hover:bg-[#F9FAFB]"
              >
                2
              </button>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium text-[#374151] hover:bg-[#F9FAFB]"
              >
                3
              </button>
              <span className="px-1 text-[#9CA3AF]">…</span>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium text-[#374151] hover:bg-[#F9FAFB]"
              >
                5
              </button>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#6B7280]"
              >
                ›
              </button>
            </div>

            {/* Showing count */}
            <div className="text-[#6B7280]">Showing 1-10 of 50 students</div>
          </div>
        </div>

        {/* You panel — stretches to match left card height via grid's default align-items: stretch */}
        <div className="flex flex-col gap-6 rounded-[24px] border border-[#C4C5D84D] bg-surface p-8 shadow-[0px_4px_20px_0px_#1A1F360D]">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand text-base font-bold text-white">
              R
            </span>
            <div>
              <p className="text-lg font-semibold leading-none text-[#1A1A4E]">You</p>
              <p className="mt-1 text-xs text-muted">JEE 2027 Aspirant</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 text-center">
            <div>
              <p className="text-[32px] font-extrabold leading-none text-[#191C1F]">12</p>
              <p className="mt-2 text-[10px] uppercase tracking-wide text-muted">Rank</p>
            </div>
            <div>
              <p className="text-[32px] font-extrabold leading-none text-[#191C1F]">48d</p>
              <p className="mt-2 text-[10px] uppercase tracking-wide text-muted">Streak</p>
            </div>
          </div>

          <div className="mt-auto rounded-xl bg-tint-strong px-4 pb-2 pt-[7px] text-center">
            <p className="text-2xl font-extrabold text-ink">1184</p>
            <p className="text-[10px] uppercase tracking-wide text-muted">Total Score</p>
          </div>
        </div>
      </div>

      {/* Insight tiles */}
      <div className="grid w-full grid-cols-1 gap-4 pt-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {/* Rank Velocity */}
        <div className="flex min-h-[137px] flex-col justify-between gap-4 rounded-2xl border border-[#EEF0F8] bg-surface p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold leading-4 text-[#6B7280]">Rank Velocity</p>
            <span className="rounded bg-[#DCFCE7] px-2 py-1 text-[10px] font-bold leading-none text-[#16A34A]">
              +12%
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#EEF0F8] text-[#1A1A4B]">
              <TrendingUpIcon />
            </span>
            <div>
              <p className="text-2xl font-bold leading-8 text-[#1A1A4B]">+2</p>
              <p className="text-xs font-medium text-[#9CA3AF]">Positions</p>
            </div>
          </div>
        </div>

        {/* Percentile */}
        <div className="flex min-h-[137px] flex-col justify-between gap-4 rounded-2xl border border-[#EEF0F8] bg-surface p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold leading-4 text-[#6B7280]">Percentile</p>
            <span className="text-[10px] font-semibold uppercase text-[#6B7280]">TOP 5%</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#EEF0F8] text-[#1A1A4B]">
              <ChartBarIcon />
            </span>
            <div>
              <p className="text-2xl font-bold leading-8 text-[#1A1A4B]">95.42</p>
            </div>
          </div>
        </div>

        {/* Current Tier */}
        <div className="flex min-h-[137px] flex-col justify-between gap-4 rounded-2xl border border-[#EEF0F8] bg-surface p-5 sm:p-6 sm:col-span-2 lg:col-span-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold leading-4 text-[#6B7280]">Current Tier</p>
            <span className="text-[10px] font-medium text-[#9CA3AF]">Gold Tier</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#FFF7ED] text-[#F59E0B]">
              <TrophyIcon />
            </span>
            <div>
              <p className="text-[20px] font-bold leading-8 text-[#1A1A4B]">Gold</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}