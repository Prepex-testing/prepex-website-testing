"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getPlanDay, type PlanDay } from "@/lib/api/plannerV2";
import { dateKey, shiftDate } from "@/lib/planner/format";
import { formatClock, formatDuration } from "@/lib/planner/format";

/** After Day Close: tomorrow's plan, already built, in three lines. Fails quietly: the reward screen never waits for it. */
export function TomorrowPreview() {
  const [day, setDay] = useState<PlanDay | null>(null);
  useEffect(() => {
    let live = true;
    const tomorrow = shiftDate(dateKey(), 1);
    Promise.resolve()
      .then(() => getPlanDay(tomorrow))
      .then(
        (res) => live && res && setDay(res.data),
        () => undefined,
      );
    return () => {
      live = false;
    };
  }, []);
  if (!day) return null;
  const tasks = day.tasks.filter(
    (t) => !t.suggested && t.status !== "skipped" && t.status !== "rolled_over",
  );
  if (tasks.length === 0) return null;
  const minutes = tasks.reduce((n, t) => n + t.estimatedMinutes, 0);
  return (
    <section
      aria-label="Tomorrow"
      data-testid="tomorrow-preview"
      className="w-full rounded-xl border border-border-subtle bg-surface-elevated p-3 text-left"
    >
      <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">
        Tomorrow
      </p>
      <p className="text-[15px] font-extrabold text-ink">
        {tasks.length} {tasks.length === 1 ? "task" : "tasks"},{" "}
        {formatDuration(minutes)}
      </p>
      <ul className="mt-1 flex flex-col gap-0.5 text-[13px] text-body-text dark:text-ink/80">
        {tasks.slice(0, 3).map((t) => (
          <li key={t.id} className="truncate">
            {t.startMin !== null ? `${formatClock(t.startMin)} · ` : ""}
            {t.chapterName ?? t.title}
          </li>
        ))}
      </ul>
      <Link
        href={`/planner?day=${shiftDate(dateKey(), 1)}`}
        data-testid="open-tomorrow"
        className="mt-1 inline-flex min-h-9 items-center text-[13px] font-semibold text-ink underline"
      >
        Open tomorrow&apos;s plan
      </Link>
    </section>
  );
}
