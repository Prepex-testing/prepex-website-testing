"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import { useTheme } from "@/components/theme/ThemeProvider";
import { PageLoader } from "@/components/ui/PageLoader";
import { FlameIcon } from "@/components/ui/icons";
import { ClockIcon, TrophyIcons, UserIcon, BellIcon, ArrowLeftIcon } from "@/assets/icons";
import { ChevronDownIcon } from "@/components/ui/icons";
import {
  getLeaderboard,
  updateDisplayName,
  tierFromPercentile,
  paginationRange,
  LEADERBOARD_PAGE_SIZES,
  type Leaderboard,
  type LeaderboardScope,
} from "@/lib/api/streak";

const MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

const SCOPES: { key: LeaderboardScope; label: string }[] = [
  { key: "global", label: "Global" },
  { key: "exam", label: "My Exam" },
];

const DISPLAY_NAME_MAX = 50;

export default function LeaderboardPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [scope, setScope] = useState<LeaderboardScope>("global");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [board, setBoard] = useState<Leaderboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Derived rather than a state flag flipped inside the effect: the board is
  // stale exactly while it is missing or still showing the previous scope.
  const isStale = board === null || board.scope !== scope;

  const [isEditingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [isSavingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getLeaderboard(scope, page, limit)
      .then((result) => {
        if (!cancelled) {
          setBoard(result);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load the leaderboard. Please try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [scope, page, limit]);

  const handleSaveName = async () => {
    const trimmed = nameDraft.trim();
    if (trimmed.length === 0) {
      setNameError("Pick a name to show on the leaderboard.");
      return;
    }
    setSavingName(true);
    setNameError(null);
    try {
      await updateDisplayName(trimmed);
      const refreshed = await getLeaderboard(scope, page, limit);
      setBoard(refreshed);
      setEditingName(false);
    } catch {
      setNameError("Couldn't save that name. Please try again.");
    } finally {
      setSavingName(false);
    }
  };

  if (isStale && !error && !board) return <PageLoader label="Loading the leaderboard…" />;

  if (error || !board) {
    return (
      <div className="p-8">
        <p className="text-center text-sm font-medium text-muted">
          {error ?? "Couldn't load the leaderboard."}
        </p>
      </div>
    );
  }

  const isLaunchMode = board.mode === "launch";
  const tier = tierFromPercentile(board.myPercentile);

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
        <div className="flex shrink-0 items-center gap-4">
          <ThemeToggle />
          <button
            type="button"
            aria-label="Notifications"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-icon-action-bg text-icon-action-text transition-colors hover:bg-tint-strong"
          >
            <BellIcon />
          </button>
          <UserMenu />
        </div>
      </div>

      {/* Launch Mode banner (PRD 10.6) */}
      {isLaunchMode && (
        <div className="rounded-2xl border border-warning/30 bg-warning-bg px-4 py-3">
          <p className="text-sm font-bold text-ink">Founding Members</p>
          <p className="mt-1 text-xs text-body-text">
            Prepex is new. For now the board shows the top {board.visibleCount} founding members —
            the standard global ranking opens up as more students join.
            {board.isFoundingMember && " You're one of the first 100."}
          </p>
        </div>
      )}

      {/* Scope filter */}
      <div className="flex w-full flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {SCOPES.map((s) => {
            const active = s.key === scope;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => {
                  setScope(s.key);
                  setPage(1);
                }}
                className={`flex h-11 items-center justify-center rounded-full px-8 text-base font-semibold transition-colors ${
                  active
                    ? isDark
                      ? "bg-[#242453] text-white"
                      : "bg-brand text-white"
                    : "bg-tint-strong text-muted hover:text-ink"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Leaderboard + You panel */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px] lg:gap-8">
        <div className="overflow-hidden rounded-2xl border border-brand/10 bg-surface shadow-[0px_1px_2px_0px_#0000000D]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand/10 px-4 py-4 text-xs text-muted sm:px-6">
            <span className="flex items-center gap-1">
              <ClockIcon />
              Updated daily at your day boundary
            </span>
            <span>
              {board.visibleCount > 0
                ? `Top ${board.visibleCount} of ${board.totalRanked} students`
                : "No students ranked yet"}
            </span>
          </div>

          {board.entries.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted">
              Nobody is ranked yet. Study today and you&apos;ll be on the board tomorrow.
            </p>
          ) : (
            <div className="overflow-x-auto">
              {/*
                PRD 10.5.3: display name, aggregate score and streak only. The
                metrics that feed the score — focus minutes, completion, tasks
                done, practice accuracy — are deliberately absent, as are real
                names and any mock score.
              */}
              <table className="w-full min-w-[520px] border-collapse text-left">
                <thead>
                  <tr
                    className={`text-[10px] font-medium uppercase tracking-[0.6px] ${
                      isDark ? "bg-[#4B4B70] text-ink" : "bg-tint-strong text-muted"
                    }`}
                  >
                    <th className="py-3 pl-4 sm:pl-6">Rank</th>
                    <th className="py-3 pl-8">Student</th>
                    <th className="py-3 pl-8">Streak</th>
                    <th className="py-3 pl-8 pr-4 sm:pr-6">Effort Score</th>
                  </tr>
                </thead>
                <tbody>
                  {board.entries.map((entry) => (
                    <tr
                      key={`${entry.rank}-${entry.displayName}`}
                      className={`border-b border-brand/5 last:border-0 ${
                        entry.isMe ? "bg-tint/60" : ""
                      }`}
                    >
                      <td className="py-4 pl-4 sm:pl-6">
                        <div className="flex h-8 w-8 items-center justify-center">
                          {MEDALS[entry.rank] ? (
                            <span className="text-3xl leading-none">{MEDALS[entry.rank]}</span>
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
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[6.67px] text-sm font-bold ${
                              isDark ? "bg-[#242453] text-white" : "bg-tint text-ink"
                            }`}
                          >
                            {entry.displayName.charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-base font-bold leading-6 text-ink">
                              {entry.displayName}
                              {entry.isMe && (
                                <span className="ml-2 text-[10px] font-bold uppercase text-muted">
                                  You
                                </span>
                              )}
                            </p>
                            {entry.isFoundingMember && (
                              <p className="text-[10px] font-semibold leading-[15px] text-warning">
                                Founding 100
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 pl-8">
                        <span className="flex items-center gap-1 text-base font-semibold text-cta">
                          <FlameIcon />
                          {entry.streak}d
                        </span>
                      </td>
                      <td className="py-4 pl-8 pr-4 sm:pr-6">
                        <p className="text-base font-bold leading-6 text-ink">{entry.effortScore}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination — walks the visible top-50 set (PRD 10.5.2). Rank stays
              absolute across pages, so row 21 reads "21", not "1". */}
          {board.entries.length > 0 && (
            <div className="flex flex-col items-center gap-3 border-t border-brand/10 px-4 py-4 text-xs sm:flex-row sm:justify-between sm:px-6">
              <div className="flex items-center gap-2 text-muted">
                <label htmlFor="rows-per-page">Rows per page:</label>
                <div className="relative">
                  <select
                    id="rows-per-page"
                    value={board.limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                    className="h-8 appearance-none rounded-md border border-brand/15 bg-surface pl-2 pr-7 text-xs text-muted outline-none focus:border-brand"
                  >
                    {LEADERBOARD_PAGE_SIZES.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted" />
                </div>
              </div>

              <nav
                aria-label="Leaderboard pages"
                className="order-first flex flex-wrap items-center justify-center gap-1 sm:order-none"
              >
                <button
                  type="button"
                  onClick={() => setPage(Math.max(1, board.page - 1))}
                  disabled={board.page <= 1}
                  aria-label="Previous page"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-tint-strong disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  ‹
                </button>

                {paginationRange(board.page, board.totalPages).map((item, index) =>
                  item === "ellipsis" ? (
                    <span key={`gap-${index}`} className="px-1 text-muted">
                      …
                    </span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setPage(item)}
                      aria-current={item === board.page ? "page" : undefined}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
                        item === board.page
                          ? "bg-cta text-white"
                          : "font-medium text-ink hover:bg-tint-strong"
                      }`}
                    >
                      {item}
                    </button>
                  ),
                )}

                <button
                  type="button"
                  onClick={() => setPage(Math.min(board.totalPages, board.page + 1))}
                  disabled={board.page >= board.totalPages}
                  aria-label="Next page"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-tint-strong disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  ›
                </button>
              </nav>

              <div className="text-muted">
                Showing {board.rangeStart}-{board.rangeEnd} of {board.visibleCount} students
              </div>
            </div>
          )}
        </div>

        {/* You panel */}
        <div className="flex flex-col gap-6 rounded-[24px] border border-brand/10 bg-surface p-8 shadow-[0px_4px_20px_0px_#1A1F360D]">
          <div className="flex items-center gap-4">
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-md text-base font-bold ${
                isDark ? "bg-white text-[#1A1A4E]" : "bg-brand text-white"
              }`}
            >
              {(board.myDisplayName ?? "?").charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold leading-none text-ink">
                {board.myDisplayName ?? "You"}
              </p>
              {board.isFoundingMember && (
                <p className="mt-1 text-xs font-semibold text-warning">Founding 100</p>
              )}
            </div>
          </div>

          {/* Display name — the only identity other students see (PRD 10.5.3) */}
          {isEditingName ? (
            <div className="flex flex-col gap-2">
              <input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                maxLength={DISPLAY_NAME_MAX}
                placeholder="Leaderboard name"
                className="h-10 rounded-lg border border-input-border bg-surface px-3 text-sm text-ink outline-none focus:border-brand"
              />
              {nameError && <p className="text-[11px] text-cta">{nameError}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveName}
                  disabled={isSavingName}
                  className="h-9 flex-1 rounded-lg bg-brand text-xs font-bold text-white disabled:opacity-60"
                >
                  {isSavingName ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingName(false);
                    setNameError(null);
                  }}
                  className="h-9 flex-1 rounded-lg border border-brand/15 text-xs font-bold text-ink"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setNameDraft(board.myDisplayName ?? "");
                setEditingName(true);
              }}
              className="rounded-lg border border-brand/15 py-2 text-xs font-bold text-ink transition-colors hover:bg-tint-strong"
            >
              {board.myDisplayName ? "Change display name" : "Set a display name"}
            </button>
          )}

          <div className="flex items-center justify-center gap-4 border-b border-brand/10 pb-6 pt-2 text-center">
            <div className="flex-1">
              <p className="text-[32px] font-extrabold leading-none text-ink">
                {board.myRank ?? "—"}
              </p>
              <p className="mt-2 text-[10px] uppercase tracking-wide text-muted">Rank</p>
            </div>
            <div className="h-10 w-px shrink-0 bg-brand/10" />
            <div className="flex-1">
              <p className="text-[32px] font-extrabold leading-none text-ink">{board.myStreak}d</p>
              <p className="mt-2 text-[10px] uppercase tracking-wide text-muted">Streak</p>
            </div>
          </div>

          <div
            className={`rounded-xl px-4 pb-2 pt-[7px] text-center ${
              isDark ? "bg-[#4B4B70]" : "bg-tint-strong"
            }`}
          >
            <p className="text-2xl font-extrabold text-ink">{board.myScore}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted">Effort Score</p>
          </div>
        </div>
      </div>

      {/* Insight tiles — derived from rank alone, so they leak nothing extra */}
      <div className="grid w-full grid-cols-1 gap-4 pt-4 sm:grid-cols-2 sm:gap-6">
        <div className="flex min-h-[137px] flex-col justify-between gap-4 rounded-2xl border border-brand/10 bg-surface p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold leading-4 text-muted">Percentile</p>
            {board.myPercentile !== null && (
              <span className="text-[10px] font-semibold uppercase text-muted">
                Top {Math.max(0, Math.round(100 - board.myPercentile))}%
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                isDark ? "bg-white text-[#1A1A4E]" : "bg-tint text-ink"
              }`}
            >
              <UserIcon />
            </span>
            <div>
              <p className="text-2xl font-bold leading-8 text-ink">
                {board.myPercentile ?? "—"}
              </p>
              <p className="text-xs font-medium text-muted">
                of {board.totalRanked} students
              </p>
            </div>
          </div>
        </div>

        <div className="flex min-h-[137px] flex-col justify-between gap-4 rounded-2xl border border-brand/10 bg-surface p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold leading-4 text-muted">Current Tier</p>
            <span className="text-[10px] font-medium text-muted">From your percentile</span>
          </div>
          <div className="flex items-center gap-4">
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-warning ${
                isDark ? "bg-white" : "bg-warning-bg"
              }`}
            >
              <TrophyIcons />
            </span>
            <div>
              <p className="text-[20px] font-bold leading-8 text-ink">{tier ?? "—"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
