"use client";

import Link from "next/link";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Pexo } from "@/components/pexo/Pexo";
import { PexoBubble, usePexoLine } from "@/components/pexo/PexoBubble";
import { getPexoFind, savePexoFind, type PexoFind } from "@/lib/api/pexo";
import type { PexoPick } from "@/lib/pexo/engine";
import { pexoFirstVisit, pexoSay, usePexo } from "@/lib/pexo/store";

/** Session lengths that pick the closing line (minutes): under 25 short, up to 90 long, over that great. */
export const END_SHORT = 25;
export const END_GREAT = 90;
export const FIND_MIN_MINUTES = 15;

export function endTrigger(minutes: number): string {
  if (minutes > END_GREAT) return "focus.end.great";
  if (minutes >= END_SHORT) return "focus.end.long";
  return "focus.end.short";
}

/** First time on the timer's set-up screen: Pexo's one hint (the shell's layer is quiet here, so the timer shows it). */
export function FocusFirstVisit() {
  const { enabled } = usePexo();
  const [pick, setPick] = useState<PexoPick | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- shown once per student, the first time Pexo is known
    if (enabled && pexoFirstVisit("focus")) setPick(pexoSay("first_visit.focus"));
  }, [enabled]);
  if (!pick) return null;
  return <PexoBubble pick={pick} size={48} onDismiss={() => setPick(null)} testId="focus-first-visit" />;
}

/**
 * Pexo at the desk for the whole session (C1): focused, with a book and lamp, breathing very slowly (still in lite or
 * reduced motion). It says one line when the session starts and one on a break, and nothing else: the session is the
 * student's. Renders nothing when Pexo is off.
 */
export function FocusDesk({ sessionId, onBreak, subject }: { sessionId: string; onBreak: boolean; subject: string | null }) {
  const { enabled, state } = usePexo();
  const start = usePexoLine(enabled ? "focus.start" : null, subject ? { subject } : {}, `start:${sessionId}`);
  const pause = usePexoLine(enabled && onBreak ? "focus.break" : null, {}, `break:${sessionId}:${onBreak}`);
  if (!enabled) return null;
  const line = onBreak ? pause : start;
  const accessory = state?.accessories[state.accessories.length - 1] ?? null;
  return (
    <div className="flex w-full max-w-md items-center gap-3" data-testid="focus-desk">
      <Pexo mood={onBreak ? "calm" : "focused"} size={96} prop={onBreak ? false : ["book", "lamp"]} subtle accessory={accessory} />
      {line && (
        <p className="min-w-0 flex-1 text-left text-[14px] leading-snug text-body-text dark:text-ink" data-testid="focus-desk-line" data-line={line.id}>
          {line.text}
        </p>
      )}
    </div>
  );
}

function FindCard({ find, intro }: { find: PexoFind; intro: PexoPick | null }) {
  const [saved, setSaved] = useState(find.saved);
  const [busy, setBusy] = useState(false);
  const label = find.type === "trick" ? "JEE trick" : find.type === "common_mistake" ? "Common mistake" : "One-liner";
  const library = `/home/resource-library/chapter?${new URLSearchParams({ subject: find.subject, chapter: find.chapter }).toString()}`;
  async function toggle() {
    setBusy(true);
    try {
      setSaved((await savePexoFind(find.id, !saved)).saved);
    } catch {
      /* the card stays as it was */
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-col gap-2 text-left" data-testid="pexo-find" data-find={find.id}>
      {intro && <p className="text-[13px] font-semibold text-muted" data-testid="pexo-find-intro">{intro.text}</p>}
      <div className="rounded-2xl border border-border-subtle bg-surface-elevated p-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
          {label} · {find.chapter}
        </p>
        <p className="mt-1.5 text-[15px] leading-relaxed text-ink" data-testid="pexo-find-text">{find.text}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => void toggle()} disabled={busy} aria-pressed={saved} data-testid="pexo-find-save" className="inline-flex min-h-11 items-center gap-1.5 rounded-[10px] border border-border-strong px-3.5 text-[13px] font-medium text-ink hover:bg-surface-elevated-2 disabled:opacity-60">
            {saved ? <BookmarkCheck className="size-4" aria-hidden /> : <Bookmark className="size-4" aria-hidden />}
            {saved ? "Saved to My finds" : "Save to My finds"}
          </button>
          <Link href={library} data-testid="pexo-find-open" className="inline-flex min-h-11 items-center rounded-[10px] border border-border-strong px-3.5 text-[13px] font-medium text-ink hover:bg-surface-elevated-2">
            Open {find.chapter}
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * The end of a session with Pexo (C1, C2): a closing line that fits how long it was, then, after 15 minutes or more,
 * a find Pexo "brought back" (one request, once). Nothing when Pexo is off.
 */
export function FocusEndPexo({ sessionId, minutes, chapterId, subjectId }: { sessionId: string; minutes: number; chapterId: string | null; subjectId: number }) {
  const { enabled } = usePexo();
  // "I found something for you" is said only when a find really follows: the find arrives later, so that line is left out
  const end = usePexoLine(enabled ? endTrigger(minutes) : null, { mins: minutes }, `end:${sessionId}`, ["focus.end.long#2"]);
  const [find, setFind] = useState<{ find: PexoFind; intro: PexoPick | null } | null>(null);

  useEffect(() => {
    if (!enabled || minutes < FIND_MIN_MINUTES) return;
    let live = true;
    getPexoFind({ minutes, chapterId, subjectId }).then(
      (f) => {
        if (live && f) setFind({ find: f, intro: pexoSay("find.intro", { chapter: f.chapter }) });
      },
      () => undefined,
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per session
  }, [enabled, sessionId]);

  if (!enabled || (!end && !find)) return null;
  return (
    <div className="flex flex-col gap-3" data-testid="focus-end-pexo">
      {end && <PexoBubble pick={end} size={48} testId="focus-end-line" />}
      {find && <FindCard find={find.find} intro={find.intro} />}
    </div>
  );
}
