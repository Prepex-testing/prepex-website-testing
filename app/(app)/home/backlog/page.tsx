"use client";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CircularProgress } from "@/components/ui/CircularProgress";
import { RecoveryModeModal } from "@/components/home/RecoveryModeModal";
import { AddBacklogModal } from "@/components/home/AddBacklogModal";
import { AddCustomTaskModal } from "@/components/plan/AddCustomTaskModal";
import { useTheme } from "@/components/theme/ThemeProvider";
import {
  getBacklog,
  holdBacklogTask,
  reviveBacklogTask,
  skipBacklogTask,
  type BacklogHealth,
  type BacklogTask,
} from "@/lib/api/backlog";
import {
  // ArrowLeftIcon,
  // BellIcon,
  // AlertTriangleIcon,
  // ClockIcon,
  // BoltIcon,
  // CalendarIcon,
  // ListIcon,
  MoreIcon,
  // GlobeIcon,
  // FlaskIcon,
  // CalculatorIcon,
  // TargetIcon,
  ChevronDownIcon,
} from "@/components/ui/icons";

import { LineIcon, BoltIcon, CrossIcon, BoxIcon, MenuIcon, ChemistryIcon, MathIcon, PhysicsIcon, Clock ,BellIcon,ArrowLeftIcon} from "@/assets/icons";

const SUBJECT_ICON_BY_CODE: Record<string, React.ReactNode> = {
  PHY: <PhysicsIcon />,
  CHEM: <ChemistryIcon />,
  MATH: <MathIcon />,
};

function subjectIcon(code?: string) {
  return (code && SUBJECT_ICON_BY_CODE[code]) ?? <BoxIcon />;
}

const TASK_TYPE_DISPLAY: Record<string, string> = {
  PRACTICE: "Practice",
  REVISION: "Revision",
  NEW_LEARNING: "New Learning",
  WELLNESS: "Other",
};

export default function BacklogPage() {
  const [isRecoveryOpen, setRecoveryOpen] = useState(false);
  const [isAddBacklogOpen, setAddBacklogOpen] = useState(false);
  const [planningTask, setPlanningTask] = useState<BacklogTask | null>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [tasks, setTasks] = useState<BacklogTask[]>([]);
  const [heldTasks, setHeldTasks] = useState<BacklogTask[]>([]);
  const [health, setHealth] = useState<BacklogHealth | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const loadBacklog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await getBacklog();
      setTasks(data.tasks);
      setHeldTasks(data.heldTasks);
      setHealth(data.health);
    } catch {
      setError("Couldn't load your backlog. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBacklog();
  }, [loadBacklog]);

  useEffect(() => {
    if (!openMenuId) return;

    const handleClickOutside = (event: MouseEvent) => {
      const menuEl = menuRefs.current[openMenuId];
      if (menuEl && !menuEl.contains(event.target as Node)) setOpenMenuId(null);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openMenuId]);

  const handleHold = async (taskId: string) => {
    setActioningId(taskId);
    try {
      await holdBacklogTask(taskId);
      await loadBacklog();
    } catch {
      // Best-effort — the button stays actionable so the user can retry.
    } finally {
      setActioningId(null);
    }
  };

  const handleRevive = async (taskId: string) => {
    setOpenMenuId(null);
    setActioningId(taskId);
    try {
      await reviveBacklogTask(taskId);
      await loadBacklog();
    } catch {
      // Best-effort — the menu still works so the user can retry.
    } finally {
      setActioningId(null);
    }
  };

  const handleSkip = async (taskId: string) => {
    setOpenMenuId(null);
    setActioningId(taskId);
    try {
      await skipBacklogTask(taskId);
      await loadBacklog();
    } catch {
      // Best-effort — the menu still works so the user can retry.
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/home" aria-label="Back to Home" className="text-ink">
            <ArrowLeftIcon />
          </Link>
          <h1 className="text-h1 text-ink">Your Backlog</h1>
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

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {/* Progress Card */}
        <div className="flex h-[142px] flex-col items-center justify-center rounded-2xl  p-6">
          <CircularProgress
            percent={65}
            displayValue={health?.activeTaskCount ?? 0}
            suffix=""
            label="Tasks"
            size={72}
            progressColor="#4C1D95"
          />

          <span className="mt-3 inline-flex h-[23px] items-center justify-center rounded-full bg-[#4C1D95] px-3 text-[10px] font-bold uppercase tracking-[0.8px] text-white shadow-[0px_1px_2px_0px_#0000000D]">
            {health?.tier ?? "—"}
          </span>
        </div>

        {/* Total Backlog */}
        <div className="flex h-[142px] items-center rounded-2xl border border-brand/10 bg-surface p-6">
          <span className="mr-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg  bg-icon-chip-bg text-ink dark:bg-[#FAF7F2]/8">
            <LineIcon />
          </span>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.6px] text-muted">
              Total Backlog
            </p>

            <p className="mt-1 text-[24px] font-semibold leading-[31px] text-ink">
              {health ? `${health.taskCount} tasks` : "—"}
            </p>
          </div>
        </div>

        {/* Time Span */}
        <div className="flex h-[142px] items-center rounded-2xl border border-brand/10 bg-surface p-6">
          <span className="mr-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-icon-chip-bg text-ink dark:bg-[#FAF7F2]/8">
            <Clock />
          </span>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.6px] text-muted">
              Time Span
            </p>

            <p className="mt-1 text-[24px] font-semibold leading-[31px] text-ink">
              {health ? `Last ${health.maxDaysOverdue} days` : "—"}
            </p>
          </div>
        </div>

        {/* Weekly Forecast */}
        <div className="flex h-[142px] items-center rounded-2xl border border-brand/10 bg-surface p-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.6px] text-muted">
              Weekly Forecast
            </p>

            <p className="mt-1 text-[24px] font-semibold leading-[31px] text-ink">
              {health?.message ?? "—"}
            </p>
          </div>
        </div>
      </div>

      {health?.recoveryRequired && (
        <div className="flex flex-col gap-4 rounded-2xl border border-brand/10 bg-surface p-6 backdrop-blur-[12px] lg:h-[98px] lg:flex-row lg:items-center lg:justify-between">
          {/* Left */}
          <div className="flex items-center gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-icon-chip-bg text-ink dark:bg-[#FAF7F2]/8">
              <BoltIcon />
            </span>

            <div>
              <h3 className="text-[14px] font-semibold leading-5 text-ink">
                Your backlog is building.
              </h3>

              <p className="mt-0.5 text-[12px] leading-4 text-muted">
                Want to enter Recovery Mode to get back on track?
              </p>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              className="flex h-12 items-center justify-center px-4 text-[16px] font-semibold text-muted transition-colors hover:text-ink"
            >
              Learn more
            </button>
            <button
              type="button"
              onClick={() => setRecoveryOpen(true)}
              className="flex h-12 w-[163px] items-center justify-center whitespace-nowrap rounded-lg border border-brand bg-surface px-6 text-[16px] font-semibold text-ink transition-colors hover:bg-tint-strong"
            >
              Start Recovery
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="h-[18px] w-[4px] rounded-full bg-warning" />

            <h2 className="text-[20px] font-semibold uppercase leading-7 text-ink">
              Backlogs
            </h2>

            <span
              className={`text-[14px] font-normal leading-[21px] ${isDark ? "text-ink" : "text-muted"}`}
            >
              (high-impact first)
            </span>
          </div>

          <button
            type="button"
            onClick={() => setAddBacklogOpen(true)}
            className="flex h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-lg bg-cta px-5 text-[14px] font-semibold text-white transition-colors hover:bg-[#E8623F]"
          >
            Add Backlog
          </button>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-brand/10 bg-surface px-8 py-8 text-center text-[14px] font-medium text-muted">
            Loading backlog…
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-brand/10 bg-surface px-8 py-8 text-center text-[14px] font-medium text-warning">
            {error}
          </div>
        ) : tasks.length === 0 ? (
          <div className="rounded-2xl border border-brand/10 bg-surface px-8 py-8 text-center text-[14px] font-medium text-muted">
            No backlog task available.
          </div>
        ) : (
          tasks.map((item) => {
            const breadcrumb = item.chapter?.subject.name ?? "General";
            const title = item.chapter?.name ?? item.title;
            const weight = item.priorityWeight;

            return (
              <div
                key={item.id}
                className="relative flex flex-col justify-between rounded-2xl border border-brand/10 bg-surface px-8 py-8 shadow-[0px_4px_20px_0px_#00000008] lg:flex-row lg:items-center"
              >
                {/* Left */}
                <div className="flex-1">
                  {/* Subject */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-tint px-2 py-1 text-[11px] font-medium leading-[13px] text-ink">
                      {breadcrumb}
                    </span>

                    <ChevronDownIcon className="h-3 w-3 -rotate-90 text-muted" />

                    <span className="text-[12px] font-semibold tracking-[0.24px] text-muted">
                      {title}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="mt-2 text-[20px] font-semibold leading-7 text-ink">
                    {title}
                  </h3>

                  {/* Meta */}
                  <div className="mt-2 flex flex-wrap items-center gap-4">
                    <span className="flex items-center gap-1 text-[12px] font-semibold tracking-[0.24px] text-warning">
                      <CrossIcon />
                      {item.daysOverdue} days overdue
                    </span>

                    <span
                      className={`flex items-center gap-1 text-[12px] font-semibold tracking-[0.24px] ${isDark ? "text-white" : "text-muted"}`}
                    >
                      <BoxIcon />
                      weight {weight}
                    </span>
                  </div>

                  {/* Progress */}
                  <div className="mt-4 h-2 w-full max-w-[482px] rounded-full bg-tint-strong">
                    <div
                      className={`h-2 rounded-full ${isDark ? "bg-white" : "bg-brand"}`}
                      style={{
                        width: `${weight * 100}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Right */}
                <div className="mt-6 flex items-center gap-2 lg:mt-0 lg:ml-8">
                  <button
                    type="button"
                    onClick={() => setPlanningTask(item)}
                    className={`flex h-[44px] w-32 items-center justify-center rounded-lg text-[16px] font-semibold transition hover:bg-[#FF7A59] hover:text-white ${isDark ? "border border-white bg-transparent text-white" : "bg-cta text-white"
                      }`}
                  >
                    Add to plan
                  </button>

                  <button
                    type="button"
                    onClick={() => handleHold(item.id)}
                    disabled={actioningId === item.id}
                    className={`flex h-[44px] w-20 items-center justify-center rounded-lg border bg-surface text-[16px] font-medium text-body-text transition hover:bg-tint-strong disabled:cursor-not-allowed disabled:opacity-60 ${isDark ? "border-white" : "border-brand/15"
                      }`}
                  >
                    {actioningId === item.id ? "Holding…" : "Hold"}
                  </button>

                  <button
                    type="button"
                    className={`flex h-10 w-10 items-center justify-center rounded-lg hover:bg-tint-strong ${isDark ? "text-white" : "text-muted"}`}
                  >
                    <span className="rotate-90">
                      <MoreIcon />
                    </span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <span className="text-muted">
            <MenuIcon />
          </span>

          <h2 className="text-[20px] font-semibold uppercase leading-7 tracking-[-0.5px] text-ink">
            Held Backlog
          </h2>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {heldTasks.length === 0 ? (
            <div className="rounded-2xl border border-brand/10 bg-surface px-8 py-8 text-center text-[14px] font-medium text-muted lg:col-span-2">
              No held backlog task available.
            </div>
          ) : (
            heldTasks.map((item) => {
              const subject = item.chapter?.subject;
              const title = item.chapter?.name ?? item.title;

              return (
                <div
                  key={item.id}
                  className="relative flex h-[90px] items-center justify-between rounded-2xl border border-brand/10 bg-surface p-5 shadow-[0px_4px_20px_0px_#00000008]"
                >
                  {/* Left */}
                  <div className="flex items-center gap-4">
                    {/* Subject Icon */}
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-icon-chip-bg text-ink dark:bg-[#FAF7F2]/8">
                      {subjectIcon(subject?.code)}
                    </span>

                    {/* Content */}
                    <div>
                      <span className="inline-flex rounded-sm bg-tint-strong px-2 py-[2px] text-[10px] font-medium text-ink">
                        {subject?.name ?? "General"}
                      </span>

                      <h3 className="mt-1 text-[18px] font-semibold leading-5 text-ink">
                        {title}
                      </h3>

                      <p className="mt-1 text-[11px] font-medium leading-4 text-muted">
                        {item.daysOverdue} days overdue, weight {item.priorityWeight}
                      </p>
                    </div>
                  </div>

                  {/* More Button */}
                  <div ref={(el) => { menuRefs.current[item.id] = el; }} className="relative">
                    <button
                      type="button"
                      aria-label={`More options for ${title}`}
                      aria-haspopup="menu"
                      aria-expanded={openMenuId === item.id}
                      disabled={actioningId === item.id}
                      onClick={() =>
                        setOpenMenuId((current) => (current === item.id ? null : item.id))
                      }
                      className={`flex h-8 w-8 items-center justify-center rounded-lg hover:bg-tint-strong disabled:cursor-not-allowed disabled:opacity-60 ${isDark ? "text-white" : "text-muted"}`}
                    >
                      <span className="rotate-90">
                        <MoreIcon />
                      </span>
                    </button>

                    {openMenuId === item.id && (
                      <div
                        role="menu"
                        className="absolute right-0 top-full z-20 mt-2 w-44 max-w-[calc(100vw-2rem)] rounded-2xl bg-surface p-2 shadow-modal"
                      >
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => handleRevive(item.id)}
                          className="flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-medium text-ink hover:bg-tint-strong"
                        >
                          Revive Backlog
                        </button>

                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => handleSkip(item.id)}
                          className="flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-medium text-ink hover:bg-tint-strong"
                        >
                          Skip Backlog
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <RecoveryModeModal
        open={isRecoveryOpen}
        onClose={() => {
          if (isAddBacklogOpen) return;
          setRecoveryOpen(false);
        }}
        onAddBacklogChapters={() => setAddBacklogOpen(true)}
      />
      <AddBacklogModal
        open={isAddBacklogOpen}
        onClose={() => setAddBacklogOpen(false)}
        onAdded={loadBacklog}
      />
      <AddCustomTaskModal
        open={planningTask != null}
        onClose={() => setPlanningTask(null)}
        mode="planFromBacklog"
        backlogTaskId={planningTask?.id}
        onPlanned={loadBacklog}
        initialValues={
          planningTask
            ? {
                taskName: planningTask.chapter?.name
                  ? `Backlog . ${planningTask.chapter.name}`
                  : planningTask.title,
                subjectValue: planningTask.chapter?.subject.name ?? "",
                topicValue: planningTask.chapter?.name ?? "",
                taskType: TASK_TYPE_DISPLAY[planningTask.taskType] ?? planningTask.taskType,
                taskTypeApiValue: planningTask.taskType,
                chapterId: planningTask.chapter?.id ?? planningTask.chapterId ?? "",
                subjectId: planningTask.chapter?.subject.id,
              }
            : undefined
        }
      />
    </div>
  );
}
