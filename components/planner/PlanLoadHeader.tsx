"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getBacklogHub, hm, type BacklogHub } from "@/lib/api/backlogHub";
import { getCurrentGoals, type Goal } from "@/lib/api/goals";
import type { PlanDay } from "@/lib/api/plannerV2";
import { getRevisionHub, type RevisionHub } from "@/lib/api/revisionLogs";
import { describeGoal } from "@/lib/goals/format";
import { formatDuration } from "@/lib/planner/format";

const BAR = { green: "bg-[var(--success)]", amber: "bg-warning", red: "bg-danger" } as const;

/** What the day is asking of the student against what they usually complete: green up to 85%, amber to 100%, red beyond. */
export function loadMeter(planned: number, available: number): keyof typeof BAR {
  if (available <= 0) return planned > 0 ? "red" : "green";
  const r = planned / available;
  return r <= 0.85 ? "green" : r <= 1 ? "amber" : "red";
}

function useQuiet<T>(load: () => Promise<T>): T | null {
  const [value, setValue] = useState<T | null>(null);
  useEffect(() => {
    let live = true;
    load().then(
      (res) => live && setValue(res),
      () => undefined,
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loaded once when the header mounts
  }, []);
  return value;
}

function Stat({ label, children, testId }: { label: string; children: React.ReactNode; testId: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1" data-testid={testId}>
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{label}</p>
      {children}
    </div>
  );
}

/**
 * The top of the Planner: how much today asks of the student against what they usually complete, how this week's goals
 * stand, how many revisions are due and where the backlog is. Every part fails quietly: the plan itself never waits for them.
 */
export function PlanLoadHeader({ day }: { day: PlanDay }) {
  const goals = useQuiet(() => getCurrentGoals().then((r) => r.data));
  const backlog = useQuiet<BacklogHub>(getBacklogHub);
  const revisions = useQuiet<RevisionHub>(() => getRevisionHub().then((r) => r.data));

  const available = Math.round(day.capacity.slotMinutes * day.capacity.factor);
  const planned = day.capacity.plannedMinutes;
  const meter = loadMeter(planned, available);
  const percent = available > 0 ? Math.min(100, Math.round((planned / available) * 100)) : planned > 0 ? 100 : 0;

  const live = (goals?.goals ?? []).filter((g: Goal) => g.status === "ACTIVE" || g.status === "DONE");
  const shown = [...live].sort((a, b) => a.progress.percent - b.progress.percent).slice(0, 3);
  const dueNow = revisions ? revisions.dueTodayCount + revisions.overdueCount : null;
  const backlogLeft = backlog ? backlog.totalMinutes - backlog.parkedMinutes : 0;

  return (
    <section aria-label="Today at a glance" data-testid="plan-load" data-meter={meter} className="grid gap-4 rounded-2xl border border-brand/10 bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
      <Stat label="Today's load" testId="load-today">
        <p className="text-[15px] font-extrabold text-ink" data-testid="load-text">
          {formatDuration(planned)} <span className="text-[13px] font-medium text-muted">of about {formatDuration(available)} you usually complete</span>
        </p>
        <div className="h-2 w-full overflow-hidden rounded-full bg-tint-strong dark:bg-[#FAF7F214]" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Today's planned load">
          <div className={`h-full rounded-full ${BAR[meter]}`} style={{ width: `${percent}%` }} />
        </div>
        <p className="text-[12px] text-muted">
          {day.phase.label} phase · {day.daysToExam} days to the exam
        </p>
      </Stat>

      <Stat label="This week's goals" testId="load-goals">
        {shown.length === 0 ? (
          <p className="text-[13px] text-muted">
            No goals yet.{" "}
            <Link href="/goals" className="font-semibold text-ink underline">
              Set them
            </Link>
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {shown.map((g) => (
              <li key={g.id} data-testid="goal-bar">
                <div className="flex items-baseline justify-between gap-2 text-[12px]">
                  <span className="truncate font-semibold text-ink">{describeGoal(g)}</span>
                  <span className="shrink-0 text-muted">{g.progress.current}/{g.progress.target}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-tint-strong dark:bg-[#FAF7F214]">
                  <div className="h-full rounded-full bg-ink/70 dark:bg-[#FAF7F2]/80" style={{ width: `${Math.min(100, g.progress.percent)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Stat>

      <Stat label="Revision" testId="load-revision">
        {dueNow === null ? (
          <p className="text-[13px] text-muted">Checking what is due…</p>
        ) : (
          <>
            <p className="text-[15px] font-extrabold text-ink" data-testid="revision-due">
              {dueNow} {dueNow === 1 ? "chapter" : "chapters"} due
            </p>
            <p className="text-[12px] text-muted">
              {revisions && revisions.overdueCount > 0 ? `${revisions.overdueCount} overdue. ` : ""}
              <Link href="/logs?tab=spaced" className="font-semibold text-ink underline">
                Revision hub
              </Link>
            </p>
          </>
        )}
      </Stat>

      {backlog && backlogLeft > 0 ? (
        <Stat label="Backlog" testId="load-backlog">
          <p className="text-[15px] font-extrabold text-ink">{hm(backlogLeft)} left</p>
          <p className="text-[12px] text-muted">
            {backlog.target.date && backlog.target.feasibility ? (backlog.target.feasibility.meter === "green" ? "On track for your date. " : backlog.target.feasibility.meter === "amber" ? "Tight for your date. " : "Behind your date. ") : `Today's share: ${hm(backlog.todayQuotaMinutes)}. `}
            <Link href="/logs/backlog" className="font-semibold text-ink underline">
              Backlog hub
            </Link>
          </p>
        </Stat>
      ) : null}
    </section>
  );
}
