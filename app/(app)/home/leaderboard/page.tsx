"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import { useTheme } from "@/components/theme/ThemeProvider";
import {
  BellIcon,
  // ClockIcon,
  FlameIcon,
  // TrendingUpIcon,
  // ChartBarIcon,
  // TrophyIcon,
  ChevronDownIcon,
  ArrowLeftIcon,
} from "@/components/ui/icons";
import { ClockIcon,TrophyIcons,UserIcon,TrendingUpIcon} from "@/assets/icons";
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
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

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
          className={`flex h-11 w-fit items-center justify-center rounded-full px-8 text-base font-semibold ${isDark ? "bg-white text-[#1A1A4E]" : "bg-brand text-white"}`}
        >
          Global
        </button>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
          <span
            className={`text-sm font-semibold leading-6 sm:text-base ${isDark ? "text-white" : "text-muted"}`}
          >
            Exam: JEE
          </span>
          <span
            className={`text-sm font-semibold leading-6 sm:text-base ${isDark ? "text-white" : "text-muted"}`}
          >
            City: Indore
          </span>
        </div>
      </div>

      {/* Leaderboard + You panel */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px] lg:gap-8">
        {/* Leaderboard table card */}
        <div className="overflow-hidden rounded-2xl border border-brand/10 bg-surface shadow-[0px_1px_2px_0px_#0000000D]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand/10 px-4 py-4 text-xs text-muted sm:px-6">
            <span className="flex items-center gap-1">
              <ClockIcon />
              Last updated: 6:00 AM today
            </span>
            <span>Showing top 50 students</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr
                  className={`text-[10px] font-medium uppercase tracking-[0.6px] ${isDark ? "bg-[#4B4B70] text-ink" : "bg-tint-strong text-muted"}`}
                >
                  <th className="py-3 pl-4 sm:pl-6">Rank</th>
                  <th className="py-3 pl-8">User</th>
                  <th className="py-3 pl-8">Streak</th>
                  <th className="py-3 pl-8">Focus (hrs)</th>
                  <th className="py-3 pl-8 pr-4 sm:pr-6">Score</th>
                </tr>
              </thead>
              <tbody>
                {LEADERBOARD.map((entry) => (
                  <tr key={entry.rank} className="border-b border-brand/5 last:border-0">
                    <td className="py-4 pl-4 sm:pl-6">
                      <div className="flex h-8 w-8 items-center justify-center">
                        {MEDALS[entry.rank] ? (
                          <span className="text-3xl leading-none">
                            {MEDALS[entry.rank]}
                          </span>
                        ) : (
                          <span className="text-sm font-semibold leading-none text-muted">
                            {entry.rank}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 pl-8">
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[6.67px] text-sm font-bold ${isDark ? "bg-white text-[#1A1A4E]" : "bg-tint text-ink"}`}
                        >
                          {entry.initial}
                        </span>
                        <div>
                          <p className="text-base font-bold leading-6 text-ink">
                            {entry.name}
                          </p>
                          <p className="text-[10px] leading-[15px] text-muted">
                            {entry.tag}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 pl-8">
                      {entry.highlightStreak ? (
                        <span className="flex items-center gap-1 text-base font-semibold text-cta">
                          <FlameIcon />
                          {entry.streak}d
                        </span>
                      ) : (
                        <span className="text-base font-semibold text-cta">
                          {entry.streak}d
                        </span>
                      )}
                    </td>
                    <td className="py-4 pl-8 text-base font-medium text-body-text">
                      {entry.focusHours}
                    </td>
                    <td className="py-4 pl-8 pr-4 sm:pr-6">
                      <p className="text-base font-bold leading-6 text-ink">
                        {entry.score}
                      </p>
                      <p className="text-[10px] leading-[15px] text-muted">
                        {entry.breakdown}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination footer — was a fixed h-[65px] single row, now wraps on small screens */}
          <div className="flex flex-col items-center gap-3 border-t border-brand/10 px-4 py-4 text-xs sm:flex-row sm:justify-between sm:px-6">
            {/* Rows per page */}
            <div className="flex items-center gap-2 text-muted">
              <span>Rows per page:</span>
              <button
                type="button"
                className="flex h-8 items-center gap-1 rounded-md border border-brand/15 px-2 text-muted"
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
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted disabled:opacity-40"
              >
                ‹
              </button>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-cta text-sm font-semibold text-white"
              >
                1
              </button>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium text-ink hover:bg-tint-strong"
              >
                2
              </button>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium text-ink hover:bg-tint-strong"
              >
                3
              </button>
              <span className="px-1 text-muted">…</span>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium text-ink hover:bg-tint-strong"
              >
                5
              </button>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted"
              >
                ›
              </button>
            </div>

            {/* Showing count */}
            <div className="text-muted">Showing 1-10 of 50 students</div>
          </div>
        </div>

        {/* You panel — stretches to match left card height via grid's default align-items: stretch */}
        <div className="flex flex-col gap-6 rounded-[24px] border border-brand/10 bg-surface p-8 shadow-[0px_4px_20px_0px_#1A1F360D]">
          <div className="flex items-center gap-4">
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-md text-base font-bold ${isDark ? "bg-white text-[#1A1A4E]" : "bg-brand text-white"}`}
            >
              R
            </span>
            <div>
              <p className="text-lg font-semibold leading-none text-ink">You</p>
              <p className="mt-1 text-xs text-muted">JEE 2027 Aspirant</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 border-b border-brand/10 pt-2 pb-6 text-center">
            <div className="flex-1">
              <p className="text-[32px] font-extrabold leading-none text-ink">12</p>
              <p className="mt-2 text-[10px] uppercase tracking-wide text-muted">Rank</p>
            </div>
            <div className="h-10 w-px shrink-0 bg-brand/10" />
            <div className="flex-1">
              <p className="text-[32px] font-extrabold leading-none text-ink">48d</p>
              <p className="mt-2 text-[10px] uppercase tracking-wide text-muted">Streak</p>
            </div>
          </div>

          <div
            className={`rounded-xl px-4 pb-2 pt-[7px] text-center ${isDark ? "bg-[#4B4B70]" : "bg-tint-strong"}`}
          >
            <p className="text-2xl font-extrabold text-ink">1184</p>
            <p className="text-[10px] uppercase tracking-wide text-muted">Total Score</p>
          </div>
        </div>
      </div>

      {/* Insight tiles */}
      <div className="grid w-full grid-cols-1 gap-4 pt-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {/* Rank Velocity */}
        <div className="flex min-h-[137px] flex-col justify-between gap-4 rounded-2xl border border-brand/10 bg-surface p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold leading-4 text-muted">Rank Velocity</p>
            <span className="rounded bg-success-bg px-2 py-1 text-[10px] font-bold leading-none text-success">
              +12%
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${isDark ? "bg-white text-[#1A1A4E]" : "bg-tint text-ink"}`}
            >
              <TrendingUpIcon />
            </span>
            <div>
              <p className="text-2xl font-bold leading-8 text-ink">+2</p>
              <p className="text-xs font-medium text-muted">Positions</p>
            </div>
          </div>
        </div>

        {/* Percentile */}
        <div className="flex min-h-[137px] flex-col justify-between gap-4 rounded-2xl border border-brand/10 bg-surface p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold leading-4 text-muted">Percentile</p>
            <span className="text-[10px] font-semibold uppercase text-muted">TOP 5%</span>
          </div>

          <div className="flex items-center gap-4">
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${isDark ? "bg-white text-[#1A1A4E]" : "bg-tint text-ink"}`}
            >
              <UserIcon />
            </span>
            <div>
              <p className="text-2xl font-bold leading-8 text-ink">95.42</p>
            </div>
          </div>
        </div>

        {/* Current Tier */}
        <div className="flex min-h-[137px] flex-col justify-between gap-4 rounded-2xl border border-brand/10 bg-surface p-5 sm:p-6 sm:col-span-2 lg:col-span-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold leading-4 text-muted">Current Tier</p>
            <span className="text-[10px] font-medium text-muted">Gold Tier</span>
          </div>

          <div className="flex items-center gap-4">
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-warning ${isDark ? "bg-white" : "bg-warning-bg"}`}
            >
              <TrophyIcons />
            </span>
            <div>
              <p className="text-[20px] font-bold leading-8 text-ink">Gold</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}