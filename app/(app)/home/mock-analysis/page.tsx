"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { UserMenu } from "@/components/layout/UserMenu";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { CalendarIcon, ClockIcon, TargetIcon, ChartBarIcons, TrophyIcons, TrendingUpIcon, UploadIcon,LeftIconcon ,BellIcon} from "@/assets/icons";
import {
  // BellIcon,
  RefreshIcon,
  // TargetIcon,
  // ChartBarIcon,
  // TrophyIcon,
  // TrendingUpIcon,
  // UploadIcon,
  MoreIcon,
  // CalendarIcon,
  // ClockIcon,
  ChevronRightIcon,
} from "@/components/ui/icons";
import {
  deleteMock,
  getMockAnalysisList,
  type MockAnalysisItem,
  type MockAnalysisListResponse,
} from "@/lib/api/mock";

const RECENT_MOCKS_LIMIT = 5;

function formatMockDate(iso: string): string {
  const date = new Date(iso);
  const month = date.toLocaleDateString("en-US", { month: "short" });
  return `${date.getDate()} ${month}, ${date.getFullYear()}`;
}

function formatCalendarParts(iso: string) {
  const date = new Date(iso);
  return {
    day: date.getDate(),
    monthYear: date.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
    weekday: date.toLocaleDateString("en-US", { weekday: "long" }),
  };
}

function daysUntil(iso: string): number {
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function daysToGoLabel(diff: number): string {
  if (diff === 0) return "Today";
  if (diff > 0) return `${diff} day${diff === 1 ? "" : "s"} to go`;
  return `${Math.abs(diff)} day${Math.abs(diff) === 1 ? "" : "s"} overdue`;
}

type MockAction = { label: string; href: string; disabled: boolean };

function getMockAction(item: MockAnalysisItem): MockAction {
  const attempted = new Date(item.attemptedDate);
  attempted.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (attempted.getTime() >= today.getTime()) {
    return { label: "Upcoming", href: "", disabled: true };
  }

  if (item.maxScore != 0) {
    return {
      label: "View Analysis",
      href: `/home/mock-analysis/view-analytics?id=${item.id}`,
      disabled: false,
    };
  }

  return {
    label: "Upload Score",
    href: `/home/mock-analysis/upload-scorecard?id=${item.id}`,
    disabled: false,
  };
}

function MoreOptionsMenu({ label, onDelete }: { label: string; onDelete: () => void }) {
  const [isOpen, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-5 w-5 items-center justify-center text-muted"
      >
        <span className="rotate-90">
          <MoreIcon />
        </span>
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-2 w-40 overflow-hidden rounded-xl border border-brand/10 bg-surface py-1 shadow-modal"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="flex w-full items-center px-3 py-2 text-left text-sm font-medium text-danger hover:bg-tint-strong"
          >
            Delete Mock
          </button>
        </div>
      )}
    </div>
  );
}

export default function MockAnalysisPage() {
  const { resolvedTheme } = useTheme();
  const iconBgStyle =
    resolvedTheme === "dark" ? { backgroundColor: "#13133D" } : undefined;

  const [data, setData] = useState<MockAnalysisListResponse | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getMockAnalysisList({ page, limit: RECENT_MOCKS_LIMIT })
      .then(({ data }) => {
        if (!cancelled) setData(data);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load your mock analysis. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page]);

  const summary = data?.summary ?? null;
  const items = data?.items ?? [];
  const pagination = data?.pagination ?? null;
  const upcomingMock = data?.upcomingMock ?? null;
  const totalPages = pagination ? Math.max(1, Math.ceil(pagination.total / pagination.limit)) : 1;
  const mockToDelete = items.find((item) => item.id === confirmDeleteId) ?? null;

  async function refetchCurrentPage() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await getMockAnalysisList({ page, limit: RECENT_MOCKS_LIMIT });
      setData(data);
    } catch {
      setError("Couldn't load your mock analysis. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmDelete() {
    if (!confirmDeleteId) return;

    setDeleting(true);
    setDeleteError(null);

    try {
      await deleteMock(confirmDeleteId);
      setConfirmDeleteId(null);

      if (items.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        await refetchCurrentPage();
      }
    } catch {
      setDeleteError("Couldn't delete the mock. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  const statCards = [
    {
      label: "Total Mocks",
      value: summary ? String(summary.totalMockCount) : "—",
      caption: "All time",
      icon: <TargetIcon />,
    },
    {
      label: "Avg Score",
      value: summary?.averageScorePercentage != null? `${summary.averageScorePercentage}%`: "—",
      caption: "Average across mocks",
      icon: <ChartBarIcons />,
    },
    {
      label: "Best Score",
      value: summary?.bestScorePercentage != null? `${summary.bestScorePercentage}%`: "—",
      caption: "Personal best",
      icon: <TrophyIcons />,
    },
    {
      label: "Score Trend",
      value: summary?.latestComparison
        ? `${summary.latestComparison.changePercentagePoints >= 0 ? "+" : ""}${summary.latestComparison.changePercentagePoints}%`
        : "—",
      caption: summary?.latestComparison ? "vs previous mock" : "Not enough data yet",
      icon: <TrendingUpIcon />,
    },
  ];

  return (
    <div className="flex w-full flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[24px] font-bold leading-8 text-ink sm:text-[28px]">
          Mock Analysis
        </h1>
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
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="flex items-start gap-4 rounded-2xl border border-brand/10 bg-surface p-4 shadow-sm dark:shadow-[0_1px_4px_rgba(0,0,0,0.16)]"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-icon-chip-bg text-ink [&>svg]:h-6 [&>svg]:w-6 dark:bg-[#FAF7F2]/8">
              {card.icon}
            </span>
            <div className="min-w-0">
              <p className="text-caption font-semibold leading-4 text-muted">
                {card.label}
              </p>
              <p className="text-[22px] font-bold leading-8 text-ink sm:text-[24px]">
                {card.value}
              </p>
              <p className="pt-1 text-[11px] font-bold leading-[16.5px] text-muted">
                {card.caption}
              </p>
            </div>
          </div>
        ))}
      </section>

      {upcomingMock && (
        <section className="flex flex-col gap-6 rounded-[20px] border border-brand/10 bg-surface p-4 shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_6px_rgba(0,0,0,0.18)] sm:p-5 lg:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-icon-chip-bg p-2 text-ink [&>svg]:h-6 [&>svg]:w-6 dark:bg-[#FAF7F2]/8"
                style={iconBgStyle}
              >
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
                <LeftIconcon />
              </span>
            </button>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch ">
            <div className="flex min-w-0 flex-1 flex-col items-start gap-4 rounded-xl border border-brand/10 bg-surface p-4 dark:bg-tint sm:flex-row sm:items-center sm:p-5">
              <div className="flex w-full shrink-0 flex-col items-center justify-center rounded-lg bg-surface px-4 py-3 text-center dark:bg-tint sm:w-[112px] sm:py-4">
                {(() => {
                  const { day, monthYear, weekday } = formatCalendarParts(upcomingMock.attemptedDate);
                  return (
                    <>
                      <span className="text-[32px] font-bold leading-8 text-ink sm:text-[36px]">
                        {day}
                      </span>
                      <span className="mt-1 text-[14px] font-medium leading-5 text-muted">
                        {monthYear}
                      </span>
                      <span className="text-[14px] leading-5 text-muted">{weekday}</span>
                    </>
                  );
                })()}
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="text-[18px] font-bold leading-7 text-ink sm:text-[20px]">
                  {upcomingMock.mockName}
                </h3>

                <p className="mt-1 text-[14px] leading-5 text-muted">
                  {upcomingMock.sourceInstitute} · {upcomingMock.examType}
                </p>

                {!!upcomingMock.testDurationMinutes && (
                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-muted [&>svg]:h-4 [&>svg]:w-4">
                      <ClockIcon />
                    </span>

                    <span className="text-[14px] font-medium leading-5 text-muted">
                      {upcomingMock.testDurationMinutes} Minutes
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex w-full items-center gap-4 rounded-xl border border-brand/10 bg-tint p-4 sm:p-5 lg:w-[320px] lg:flex-shrink-0">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface shadow-sm dark:bg-tint sm:h-13 sm:w-13">
                <span className="text-ink [&>svg]:h-5 [&>svg]:w-5">
                  <ClockIcon />
                </span>
              </div>

              <div>
                <h4 className="text-[18px] font-bold leading-7 text-ink sm:text-[20px]">
                  {daysToGoLabel(daysUntil(upcomingMock.attemptedDate))}
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
      )}

      <section className="overflow-hidden rounded-[24px] border border-brand/10 bg-surface shadow-sm dark:shadow-[0_1px_4px_rgba(0,0,0,0.16)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand/10 px-4 py-5 sm:px-6 lg:px-8">
          <h2 className="text-[18px] font-extrabold leading-7 text-ink">
            Recent Mocks
          </h2>
          {deleteError && (
            <p className="text-caption font-semibold text-warning">{deleteError}</p>
          )}
        </div>

        <div className="hidden overflow-x-auto px-4 py-4 md:block sm:px-6 lg:px-8">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="border-b border-brand/10 dark:bg-tint">
                <th className="py-4 pl-2 text-left text-caption font-bold uppercase tracking-[0.6px] text-muted dark:text-white sm:pl-4 lg:pl-6">
                  Mock Test
                </th>
                <th className="py-4 text-left text-caption font-bold uppercase tracking-[0.6px] text-muted dark:text-white">
                  Date
                </th>
                <th className="py-4 text-left text-caption font-bold uppercase tracking-[0.6px] text-muted dark:text-white">
                  Score
                </th>
                <th className="py-4 text-left text-caption font-bold uppercase tracking-[0.6px] text-muted dark:text-white">
                  Accuracy
                </th>
                <th className="py-4 text-center text-caption font-bold uppercase tracking-[0.6px] text-muted dark:text-white">
                  Action
                </th>
                <th className="w-10 dark:bg-tint"></th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-muted">
                    Loading mocks…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-warning">
                    {error}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-muted">
                    No mocks yet.
                  </td>
                </tr>
              ) : (
                items.map((mock) => (
                  <tr
                    key={mock.id}
                    className="border-b border-brand/5 last:border-0"
                  >
                    <td className="py-5 pl-2 sm:pl-4 lg:pl-6">
                      <p className="text-body-lg font-bold leading-5 text-ink">
                        {mock.mockName}
                      </p>
                    </td>

                    <td className="py-5">
                      <p className="text-[14px] leading-5 text-muted">
                        {formatMockDate(mock.attemptedDate)}
                      </p>
                    </td>

                    <td className="py-5">
                      <p className="text-body-lg font-bold leading-5 text-ink">
                        {mock.totalScore != null ? `${mock.totalScore}/${mock.maxScore}` : "—"}
                      </p>
                    </td>

                    <td className="py-5">
                      <p className="text-body-lg font-bold leading-5 text-ink">
                        {mock.accuracyPercentage}%
                      </p>
                    </td>

                    <td className="py-5 text-center">
                      {(() => {
                        const action = getMockAction(mock);
                        if (action.disabled) {
                          return (
                            <button
                              type="button"
                              disabled
                              className="inline-flex h-8 min-w-[112px] cursor-not-allowed items-center justify-center rounded-lg border border-brand/15 bg-surface px-3 text-caption font-bold leading-4 text-muted"
                            >
                              {action.label}
                            </button>
                          );
                        }
                        return (
                          <Link
                            href={action.href}
                            className="inline-flex h-8 min-w-[112px] items-center justify-center rounded-lg border border-ink bg-surface px-3 text-caption font-bold leading-4 text-ink transition hover:border-cta hover:bg-cta hover:text-white"
                          >
                            {action.label}
                          </Link>
                        );
                      })()}
                    </td>

                    <td className="py-5 text-center">
                      <MoreOptionsMenu
                        label={`More options for ${mock.mockName}`}
                        onDelete={() => setConfirmDeleteId(mock.id)}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 p-4 md:hidden sm:p-6">
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted">Loading mocks…</p>
          ) : error ? (
            <p className="py-8 text-center text-sm text-warning">{error}</p>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">No mocks yet.</p>
          ) : (
            items.map((mock) => (
              <div
                key={mock.id}
                className="rounded-xl border border-brand/10 bg-surface/90 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-body-lg font-bold leading-5 text-ink">
                      {mock.mockName}
                    </p>
                    <p className="mt-1 text-[14px] leading-5 text-muted">
                      {formatMockDate(mock.attemptedDate)}
                    </p>
                  </div>
                  <MoreOptionsMenu
                    label={`More options for ${mock.mockName}`}
                    onDelete={() => setConfirmDeleteId(mock.id)}
                  />
                </div>

                <div className="mt-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[14px] font-medium text-muted">Score</p>
                    <p className="text-body-lg font-bold leading-5 text-ink">
                      {mock.totalScore != null ? `${mock.totalScore}/${mock.maxScore}` : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-muted">Accuracy</p>
                    <p className="text-body-lg font-bold leading-5 text-ink">
                      {mock.accuracyPercentage}%
                    </p>
                  </div>
                </div>

                {(() => {
                  const action = getMockAction(mock);
                  if (action.disabled) {
                    return (
                      <button
                        type="button"
                        disabled
                        className="mt-4 inline-flex h-9 w-full cursor-not-allowed items-center justify-center rounded-lg border border-brand/15 bg-surface px-4 text-caption font-bold leading-4 text-muted"
                      >
                        {action.label}
                      </button>
                    );
                  }
                  return (
                    <Link
                      href={action.href}
                      className="mt-4 inline-flex h-9 items-center justify-center rounded-lg border border-ink bg-surface px-4 text-caption font-bold leading-4 text-ink transition hover:border-cta hover:bg-cta hover:text-white"
                    >
                      {action.label}
                    </Link>
                  );
                })()}
              </div>
            ))
          )}
        </div>

        {pagination && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-brand/10 px-4 py-5 sm:flex-row sm:px-6 lg:px-8">
            <p className="text-caption leading-4 text-muted">
              Showing {items.length} of {pagination.total} mocks
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1 || isLoading}
                aria-label="Previous page"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-brand/15 text-ink transition hover:bg-tint-strong disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <ChevronRightIcon className="h-4 w-4 rotate-180" />
              </button>

              <span className="text-caption font-semibold text-ink">
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages || isLoading}
                aria-label="Next page"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-brand/15 text-ink transition hover:bg-tint-strong disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <ChevronRightIcon />
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4 rounded-[20px] border border-brand/10 bg-surface px-4 py-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.18)] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8 lg:py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-brand/20 bg-icon-chip-bg text-ink dark:border-[#C7D2FE] dark:bg-[#FAF7F2]/8 [&>svg]:h-6 [&>svg]:w-6"
            style={iconBgStyle}
          >
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

      <ConfirmModal
        open={confirmDeleteId !== null}
        onClose={() => {
          if (isDeleting) return;
          setConfirmDeleteId(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Mock"
        description={
          mockToDelete
            ? `Are you sure you want to delete "${mockToDelete.mockName}"? This action cannot be undone.`
            : "Are you sure you want to delete this mock? This action cannot be undone."
        }
        confirmLabel={isDeleting ? "Deleting…" : "Delete"}
      />
    </div>
  );
}
