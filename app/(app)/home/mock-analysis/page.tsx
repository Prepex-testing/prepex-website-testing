"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { UserMenu } from "@/components/layout/UserMenu";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { CalendarIcon, ClockIcon, TargetIcon, ChartBarIcons, TrophyIcons, TrendingUpIcon, UploadIcon, LeftIconcon, TrendingDownIcon } from "@/assets/icons";
import {
  RefreshIcon,
  MoreIcon,
  ChevronRightIcon,
} from "@/components/ui/icons";
import {
  deleteMock,
  getMockAnalysisList,
  type MockAnalysisItem,
  type MockAnalysisListResponse,
} from "@/lib/api/mock";
import { PageLoader } from "@/components/ui/PageLoader";
import { useRouter } from "next/navigation";

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
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const MENU_WIDTH = 160;
  const MENU_HEIGHT = 44;

  const openMenu = () => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();

    let top = rect.bottom + 8;
    let left = rect.right - MENU_WIDTH;

    if (top + MENU_HEIGHT > window.innerHeight) {
      top = rect.top - MENU_HEIGHT - 8;
    }

    if (left < 8) left = 8;

    if (left + MENU_WIDTH > window.innerWidth - 8) {
      left = window.innerWidth - MENU_WIDTH - 8;
    }

    setCoords({ top, left });
    setOpen(true);
  };

  const toggleMenu = () => {
    if (isOpen) {
      setOpen(false);
    } else {
      openMenu();
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };

    const handleScrollOrResize = () => setOpen(false);

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={toggleMenu}
        className="inline-flex h-5 w-5 items-center justify-center text-muted"
      >
        <span className="rotate-90">
          <MoreIcon />
        </span>
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: MENU_WIDTH,
            }}
            className="z-[9999] overflow-hidden rounded-xl border border-brand/10 bg-surface py-1 shadow-modal"
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
          </div>,
          document.body
        )}
    </>
  );
}

export default function MockAnalysisPage() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const iconBgStyle =
    resolvedTheme === "dark" ? { backgroundColor: "#13133D" } : undefined;
  const [data, setData] = useState<MockAnalysisListResponse | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPageChanging, setIsPageChanging] = useState(false);

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
        if (!cancelled) {
          setLoading(false);
          setIsPageChanging(false);
        }
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

  const handlePageChange = (newPage: number) => {
    if (newPage !== page) {
      setIsPageChanging(true);
      setPage(newPage);
    }
  };

  const statCards = [
    {
      label: "Total Mocks",
      value: summary ? String(summary.totalMockCount) : "—",
      caption: "All time",
      icon: <TargetIcon />,
    },
    {
      label: "Avg Score",
      value: summary?.averageScorePercentage != null ? `${summary.averageScorePercentage}%` : "—",
      caption: "Average across mocks",
      icon: <ChartBarIcons />,
    },
    {
      label: "Best Score",
      value: summary?.bestScorePercentage != null ? `${summary.bestScorePercentage}%` : "—",
      caption: "Personal best",
      icon: <TrophyIcons />,
    },
    {
      label: "Score Trend",
      value: summary?.latestComparison
        ? `${summary.latestComparison.changePercentagePoints >= 0 ? "+" : ""}${summary.latestComparison.changePercentagePoints}%`
        : "—",
      caption: summary?.latestComparison ? "vs previous mock" : "Not enough data yet",
      icon:
        summary?.latestComparison &&
          summary.latestComparison.changePercentagePoints < 0 ? (
          <TrendingDownIcon />
        ) : (
          <TrendingUpIcon />
        ),
    },
  ];

  // First load only — pagination + delete refetches keep the page mounted
  // and animate the table body instead.
  if (!data && !error) {
    return <PageLoader label="Loading mock analysis…" />;
  }

  return (
    <div className="flex w-full flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[24px] font-bold leading-8 text-ink sm:text-[28px]">
          Mock Analysis
        </h1>
        <div className="flex shrink-0 items-center gap-4">
          <ThemeToggle />
          <NotificationBell />
          <UserMenu />
        </div>
      </header>

      <section className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="flex min-h-[134.5px] w-full items-center gap-4 rounded-2xl border border-card bg-surface px-5 py-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] sm:px-6 sm:py-8"
          >
            {/* Icon */}
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-tint text-ink">
              {card.icon}
            </span>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <p className="h-4 truncate text-[11px] font-semibold leading-4 text-muted sm:text-[12px]">
                {card.label}
              </p>

              <p className="h-8 truncate text-[22px] font-bold leading-8 tracking-normal text-ink sm:text-[24px]">
                {card.value}
              </p>

              <p className="pt-[3px] text-[10px] font-bold leading-[16.5px] text-muted sm:text-[11px]">
                {card.caption}
              </p>
            </div>
          </div>
        ))}
      </section>

      {upcomingMock && (
        <section className="flex flex-col gap-5 rounded-[20px] border border-brand/10 bg-surface p-4 shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_6px_rgba(0,0,0,0.18)] sm:gap-6 sm:p-5 lg:p-8">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-icon-chip-bg p-2 text-ink [&>svg]:h-6 [&>svg]:w-6 dark:bg-[#FAF7F2]/8"
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
              onClick={() => router.push("/plan")}
              className="flex shrink-0 items-center gap-2 text-body-lg font-semibold leading-6 text-ink"
            >
              View Calendar

              <span className="[&>svg]:h-4 [&>svg]:w-4">
                <LeftIconcon />
              </span>
            </button>
          </div>

          {/* Content */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
            {/* Upcoming Mock Card */}
            <div className="flex min-w-0 flex-1 flex-row items-center gap-3 rounded-xl border border-brand/10 bg-surface p-3 dark:bg-tint sm:gap-4 sm:p-5">
              {/* Date */}
              <div className="flex w-[76px] shrink-0 flex-col items-center justify-center rounded-lg bg-surface px-2 py-2.5 text-center dark:bg-tint sm:w-[112px] sm:px-4 sm:py-4">
                {(() => {
                  const {
                    day,
                    monthYear,
                    weekday,
                  } = formatCalendarParts(upcomingMock.attemptedDate);

                  return (
                    <>
                      <span className="text-[28px] font-bold leading-8 text-ink sm:text-[36px] sm:leading-10">
                        {day}
                      </span>

                      <span className="mt-1 text-[12px] font-semibold leading-5 text-muted sm:text-[14px]">
                        {monthYear}
                      </span>

                      <span className="mt-0.5 text-[11px] font-medium leading-4 text-muted sm:mt-1 sm:text-[12px]">
                        {weekday}
                      </span>
                    </>
                  );
                })()}
              </div>

              {/* Divider */}
              <div className="h-16 w-px shrink-0 bg-brand/10 sm:h-16" />

              {/* Mock Information */}
              <div className="min-w-0 flex-1 text-left sm:ml-2">
                <h3 className="break-words text-[15px] font-bold leading-6 text-ink sm:text-[18px] sm:leading-7">
                  {upcomingMock.mockName}
                </h3>

                <p className="mt-1 break-words text-[12px] font-normal leading-5 text-muted sm:text-[14px]">
                  {upcomingMock.sourceInstitute} · {upcomingMock.examType}
                </p>

                {!!upcomingMock.testDurationMinutes && (
                  <div className="mt-3 flex items-center gap-2 sm:mt-4">
                    <span className="flex size-4 shrink-0 items-center justify-center text-ink">
                      <ClockIcon className="size-4" />
                    </span>

                    <span className="text-[13px] font-medium leading-5 text-ink sm:text-sm">
                      {upcomingMock.testDurationMinutes} Minutes
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Countdown Card */}
            <div className="flex w-full items-center gap-4 rounded-xl border border-brand/10 bg-tint p-4 sm:p-5 lg:w-[320px] lg:flex-shrink-0">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface shadow-sm dark:bg-[#111145] sm:h-13 sm:w-13">
                <span className="text-ink [&>svg]:h-5 [&>svg]:w-5">
                  <ClockIcon className="size-[18px] sm:size-[21px]" />
                </span>
              </div>

              <div className="min-w-0">
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
        {/* Section Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-5 pl-10 sm:px-6 sm:pl-14 lg:px-8 lg:pl-[72px]">
          <h2 className="text-[18px] font-extrabold leading-7 text-ink">
            Recent Mocks
          </h2>

          {deleteError && (
            <p className="text-caption font-semibold text-warning">
              {deleteError}
            </p>
          )}
        </div>

        {/* Desktop / Tablet Table - with pagination animation only */}
        <AnimatePresence mode="wait">
          <motion.div
            key={isPageChanging ? `page-${page}` : 'table'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="hidden overflow-x-auto px-6 py-4 md:block sm:px-8 lg:px-10"
          >
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr className="h-12 border-0 bg-[#F9FAFB80] [box-shadow:0_0_0_100vmax_#F9FAFB80] [clip-path:inset(0_-100vmax)] dark:bg-[var(--border-ghost-button,#FAF7F240)] dark:[box-shadow:0_0_0_100vmax_var(--border-ghost-button,#FAF7F240)]">
                  <th className="py-0 pl-4 pr-2 text-left text-caption font-bold uppercase tracking-[0.6px] text-muted dark:text-white sm:pl-6 lg:pl-8">
                    Mock Test
                  </th>

                  <th className="py-0 text-left text-caption font-bold uppercase tracking-[0.6px] text-muted dark:text-white">
                    Date
                  </th>

                  <th className="py-0 text-left text-caption font-bold uppercase tracking-[0.6px] text-muted dark:text-white">
                    Score
                  </th>

                  <th className="py-0 text-left text-caption font-bold uppercase tracking-[0.6px] text-muted dark:text-white">
                    Accuracy
                  </th>

                  <th className="py-0 text-center text-caption font-bold uppercase tracking-[0.6px] text-muted dark:text-white">
                    Action
                  </th>

                  <th className="w-14 border-0 pr-4 sm:pr-6 lg:pr-8" />
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-sm text-muted"
                    >
                      Loading mocks…
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-sm text-warning"
                    >
                      {error}
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-sm text-muted"
                    >
                      No mocks yet.
                    </td>
                  </tr>
                ) : (
                  items.map((mock) => (
                    <tr
                      key={mock.id}
                      className="border-b border-brand/5 last:border-0"
                    >
                      <td className="py-5 pl-4 pr-2 sm:pl-6 lg:pl-8">
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
                          {mock.totalScore != null
                            ? `${mock.totalScore}/${mock.maxScore}`
                            : "—"}
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

                      <td className="py-5 pr-4 text-center sm:pr-6 lg:pr-8">
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
          </motion.div>
        </AnimatePresence>

        {/* Mobile View - with pagination animation only */}
        <AnimatePresence mode="wait">
          <motion.div
            key={isPageChanging ? `mobile-page-${page}` : 'mobile-table'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="flex flex-col gap-3 p-4 md:hidden sm:p-6"
          >
            {isLoading ? (
              <p className="py-8 text-center text-sm text-muted">
                Loading mocks…
              </p>
            ) : error ? (
              <p className="py-8 text-center text-sm text-warning">
                {error}
              </p>
            ) : items.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">
                No mocks yet.
              </p>
            ) : (
              items.map((mock) => (
                <div
                  key={mock.id}
                  className="rounded-xl border border-brand/10 bg-surface/90 p-4"
                >
                  {/* Mock Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-body-lg font-bold leading-5 text-ink">
                        {mock.mockName}
                      </p>

                      <p className="mt-1 text-[14px] leading-5 text-muted">
                        {formatMockDate(mock.attemptedDate)}
                      </p>
                    </div>

                    <div className="shrink-0">
                      <MoreOptionsMenu
                        label={`More options for ${mock.mockName}`}
                        onDelete={() => setConfirmDeleteId(mock.id)}
                      />
                    </div>
                  </div>

                  {/* Score / Accuracy */}
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium leading-5 text-muted">
                        Score
                      </p>

                      <p className="text-body-lg font-bold leading-5 text-ink">
                        {mock.totalScore != null
                          ? `${mock.totalScore}/${mock.maxScore}`
                          : "—"}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="text-[14px] font-medium leading-5 text-muted">
                        Accuracy
                      </p>

                      <p className="break-words text-body-lg font-bold leading-5 text-ink">
                        {mock.accuracyPercentage}%
                      </p>
                    </div>
                  </div>

                  {/* Action */}
                  {(() => {
                    const action = getMockAction(mock);

                    if (action.disabled) {
                      return (
                        <button
                          type="button"
                          disabled
                          className="mt-4 flex h-9 w-full cursor-not-allowed items-center justify-center rounded-lg border border-brand/15 bg-surface px-4 text-caption font-bold leading-4 text-muted"
                        >
                          {action.label}
                        </button>
                      );
                    }

                    return (
                      <Link
                        href={action.href}
                        className="mt-4 flex h-9 w-full items-center justify-center rounded-lg border border-ink bg-surface px-4 text-caption font-bold leading-4 text-ink transition hover:border-cta hover:bg-cta hover:text-white"
                      >
                        {action.label}
                      </Link>
                    );
                  })()}
                </div>
              ))
            )}
          </motion.div>
        </AnimatePresence>

        {/* Pagination */}
        {pagination && (
          <div className="flex min-h-[68px] flex-col items-center justify-center gap-3 border-t border-brand/10 px-4 py-4 sm:px-6 lg:px-8 md:relative md:min-h-[68px] md:flex-row md:justify-center md:py-5">
            {/* Showing text */}
            <p className="text-center text-caption leading-4 text-muted">
              Showing {items.length} of {pagination.total} mocks
            </p>

            {/* Pagination Controls */}
            <div className="flex items-center justify-center gap-3 md:absolute md:right-4 sm:md:right-6 lg:md:right-8">
              <button
                type="button"
                onClick={() => handlePageChange(Math.max(1, page - 1))}
                disabled={page <= 1 || isLoading}
                aria-label="Previous page"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-brand/15 text-ink transition hover:bg-tint-strong disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <ChevronRightIcon className="h-4 w-4 rotate-180" />
              </button>

              <span className="whitespace-nowrap text-caption font-semibold text-ink">
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() =>
                  handlePageChange(Math.min(totalPages, page + 1))
                }
                disabled={page >= totalPages || isLoading}
                aria-label="Next page"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-brand/15 text-ink transition hover:bg-tint-strong disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <ChevronRightIcon />
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-5 rounded-[20px] border border-brand/10 bg-surface px-4 py-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.18)] sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:gap-8 sm:text-left">
          {/* Icon */}
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-brand/20 bg-icon-chip-bg text-ink dark:border-[#C7D2FE] dark:bg-[#FAF7F2]/8 [&>svg]:h-6 [&>svg]:w-6"
            style={iconBgStyle}
          >
            <UploadIcon />
          </div>

          {/* Content */}
          <div className="min-w-0">
            <h3 className="text-[18px] font-bold leading-7 text-ink">
              Have a new mock score?
            </h3>

            <p className="mt-1 text-body-lg leading-6 text-muted">
              Upload your scorecard or enter manually to get your analysis.
            </p>
          </div>
        </div>

        {/* Button */}
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