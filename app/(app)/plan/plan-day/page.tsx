"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Input } from "@/components/ui/Input";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { PageLoader } from "@/components/ui/PageLoader";
import { AddCustomTaskModal } from "@/components/plan/AddCustomTaskModal";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import { useTheme } from "@/components/theme/ThemeProvider";
import { PlusIcon, XIcon } from "@/components/ui/icons";
import { StarIcon, MinusIcon, PinIcon, ArrowLeftIcon } from "@/assets/icons";
import {
  getDayView,
  markNoStudyDay,
  unmarkNoStudyDay,
  removeAnchorTask,
  formatShortDayLabel,
  todayDateKey,
  type DayView,
} from "@/lib/api/calendar";
import { submitMock } from "@/lib/api/mock";

const NO_STUDY_REASONS = ["Festival", "Family", "Health", "School exam", "Personal"];

const MOCK_DURATION_OPTIONS = [
  { value: "60", label: "1 Hour" },
  { value: "120", label: "2 Hours" },
  { value: "180", label: "3 Hours" },
  { value: "240", label: "4 Hours" },
];

const ICON_BADGE_CLASSES =
  "flex h-12 w-12 items-center justify-center rounded-md bg-[#EEF0F8] text-[#1A1A4E] dark:border-[#FAF7F2] dark:bg-[#FAF7F2]/8 dark:text-[#FAF7F2]";

type Notice = { tone: "info" | "warning" | "error"; message: string } | null;

function PlanDayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const today = useMemo(() => todayDateKey(), []);
  const date = searchParams.get("date") ?? today;

  const [view, setView] = useState<DayView | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [mockName, setMockName] = useState("");
  const [mockDuration, setMockDuration] = useState("180");
  const [mockInstitute, setMockInstitute] = useState("");
  const [isAddTaskOpen, setAddTaskOpen] = useState(false);

  const refresh = useCallback(async () => {
    const { data } = await getDayView(date);
    // Only future days can be planned; a past date belongs in history.
    if (!data.isFuture) {
      router.replace(`/plan/day-plan?date=${date}`);
      return null;
    }
    setView(data);
    return data;
  }, [date, router]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setNotice(null);
      try {
        const { data } = await getDayView(date);
        if (cancelled) return;
        if (!data.isFuture) {
          router.replace(`/plan/day-plan?date=${date}`);
          return;
        }
        setView(data);
      } catch {
        if (!cancelled) setView(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [date, router]);

  const toggleReason = (reason: string) => {
    setSelectedReasons((prev) =>
      prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason],
    );
  };

  const handleMarkNoStudy = async () => {
    setBusy("no-study");
    setNotice(null);
    try {
      const { data } = await markNoStudyDay(date, selectedReasons.join(", ") || undefined);
      await refresh();
      setNotice(
        data.warning
          ? { tone: "warning", message: data.warning }
          : {
            tone: "info",
            message:
              "Marked as a No-Study Day. No plan will generate, and your streak is protected without using a Streak Freeze.",
          },
      );
    } catch {
      setNotice({ tone: "error", message: "Couldn't mark this day. Please try again." });
    } finally {
      setBusy(null);
    }
  };

  const handleUnmarkNoStudy = async () => {
    setBusy("no-study");
    setNotice(null);
    try {
      await unmarkNoStudyDay(date);
      await refresh();
      setSelectedReasons([]);
      setNotice({ tone: "info", message: "No-Study Day removed. A plan will generate again." });
    } catch {
      setNotice({ tone: "error", message: "Couldn't remove the No-Study Day. Please try again." });
    } finally {
      setBusy(null);
    }
  };

  /**
   * Scheduling a mock goes through the same POST /api/mock the result entry
   * flow uses — with no scores. That creates the MockAnalysis row as PENDING
   * *and* its MOCK_DAY calendar anchor in one write, so the day-after "add
   * your result" prompt (PRD 9.4.3) already has a record to attach to.
   */
  const handleConfirmMock = async () => {
    if (!mockName.trim()) {
      setNotice({ tone: "error", message: "Give the mock a name so you recognise it later." });
      return;
    }

    setBusy("mock");
    setNotice(null);
    try {
      await submitMock({
        attemptedDate: date,
        mockName: mockName.trim(),
        sourceInstitute: mockInstitute.trim() || undefined,
        testDurationMinutes: Number(mockDuration),
        entryMethod: "MANUAL",
        entryTier: "QUICK",
      });
      await refresh();
      setMockName("");
      setMockInstitute("");
      setNotice({
        tone: "info",
        message: "Mock scheduled. The plan for that day will stay light, and we'll ask for your result after.",
      });
    } catch (err) {
      setNotice({
        tone: "error",
        message:
          err instanceof Error && err.message ? err.message : "Couldn't schedule the mock. Please try again.",
      });
    } finally {
      setBusy(null);
    }
  };

  const handleRemoveAnchor = async (anchorId: string) => {
    setBusy(anchorId);
    setNotice(null);
    try {
      await removeAnchorTask(anchorId);
      await refresh();
    } catch {
      setNotice({ tone: "error", message: "Couldn't remove that anchor task. Please try again." });
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <PageLoader label="Loading this day…" />;

  if (!view) {
    return (
      <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <h1 className="text-h1 text-ink">Plan this day</h1>
        <p className="rounded-2xl border border-brand/10 bg-surface p-10 text-center text-sm text-muted">
          Couldn&apos;t load this day. Go back to the calendar and try again.
        </p>
        <Link href="/plan" className="text-center text-sm font-semibold text-ink underline">
          Back to Plan
        </Link>
      </div>
    );
  }

  const isNoStudy = !!view.noStudyDay;
  const usage = view.noStudyUsage;
  const anchorLoad = view.anchorLoad;

  const statusLine = isNoStudy
    ? "Currently: No plan will generate — this is a No-Study Day"
    : view.scheduledMock
      ? `Currently: Mock day — ${view.scheduledMock.mockName ?? "mock test"}. Plan will be light morning revision`
      : view.anchorTasks.length > 0
        ? `Currently: AI will build the day around your ${view.anchorTasks.length} anchor task${view.anchorTasks.length === 1 ? "" : "s"}`
        : "Currently: AI will generate your plan for this day";

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1 flex items-center gap-3">
          <Link href="/plan" aria-label="Back to Plan" className="text-ink">
            <ArrowLeftIcon />
          </Link>
          <h1 className="text-h1 text-ink">Plan this day</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <ThemeToggle />
          <NotificationBell />
          <UserMenu />
        </div>
      </div>

      <p className="text-lg font-bold text-ink">{formatShortDayLabel(date)}</p>

      <div
        className={`rounded-lg  bg-surface py-6 pl-7 pr-6 shadow-sm ${isNoStudy ? "border-cta" : "border-brand"}`}
      >
        <p className="text-lg font-bold text-ink">{statusLine}</p>
      </div>

      {notice && (
        <p
          className={`rounded-xl p-4 text-sm font-medium ${notice.tone === "error"
              ? "bg-danger-bg text-danger"
              : notice.tone === "warning"
                ? "bg-warning-bg text-warning"
                : "bg-tint text-ink"
            }`}
          role="status"
          aria-live="polite"
        >
          {notice.message}
        </p>
      )}

      <p className="text-xl font-semibold leading-7 text-ink">Mark this day as</p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ---------------------------------------------------------------- */}
        {/* No-Study Day                                                     */}
        {/* ---------------------------------------------------------------- */}
        <div
          className={`rounded-2xl border-2 bg-surface p-8 ${isNoStudy ? (isDark ? "border-white" : "border-brand") : "border-brand/10"
            }`}
        >
          <span className={ICON_BADGE_CLASSES}>
            <MinusIcon />
          </span>
          <p className="mt-3 text-xl font-semibold leading-7 text-ink">No-Study Day</p>
          <p className="mt-2 text-base leading-6 text-muted">
            Festival, family event, exam, or personal day. Plan will skip. Streak protected.
          </p>
          <p className="mt-2 text-[10px] font-medium text-muted">
            {usage ? `${usage.used} of ${usage.limit} used this month` : ""}
            {usage?.exceeded ? " · over your usual limit" : ""}
          </p>

          {isNoStudy ? (
            <div className="mt-4 flex flex-col gap-3">
              <p className="rounded-lg bg-tint px-3 py-2 text-xs text-ink">
                Marked as a No-Study Day. Your streak bridges this day and your Streak Freeze
                stays unused.
              </p>
              {view.noStudyDay?.notes && (
                <p className="text-xs text-muted">Reason: {view.noStudyDay.notes}</p>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={handleUnmarkNoStudy}
                disabled={busy !== null}
                className="border-[#1A1A4E]! dark:border-white!"
              >
                {busy === "no-study" ? "Removing…" : "Remove No-Study Day"}
              </Button>
            </div>
          ) : (
            <>
              <p className="mt-4 text-[10px] font-medium uppercase tracking-wide text-muted">
                Reason:
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                {NO_STUDY_REASONS.map((reason) => {
                  const selected = selectedReasons.includes(reason);
                  return (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => toggleReason(reason)}
                      className={`inline-flex h-[26.5px] items-center justify-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${selected
                          ? "border-[#1A1A4E] bg-[#1A1A4E] text-white dark:border-white dark:bg-white dark:text-[#1A1A4E]"
                          : "border-[#1A1A4E] bg-surface text-[#1A1A4E] hover:bg-tint-strong dark:border-white dark:text-white"
                        }`}
                    >
                      {reason}
                    </button>
                  );
                })}
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleMarkNoStudy}
                disabled={busy !== null}
                className="mt-4 w-full border-[#1A1A4E]! dark:border-white!"
              >
                {busy === "no-study" ? "Marking…" : "Mark No-Study Day"}
              </Button>
            </>
          )}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Mock Day                                                         */}
        {/* ---------------------------------------------------------------- */}
        <div
          className={`rounded-2xl border-2 bg-surface p-8 ${view.scheduledMock ? (isDark ? "border-white" : "border-brand") : "border-brand/10"
            }`}
        >
          <span className={ICON_BADGE_CLASSES}>
            <StarIcon />
          </span>
          <p className="mt-3 text-xl font-semibold leading-7 text-ink">Mock Day</p>
          <p className="mt-2 text-base leading-6 text-muted">
            Mock test day. Plan will be light morning revision only.
          </p>

          {view.scheduledMock ? (
            <div className="mt-4 flex flex-col gap-3">
              <div className="rounded-lg bg-tint px-3 py-2">
                <p className="text-sm font-semibold text-ink">
                  {view.scheduledMock.mockName ?? "Mock Test"}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {view.scheduledMock.testDurationMinutes
                    ? `${Math.round(view.scheduledMock.testDurationMinutes / 60)} hours`
                    : "Scheduled"}
                  {view.scheduledMock.analysisStatus === "PENDING" ? " · result pending" : ""}
                </p>
              </div>
              <Button
                href={`/home/mock-analysis`}
                variant="secondary"
                size="sm"
                className="border-[#1A1A4E]! dark:border-white!"
              >
                Manage mocks
              </Button>
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              <Input
                label="Mock Name"
                name="mockName"
                placeholder="e.g. JEE Main Mock 4"
                value={mockName}
                onChange={(event) => setMockName(event.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <CustomSelect
                  label="Duration"
                  options={MOCK_DURATION_OPTIONS}
                  value={mockDuration}
                  onChange={setMockDuration}
                  placeholder="Select duration"
                  // Steps down on mobile — this field shares a 2-column grid,
                  // so the default 16px truncates on narrow screens.
                  valueTextClassName="text-[14px] sm:text-[16px]"
                  placeholderTextClassName="text-[12px] sm:text-[14px]"
                />
                <Input
                  label="Institute"
                  name="mockInstitute"
                  placeholder="e.g. Allen"
                  value={mockInstitute}
                  onChange={(event) => setMockInstitute(event.target.value)}
                />
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleConfirmMock}
                disabled={busy !== null}
                className="border-[#1A1A4E]! dark:border-white!"
              >
                {busy === "mock" ? "Scheduling…" : "Confirm Mock"}
              </Button>
            </div>
          )}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Custom day — anchor tasks                                        */}
        {/* ---------------------------------------------------------------- */}
        <div
          className={`rounded-2xl border-2 bg-surface p-8 ${view.anchorTasks.length > 0 ? (isDark ? "border-white" : "border-brand") : "border-brand/10"
            }`}
        >
          <span className={ICON_BADGE_CLASSES}>
            <PinIcon />
          </span>
          <p className="mt-3 text-xl font-semibold leading-7 text-ink">Custom day</p>
          <p className="mt-2 text-base leading-6 text-muted">
            Add anchor tasks. AI will build the rest of the day around them.
          </p>

          <button
            type="button"
            onClick={() => setAddTaskOpen(true)}
            className={`mt-4 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed py-2.5 text-sm font-semibold text-ink hover:bg-tint-strong ${isDark ? "border-white" : "border-brand/25"}`}
          >
            <PlusIcon />
            Add Anchor Task
          </button>

          <div className="mt-4 flex flex-col gap-2">
            {view.anchorTasks.length === 0 ? (
              <p className="text-xs text-muted">No anchor tasks yet for this day.</p>
            ) : (
              view.anchorTasks.map((anchor) => (
                <div
                  key={anchor.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-tint-strong px-3 py-2 text-xs"
                >
                  <span className="flex min-w-0 items-center gap-1 text-ink">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                    <span className="truncate">{anchor.title}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-muted">{anchor.durationMinutes}m</span>
                    <button
                      type="button"
                      aria-label={`Remove ${anchor.title}`}
                      onClick={() => handleRemoveAnchor(anchor.id)}
                      disabled={busy !== null}
                      className="text-muted transition-colors hover:text-danger disabled:opacity-50"
                    >
                      <XIcon />
                    </button>
                  </span>
                </div>
              ))
            )}
          </div>

          {anchorLoad && anchorLoad.dailyTargetMinutes !== null && (
            <p
              className={`mt-3 text-[10px] font-medium ${anchorLoad.exceedsTarget ? "text-warning" : "text-muted"}`}
            >
              {(anchorLoad.anchorMinutes / 60).toFixed(1)}h of your{" "}
              {(anchorLoad.dailyTargetMinutes / 60).toFixed(1)}h target
              {anchorLoad.exceedsTarget ? " — over target. Shorten or move one, or keep it." : ""}
            </p>
          )}
        </div>
      </div>

      <AddCustomTaskModal
        open={isAddTaskOpen}
        onClose={() => setAddTaskOpen(false)}
        mode="anchor"
        anchorDate={date}
        onAnchorAdded={(warning) => {
          void refresh();
          if (warning) setNotice({ tone: "warning", message: warning });
        }}
      />
    </div>
  );
}

export default function PlanDayPage() {
  return (
    <Suspense fallback={<PageLoader label="Loading this day…" />}>
      <PlanDayContent />
    </Suspense>
  );
}
