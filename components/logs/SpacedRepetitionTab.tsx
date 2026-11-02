"use client";

import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { RevisionHub } from "@/components/logs/RevisionHub";
import { CoralButton } from "@/components/ui/CoralButton";
import { GhostButton } from "@/components/ui/GhostButton";
import { WhiteModal } from "@/components/ui/WhiteModal";
import { demoteRevisionChapter, getRevisionOverview, openRevisionTasks, skipRevisionTask, type RevisionChapterProgress, type RevisionOverview, type RevisionTask } from "@/lib/api/revision";
import { startFocusSession } from "@/lib/focus/startFocusSession";
import { formatMinutes } from "@/lib/study/format";

/** "Mon 27 Oct" for a due date, "Today" or "Tomorrow" when it is. */
export function dueLabel(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(d) - start(now)) / 86_400_000);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

/** The upcoming chapters grouped by the day they come due, soonest first. */
export function groupByDueDay(chapters: RevisionChapterProgress[], now: Date = new Date()): { label: string; chapters: RevisionChapterProgress[] }[] {
  const groups = new Map<string, RevisionChapterProgress[]>();
  for (const c of [...chapters].sort((a, b) => (a.nextRevisionAt ?? "").localeCompare(b.nextRevisionAt ?? ""))) {
    if (!c.nextRevisionAt) continue;
    const label = dueLabel(c.nextRevisionAt, now);
    groups.set(label, [...(groups.get(label) ?? []), c]);
  }
  return [...groups.entries()].map(([label, list]) => ({ label, chapters: list }));
}

const ago = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "never");

function ChapterRow({ c, onRequeue }: { c: RevisionChapterProgress; onRequeue?: (c: RevisionChapterProgress) => void }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-surface-elevated px-4 py-3" data-testid="sr-chapter">
      <div className="min-w-0">
        <p className="truncate text-[15px] font-semibold text-ink">{c.chapter.name}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted">
          <span className="rounded-full border border-border-strong px-2 py-0.5 text-ink">{c.chapter.subject.name}</span>
          <span>Last revised {ago(c.lastRevisionAt)}</span>
          {c.currentIntervalDays !== null && <span>Interval {c.currentIntervalDays}d</span>}
          <span>
            {c.revisionCount} {c.revisionCount === 1 ? "revision" : "revisions"}
          </span>
        </p>
      </div>
      {onRequeue && (
        <GhostButton data-testid="sr-requeue" onClick={() => onRequeue(c)}>
          Re-queue
        </GhostButton>
      )}
    </li>
  );
}

function Collapsible({ title, count, testId, children }: { title: string; count: number; testId: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="flex flex-col gap-3" data-testid={testId}>
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex min-h-11 items-center justify-between rounded-2xl border border-border-subtle bg-surface-elevated px-4 text-left">
        <span className="text-[15px] font-semibold text-ink">
          {title} <span className="font-normal text-muted">({count})</span>
        </span>
        <ChevronDown className={`size-4 text-muted transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open && children}
    </section>
  );
}

/**
 * Spaced Repetition: the chapters the scheduler has queued for revision. What is due today, what comes up in the next
 * week, and what has settled into long intervals. The one coral button is Start Revision on the first due card.
 */
export function SpacedRepetitionTab() {
  const [overview, setOverview] = useState<RevisionOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requeue, setRequeue] = useState<RevisionChapterProgress | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setOverview((await getRevisionOverview()).data);
      setError(null);
    } catch {
      setError("We couldn't load your revision queue. Please try again.");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load
    void load();
  }, [load]);

  if (error) {
    return (
      <p role="alert" className="rounded-xl bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
        {error}
      </p>
    );
  }
  if (!overview) return <div className="h-40 animate-pulse rounded-2xl bg-surface-elevated" aria-hidden />;

  const due = openRevisionTasks(overview);
  const upcoming = overview.upcomingRevisions.chapters;
  const mastered = overview.masteredChapters.chapters;
  const queued = overview.todaysRevisionTasks.count + overview.upcomingRevisions.count + overview.masteredChapters.count;
  const byChapter = new Map([...upcoming, ...mastered].map((c) => [c.chapterId, c]));
  const days = groupByDueDay(upcoming);

  function start(task: RevisionTask) {
    startFocusSession({
      originSource: "revision_tab",
      originId: task.id,
      subject: String(task.subjectId),
      ...(task.chapter ? { chapter: task.chapter.id } : {}),
      taskType: "revision",
      targetMinutes: task.estimatedMinutes,
    });
  }

  async function skip(task: RevisionTask) {
    setBusy(true);
    try {
      await skipRevisionTask(task.id);
      await load();
    } catch {
      setError("Couldn't skip that. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmRequeue() {
    if (!requeue) return;
    setBusy(true);
    try {
      await demoteRevisionChapter(requeue.id);
      setNotice(`${requeue.chapter.name} is back in your revision queue.`);
      setRequeue(null);
      await load();
    } catch {
      setError("Couldn't re-queue that chapter. Please try again.");
      setRequeue(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5" data-testid="sr-tab">
      <RevisionHub />

      <section className="rounded-2xl border border-border-subtle bg-surface-elevated p-5" data-testid="sr-summary">
        <p className="text-[18px] font-bold text-ink">
          {queued} {queued === 1 ? "chapter" : "chapters"} in your queue · {due.length} planned today
        </p>
        <p className="mt-1 text-[13px] text-muted">
          {upcoming.length} coming up · {mastered.length} on long intervals. Chapters you rate Hard come back sooner; Easy ones wait longer.
        </p>
      </section>

      {notice && (
        <p role="status" className="rounded-[10px] bg-[var(--success-bg)] px-3 py-2 text-[13px] font-semibold text-[var(--success)]">
          {notice}
        </p>
      )}

      <section className="flex flex-col gap-3" data-testid="sr-due">
        <h2 className="text-[18px] font-bold text-ink">Due today</h2>
        {due.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border-strong p-5 text-center text-[14px] text-muted" data-testid="sr-due-empty">
            Nothing due today.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {due.map((t, i) => {
              const progress = t.chapter ? byChapter.get(t.chapter.id) : undefined;
              return (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-surface-elevated px-4 py-3" data-testid="sr-due-card">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-ink">{t.chapter?.name ?? t.title}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted">
                      {t.chapter && <span className="rounded-full border border-border-strong px-2 py-0.5 text-ink">{t.chapter.subject.name}</span>}
                      <span>{formatMinutes(t.estimatedMinutes)}</span>
                      {progress && <span>Last revised {ago(progress.lastRevisionAt)}</span>}
                      {progress?.currentIntervalDays != null && <span>Interval {progress.currentIntervalDays}d</span>}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <GhostButton data-testid="sr-skip" disabled={busy} onClick={() => void skip(t)}>
                      Skip
                    </GhostButton>
                    {i === 0 ? (
                      <CoralButton data-testid="sr-start" onClick={() => start(t)}>
                        Start Revision
                      </CoralButton>
                    ) : (
                      <GhostButton data-testid="sr-start" onClick={() => start(t)}>
                        Start Revision
                      </GhostButton>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Collapsible title="Upcoming (next 7 days)" count={upcoming.length} testId="sr-upcoming">
        {days.length === 0 ? (
          <p className="text-[13px] text-muted">Nothing scheduled this week.</p>
        ) : (
          days.map((g) => (
            <div key={g.label} className="flex flex-col gap-2">
              <h3 className="text-[13px] font-semibold uppercase tracking-wide text-muted">{g.label}</h3>
              <ul className="flex flex-col gap-2">
                {g.chapters.map((c) => (
                  <ChapterRow key={c.id} c={c} />
                ))}
              </ul>
            </div>
          ))
        )}
      </Collapsible>

      <Collapsible title="Mastered (long intervals)" count={mastered.length} testId="sr-mastered">
        {mastered.length === 0 ? (
          <p className="text-[13px] text-muted">No chapters have reached long intervals yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {mastered.map((c) => (
              <ChapterRow key={c.id} c={c} onRequeue={setRequeue} />
            ))}
          </ul>
        )}
      </Collapsible>

      <WhiteModal open={requeue !== null} onClose={() => (busy ? undefined : setRequeue(null))} ariaLabel="Re-queue this chapter?">
        <div className="mx-auto flex w-full max-w-[340px] flex-col gap-3 text-center">
          <h2 className="text-[20px] font-extrabold text-ink">Re-queue this chapter?</h2>
          <p className="text-[14px] text-muted">{requeue?.chapter.name} goes back to the learning stage and its revision intervals start again.</p>
          <div className="flex gap-3 pt-2">
            <GhostButton className="flex-1" disabled={busy} onClick={() => setRequeue(null)}>
              Keep it
            </GhostButton>
            <GhostButton className="flex-1" data-testid="sr-requeue-confirm" disabled={busy} onClick={() => void confirmRequeue()}>
              Re-queue
            </GhostButton>
          </div>
        </div>
      </WhiteModal>
    </div>
  );
}
