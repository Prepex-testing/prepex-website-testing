"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { markChapter } from "@/lib/api/syllabus";
import { getBacklogAnalytics } from "@/lib/api/backlogItems";

/** How long a finished task can be taken back from the planner. */
export const UNDO_SECONDS = 5;

/**
 * The bar that appears for 5 seconds after a tick: "Marked done. Undo". No confirmation dialog; a tap undoes it and the
 * server reverses the XP and the logs the tick wrote. It never blocks anything underneath.
 */
export function UndoBar({ title, onUndo, onExpire }: { title: string; onUndo: () => void; onExpire: () => void }) {
  const [left, setLeft] = useState(UNDO_SECONDS);
  useEffect(() => {
    const t = setInterval(() => setLeft((n) => n - 1), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (left <= 0) onExpire();
  }, [left, onExpire]);
  return (
    <div role="status" data-testid="undo-bar" className="fixed inset-x-4 bottom-[calc(72px+env(safe-area-inset-bottom))] z-[65] mx-auto flex max-w-[420px] items-center justify-between gap-3 rounded-xl border border-border-subtle bg-surface-elevated-2 px-4 py-3 shadow-lg lg:bottom-8">
      <span className="min-w-0 truncate text-[14px] font-semibold text-ink">{`Done: ${title}`}</span>
      <button type="button" data-testid="undo-button" onClick={onUndo} className="shrink-0 rounded-lg px-3 py-1.5 text-[14px] font-bold text-ink underline underline-offset-2">
        {`Undo (${Math.max(0, left)})`}
      </button>
    </div>
  );
}

/** A check that draws itself and a counter that drops: the backlog item is cleared. Under a second and a half. */
export function BacklogCleared({ onDone }: { onDone: () => void }) {
  const reduce = useReducedMotion();
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    void getBacklogAnalytics()
      .then((r) => {
        if (alive) setLeft(r.data.totals.open + r.data.totals.scheduled);
      })
      .catch(() => undefined);
    const t = setTimeout(onDone, 1400);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [onDone]);
  return (
    <AnimatePresence>
      <motion.div
        data-testid="backlog-cleared"
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="pointer-events-none fixed inset-0 z-[66] flex items-center justify-center"
      >
        <div className="flex flex-col items-center gap-2 rounded-3xl border border-border-subtle bg-surface-elevated-2 px-8 py-6 shadow-xl">
          <svg viewBox="0 0 52 52" className="size-14 text-ink" aria-hidden>
            <motion.path d="M14 27 l9 9 l16 -19" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: reduce ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.45 }} />
          </svg>
          <p className="text-[18px] font-extrabold text-ink">Backlog cleared</p>
          {left !== null && (
            <p className="text-[14px] text-muted" data-testid="backlog-left">
              {left === 0 ? "Nothing left in your backlog" : `${left} left in your backlog`}
            </p>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/** After a lecture or a new topic is ticked: where is the chapter now? One tap updates the syllabus. */
export function ChapterStatusBar({ chapterId, chapterName, onDone }: { chapterId: string; chapterName: string | null; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  async function set(value: "learning" | "studied") {
    setBusy(true);
    try {
      await markChapter(chapterId, { aspect: "theory", value });
    } catch {
      /* the tick already worked; the syllabus can be set there */
    } finally {
      setBusy(false);
      onDone();
    }
  }
  useEffect(() => {
    const t = setTimeout(onDone, 9000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div role="group" aria-label="Chapter status" data-testid="chapter-status-bar" className="fixed inset-x-4 bottom-[calc(132px+env(safe-area-inset-bottom))] z-[65] mx-auto flex max-w-[420px] flex-col gap-2 rounded-xl border border-border-subtle bg-surface-elevated-2 px-4 py-3 shadow-lg lg:bottom-24">
      <span className="text-[14px] font-semibold text-ink">{chapterName ? `Where is ${chapterName} now?` : "Where is this chapter now?"}</span>
      <div className="flex gap-2">
        <button type="button" disabled={busy} data-testid="chapter-learning" onClick={() => void set("learning")} className="min-h-11 flex-1 rounded-lg border border-border-subtle text-[14px] font-semibold text-ink">
          In progress
        </button>
        <button type="button" disabled={busy} data-testid="chapter-studied" onClick={() => void set("studied")} className="min-h-11 flex-1 rounded-lg border border-border-subtle text-[14px] font-semibold text-ink">
          Completed
        </button>
      </div>
    </div>
  );
}
