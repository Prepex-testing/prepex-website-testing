"use client";

import type { ReactNode } from "react";
import type { AddTaskInput, PlanDay, PlanTask } from "@/lib/api/plannerV2";
import { STATUS_LABEL, formatDuration, subjectStyle } from "@/lib/planner/format";

const ADD = "min-h-9 shrink-0 rounded-[10px] border border-secondary-button-border bg-transparent px-3 text-[13px] font-medium text-ink hover:bg-tint-strong";

function Row({ dot, label, trailing, action }: { dot: string; label: string; trailing: string; action: ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: dot }} />
      <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-ink">{label}</span>
      <span className="text-[12px] text-muted">{trailing}</span>
      {action}
    </li>
  );
}

const fromSource = (tasks: PlanTask[], source: "sr" | "backlog") => tasks.filter((t) => t.status !== "rolled_over" && (source === "backlog" ? t.origin === "backlog" || t.kind === "backlog" : t.origin === "sr"));

export type Section = { id: "revisions" | "backlog"; title: string; body: ReactNode };

/**
 * The two lists beside the plan: spaced revisions due today and backlog items. In manual mode they are suggestions with
 * a one-tap Add. In auto mode the plan already holds them, so the lists show where they stand.
 * TODO(planner): the backend only sends suggestions in manual mode; sending them in auto mode too would let this offer
 * extras on top of the plan.
 */
export function suggestionSections(day: PlanDay, onAdd: (input: AddTaskInput) => void): Section[] {
  const empty = (text: string) => <p className="text-[13px] text-muted">{text}</p>;

  const sr = fromSource(day.tasks, "sr");
  const bl = fromSource(day.tasks, "backlog");
  const manual = day.mode === "manual" && day.suggestions;

  const revisions: ReactNode = manual
    ? day.suggestions!.revisions.length === 0
      ? empty("No revisions are due today.")
      : (
          <ul className="flex flex-col gap-2.5">
            {day.suggestions!.revisions.map((r) => (
              <Row
                key={r.queueId}
                dot={subjectStyle(r.subject).color}
                label={`Revise ${r.chapterName}`}
                trailing={formatDuration(r.minutes)}
                action={
                  <button type="button" data-testid="add-suggested-revision" disabled={r.subjectId === null} onClick={() => r.subjectId !== null && onAdd({ kind: "revision", subjectId: r.subjectId, chapterId: r.chapterId, minutes: r.minutes, origin: "sr", slot: "next_free" })} className={ADD}>
                    Add
                  </button>
                }
              />
            ))}
          </ul>
        )
    : sr.length === 0
      ? empty("No revisions are due today.")
      : (
          <ul className="flex flex-col gap-2.5">
            {sr.map((t) => (
              <Row key={t.id} dot={subjectStyle(t.subject).color} label={`Revise ${t.chapterName ?? t.title}`} trailing={STATUS_LABEL[t.status]} action={null} />
            ))}
          </ul>
        );

  const backlog: ReactNode = manual
    ? day.suggestions!.backlog.length === 0
      ? empty("No backlog items to clear.")
      : (
          <ul className="flex flex-col gap-2.5">
            {day.suggestions!.backlog.map((b) => (
              <Row
                key={b.id}
                dot={subjectStyle(b.subject).color}
                label={`Clear ${b.chapterName ?? b.topic ?? "item"}`}
                trailing={formatDuration(b.minutes)}
                action={
                  <button type="button" data-testid="add-suggested-backlog" disabled={b.subjectId === null} onClick={() => b.subjectId !== null && onAdd({ kind: "backlog", subjectId: b.subjectId, ...(b.chapterId ? { chapterId: b.chapterId } : {}), minutes: b.minutes, origin: "backlog", backlogItemId: b.id, slot: "next_free" })} className={ADD}>
                    Add
                  </button>
                }
              />
            ))}
          </ul>
        )
    : bl.length === 0
      ? empty("No backlog items to clear.")
      : (
          <ul className="flex flex-col gap-2.5">
            {bl.map((t) => (
              <Row key={t.id} dot={subjectStyle(t.subject).color} label={`Clear ${t.chapterName ?? t.topic ?? t.title}`} trailing={STATUS_LABEL[t.status]} action={null} />
            ))}
          </ul>
        );

  return [
    { id: "revisions", title: manual ? "Suggested revisions due today" : "Revisions due today", body: revisions },
    { id: "backlog", title: manual ? "Backlog items" : "Backlog in today's plan", body: backlog },
  ];
}
