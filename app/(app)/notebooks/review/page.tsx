"use client";

import { Timer } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BlockEditor, type AssetMap } from "@/components/notebooks/editor/BlockEditor";
import { StudyShell } from "@/components/study/StudyShell";
import { useSubjects } from "@/components/study/useSubjects";
import { CoralButton } from "@/components/ui/CoralButton";
import { GhostButton } from "@/components/ui/GhostButton";
import { MathText } from "@/components/ui/MathText";
import { PageLoader } from "@/components/ui/PageLoader";
import { ApiError } from "@/lib/api/http";
import { getDue, getEntry, getMistakeTest, REASON_LABEL, reviewEntry, SOURCE_LABEL, type Entry, type EntryWithAssets } from "@/lib/api/notebooks";
import { dueLabel, titleOf } from "@/lib/notebooks/model";
import { refreshXp } from "@/lib/rewards/events";

type Result = { id: string; title: string; correct: boolean; mastered: boolean; next: string };

const reducedMotion = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

async function celebrate() {
  if (reducedMotion()) return;
  try {
    const confetti = (await import("canvas-confetti")).default;
    confetti({ particleCount: 70, spread: 70, origin: { y: 0.7 } });
  } catch {
    /* a celebration that cannot draw is only a missed flourish */
  }
}

function clock(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

function ReviewScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const { lookup } = useSubjects();
  const notebookId = params.get("notebook") ?? undefined;
  const chapterId = params.get("chapter") ?? undefined;
  const testMode = params.get("test") === "1";

  const [queue, setQueue] = useState<Entry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [cards, setCards] = useState<Record<string, EntryWithAssets>>({});
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Result | null>(null);
  const [timerOn, setTimerOn] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef<number>(0);

  useEffect(() => {
    let alive = true;
    const load = testMode ? getMistakeTest(10) : getDue({ ...(notebookId ? { notebookId } : {}), ...(chapterId ? { chapterId } : {}) }).then((r) => r.items);
    Promise.resolve(load)
      .then((items) => alive && setQueue(items))
      .catch((err) => alive && setError(err instanceof ApiError ? err.message : "Could not load your review."));
    return () => {
      alive = false;
    };
  }, [testMode, notebookId, chapterId]);

  // fetch the card on screen and the next one, so "Reveal" and "Next" never wait
  const ensure = useCallback(async (e: Entry | undefined) => {
    if (!e) return;
    setCards((c) => (c[e.id] ? c : { ...c, [e.id]: { ...e, assets: [] } }));
    try {
      const full = await getEntry(e.id);
      setCards((c) => ({ ...c, [e.id]: full }));
    } catch {
      /* the card still works from the list copy, just without its photos */
    }
  }, []);
  useEffect(() => {
    if (!queue) return;
    void ensure(queue[index]);
    void ensure(queue[index + 1]);
  }, [queue, index, ensure]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/purity -- the clock starts when a card appears
    startedAt.current = Date.now();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- each card starts its own stopwatch
    setElapsed(0);
  }, [index]);
  useEffect(() => {
    if (!timerOn || feedback) return;
    const t = setInterval(() => setElapsed(Math.round((Date.now() - startedAt.current) / 1000)), 500);
    return () => clearInterval(t);
  }, [timerOn, feedback, index]);

  const current = queue?.[index] ?? null;
  const card = current ? cards[current.id] : undefined;
  const assets: AssetMap = useMemo(() => Object.fromEntries((card?.assets ?? []).map((a) => [a.id, a])), [card]);
  const questionBlocks = useMemo(() => (card ?? current)?.blocks.filter((b) => b.type !== "solution") ?? [], [card, current]);
  const solutionBlocks = useMemo(() => (card ?? current)?.blocks.filter((b) => b.type === "solution" && (b.text ?? "").trim()) ?? [], [card, current]);

  async function answer(correct: boolean) {
    if (!current || busy) return;
    setBusy(true);
    try {
      const updated = await reviewEntry(current.id, correct ? "correct" : "wrong", timerOn ? Math.min(3600, Math.round((Date.now() - startedAt.current) / 1000)) : undefined);
      const mastered = !current.masteredAt && !!updated.masteredAt;
      const r: Result = { id: current.id, title: titleOf(current), correct, mastered, next: mastered ? "Mastered" : dueLabel(updated) };
      setResults((all) => [...all, r]);
      setFeedback(r);
      void refreshXp();
      if (mastered) void celebrate();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save that. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function next() {
    setFeedback(null);
    setRevealed(false);
    setIndex((i) => i + 1);
  }

  const back = notebookId ? `/notebooks/${notebookId}` : "/notebooks";

  if (error)
    return (
      <StudyShell current="/notebooks">
        <p role="alert" className="rounded-xl bg-danger-bg p-4 text-[14px] font-semibold text-danger">{error}</p>
        <Link href={back} className="text-[14px] font-semibold text-ink underline">Back</Link>
      </StudyShell>
    );
  if (!queue)
    return (
      <StudyShell current="/notebooks">
        <PageLoader label="Getting your review ready…" />
      </StudyShell>
    );

  const done = index >= queue.length;
  if (queue.length === 0 || done) {
    const got = results.filter((r) => r.correct).length;
    const mastered = results.filter((r) => r.mastered);
    return (
      <StudyShell current="/notebooks" testId="review-summary">
        <div className="mx-auto flex w-full max-w-[560px] flex-col items-center gap-4 rounded-2xl border border-brand/10 bg-surface p-8 text-center">
          {queue.length === 0 ? (
            <>
              <h2 className="text-[20px] font-extrabold text-ink" data-testid="review-empty">Nothing is due {testMode ? "yet" : "right now"}</h2>
              <p className="text-[14px] text-muted">{testMode ? "Save a few mistakes first, then come back for a test." : "Mistakes come back 1, 3, 7, 14 and 30 days after you last got them right."}</p>
            </>
          ) : (
            <>
              <h2 className="text-[22px] font-extrabold text-ink">{testMode ? "Mistake Test done" : "Review done"}</h2>
              <p className="text-[15px] text-body-text dark:text-ink" data-testid="review-score">
                {got} of {results.length} solved this time
              </p>
              {mastered.length > 0 && (
                <p className="rounded-xl bg-tint-strong px-4 py-3 text-[14px] font-semibold text-ink" data-testid="review-mastered">
                  {mastered.length === 1 ? "1 mistake mastered" : `${mastered.length} mistakes mastered`}: you have now solved {mastered.length === 1 ? "it" : "them"} on three different days.
                </p>
              )}
              <ul className="flex w-full flex-col gap-1 text-left text-[13px]">
                {results.map((r) => (
                  <li key={r.id} className="flex justify-between gap-3 border-b border-brand/10 py-1.5">
                    <span className="truncate text-ink">{r.title}</span>
                    <span className="shrink-0 text-muted">{r.correct ? r.next : "Back tomorrow"}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <div className="flex flex-wrap justify-center gap-2">
            <GhostButton onClick={() => router.push(back)}>Back to notebooks</GhostButton>
            {!testMode && <CoralButton onClick={() => router.push("/notebooks/review?test=1")} data-testid="start-test">Take a Mistake Test</CoralButton>}
          </div>
        </div>
      </StudyShell>
    );
  }

  const where = [current!.subjectId !== null ? lookup.subjectName(current!.subjectId) : null, lookup.chapterName(current!.chapterId), current!.source ? SOURCE_LABEL[current!.source] : null].filter(Boolean);
  return (
    <StudyShell current="/notebooks" testId="review-mode">
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Link href={back} className="text-[13px] font-semibold text-ink underline">Stop</Link>
          <p className="mr-auto text-[14px] font-bold text-ink" data-testid="review-progress">
            {testMode ? "Mistake Test" : "Review"}: {index + 1} of {queue.length}
          </p>
          <label className="flex min-h-11 items-center gap-2 text-[13px] font-semibold text-ink">
            <input type="checkbox" className="size-5" checked={timerOn} onChange={(e) => setTimerOn(e.target.checked)} data-testid="timer-toggle" />
            <Timer className="size-4" aria-hidden /> Timer
          </label>
          {timerOn && <span className="w-12 text-right font-mono text-[14px] text-ink" data-testid="timer">{clock(elapsed)}</span>}
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-tint-strong" aria-hidden>
          <div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${(index / queue.length) * 100}%` }} />
        </div>

        <article className="flex flex-col gap-4 rounded-2xl border border-brand/10 bg-[#FFFEFA] p-4 shadow-sm sm:p-6 dark:bg-[#1B2030]" data-testid="review-card">
          <header className="flex flex-col gap-1">
            <p className="text-[12px] font-semibold text-muted">{where.join(" · ")}</p>
            {current!.reason && <p className="text-[12px] font-semibold text-muted">You missed this because of: {REASON_LABEL[current!.reason].toLowerCase()}</p>}
          </header>
          <BlockEditor entryId={current!.id} blocks={questionBlocks} onChange={() => undefined} assets={assets} readOnly onAssetsChanged={() => undefined} notify={() => undefined} />

          {revealed && (
            <section className="flex flex-col gap-3 rounded-xl border border-dashed border-[var(--success)]/50 bg-[var(--success-bg)]/40 p-3" aria-label="Solution" data-testid="review-solution">
              <p className="text-[13px] font-bold uppercase tracking-wide text-[var(--success)]">Solution</p>
              {solutionBlocks.length > 0 ? solutionBlocks.map((b) => <MathText key={b.id} source={b.text ?? ""} className="whitespace-pre-wrap text-[15px] text-ink" />) : <p className="text-[14px] text-muted">No solution is saved on this page. Check against your own working.</p>}
              {current!.fix && <p className="text-[14px] text-ink"><span className="font-bold">Fix: </span>{current!.fix}</p>}
              <Link href={`/notebooks/${current!.notebookId}?page=${current!.id}`} className="w-fit text-[13px] font-semibold text-ink underline">Open this page</Link>
            </section>
          )}
        </article>

        {feedback ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-tint-strong/60 p-4 text-center" role="status" data-testid="review-feedback">
            <p className="text-[15px] font-bold text-ink">
              {feedback.mastered ? "Mastered. This one is done." : feedback.correct ? `Got it. Back ${feedback.next.toLowerCase()}.` : "Not yet. It comes back tomorrow."}
            </p>
            <CoralButton onClick={next} data-testid="review-next">{index + 1 >= queue.length ? "Finish" : "Next"}</CoralButton>
          </div>
        ) : !revealed ? (
          <CoralButton className="w-full" onClick={() => setRevealed(true)} data-testid="review-reveal">Reveal solution</CoralButton>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <GhostButton disabled={busy} onClick={() => void answer(false)} data-testid="review-notyet">Not yet</GhostButton>
            <CoralButton disabled={busy} onClick={() => void answer(true)} data-testid="review-gotit">Got it</CoralButton>
          </div>
        )}
      </div>
    </StudyShell>
  );
}

export default function NotebookReviewPage() {
  return (
    <Suspense fallback={<PageLoader label="Opening…" />}>
      <ReviewScreen />
    </Suspense>
  );
}
