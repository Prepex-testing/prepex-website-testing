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

      <div className="flex flex-col gap-2">
        <span className="w-fit rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white">
          Global
        </span>
        <p className="text-xs text-muted">
          Exam: JEE <span className="mx-2">·</span> City: Indore
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_260px]">
        <div className="rounded-2xl border border-brand/10 bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
            <span className="flex items-center gap-1">
              <ClockIcon />
              Last updated: 6:00 AM today
            </span>
            <span>Showing top 50 students</span>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-140 border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-brand/10 text-[10px] uppercase tracking-wide text-muted">
                  <th className="pb-2 font-semibold">Rank</th>
                  <th className="pb-2 font-semibold">User</th>
                  <th className="pb-2 font-semibold">Streak</th>
                  <th className="pb-2 font-semibold">Focus (hrs)</th>
                  <th className="pb-2 font-semibold">Score</th>
                </tr>
              </thead>
              <tbody>
                {LEADERBOARD.map((entry) => (
                  <tr key={entry.rank} className="border-b border-brand/5 last:border-0">
                    <td className="py-3 text-lg">
                      {MEDALS[entry.rank] ?? (
                        <span className="text-sm font-semibold text-muted">
                          {entry.rank}
                        </span>
                      )}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-tint text-sm font-bold text-ink">
                          {entry.initial}
                        </span>
                        <div>
                          <p className="font-semibold text-ink">{entry.name}</p>
                          <p className="text-xs text-muted">{entry.tag}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      {entry.highlightStreak ? (
                        <span className="flex items-center gap-1 font-semibold text-cta">
                          <FlameIcon />
                          {entry.streak}d
                        </span>
                      ) : (
                        <span className="text-muted">{entry.streak}d</span>
                      )}
                    </td>
                    <td className="py-3 text-muted">{entry.focusHours}</td>
                    <td className="py-3">
                      <p className="font-bold text-ink">{entry.score}</p>
                      <p className="text-[10px] text-muted">{entry.breakdown}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-muted sm:justify-between">
            <span className="flex items-center gap-1">
              Rows per page: 20
              <ChevronDownIcon className="h-3 w-3" />
            </span>
            <div className="flex items-center gap-1">
              <button type="button" className="px-1 disabled:opacity-30" disabled>
                ‹
              </button>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-white">
                1
              </span>
              <span className="px-1">2</span>
              <span className="px-1">3</span>
              <span className="px-1">…</span>
              <span className="px-1">5</span>
              <button type="button" className="px-1">
                ›
              </button>
            </div>
            <span>Showing 1-10 of 50 students</span>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-brand/10 bg-surface p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
                R
              </span>
              <div>
                <p className="text-sm font-bold text-ink">You</p>
                <p className="text-xs text-muted">JEE 2027 Aspirant</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-center">
              <div>
                <p className="text-2xl font-extrabold text-ink">12</p>
                <p className="text-[10px] uppercase tracking-wide text-muted">
                  Rank
                </p>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-ink">48d</p>
                <p className="text-[10px] uppercase tracking-wide text-muted">
                  Streak
                </p>
              </div>
            </div>

            <div className="mt-3 rounded-xl bg-tint-strong p-4 text-center">
              <p className="text-2xl font-extrabold text-ink">1184</p>
              <p className="text-[10px] uppercase tracking-wide text-muted">
                Total Score
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-brand/10 bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted">Rank Velocity</p>
            <span className="rounded-full bg-success-bg px-2 py-0.5 text-[10px] font-semibold text-success">
              +12%
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-tint text-ink">
              <TrendingUpIcon />
            </span>
            <p className="text-xl font-extrabold text-ink">+2</p>
          </div>
          <p className="text-xs text-muted">Positions</p>
        </div>

        <div className="rounded-2xl border border-brand/10 bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted">Percentile</p>
            <span className="rounded-full bg-cta/10 px-2 py-0.5 text-[10px] font-semibold text-cta">
              Top 5%
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-tint text-ink">
              <ChartBarIcon />
            </span>
            <p className="text-xl font-extrabold text-ink">95.42</p>
          </div>
        </div>

        <div className="rounded-2xl border border-brand/10 bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted">Current Tier</p>
            <span className="rounded-full bg-info-bg px-2 py-0.5 text-[10px] font-semibold text-info">
              Gold Tier
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-info-bg text-info">
              <TrophyIcon />
            </span>
            <p className="text-xl font-extrabold text-ink">Gold</p>
          </div>
        </div>
      </div>
    </div>
  );
}
