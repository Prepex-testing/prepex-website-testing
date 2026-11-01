"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GoalAssistantBody } from "@/components/goals/GoalAssistant";
import { ReviewShareCard } from "@/components/rituals/ReviewShareCard";
import { ProfileSubpageHeader } from "@/components/profile/ProfileSubpageHeader";
import { PageLoader } from "@/components/ui/PageLoader";
import { CoralButton } from "@/components/ui/CoralButton";
import { GhostButton } from "@/components/ui/GhostButton";
import { ApiError } from "@/lib/api/http";
import type { NewGoal } from "@/lib/api/goals";
import { createMock } from "@/lib/api/mocks";
import { completeSundayReview, getSundayHistory, getSundayReview, toGoalInput, type ProposedGoal, type ReviewHistoryRow, type SundayReviewState } from "@/lib/api/rituals";
import { getXpSummary, type XpSummary } from "@/lib/api/xp";
import { goalLabel, historyLine, ORIGIN_LABELS } from "@/lib/rituals/review";
import { refreshXp } from "@/lib/rewards/events";
import { downloadPng, renderReviewPng, sharePng } from "@/lib/share/reviewShare";

type Step = "recap" | "test" | "goals" | "share";
const STEPS: { id: Step; label: string }[] = [
  { id: "recap", label: "Recap" },
  { id: "test", label: "Coaching test" },
  { id: "goals", label: "Next week" },
  { id: "share", label: "Share" },
];

const PATTERNS = [
  { value: "jee_main", label: "JEE Main", max: 300 },
  { value: "jee_advanced", label: "JEE Advanced", max: 360 },
  { value: "neet", label: "NEET", max: 720 },
] as const;

const FIELD = "h-12 w-full rounded-xl border border-input-border bg-surface px-3 text-[16px] text-ink outline-none focus:border-brand";

export default function SundayReviewPage() {
  const [state, setState] = useState<SundayReviewState | null>(null);
  const [history, setHistory] = useState<ReviewHistoryRow[]>([]);
  const [xp, setXp] = useState<XpSummary | null>(null);
  const [step, setStep] = useState<Step>("recap");
  const [mockId, setMockId] = useState<string | undefined>();
  const [chosen, setChosen] = useState<Record<number, boolean>>({});
  const [targets, setTargets] = useState<Record<number, number>>({});
  // the Goal Assistant's choices for next week; they replace the old proposed list
  const [picked, setPicked] = useState<NewGoal[]>([]);
  const onPicked = useCallback((g: NewGoal[]) => setPicked(g), []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [png, setPng] = useState<string | null>(null);
  const card = useRef<HTMLDivElement>(null);

  // test fields
  const [pattern, setPattern] = useState<(typeof PATTERNS)[number]["value"]>("jee_main");
  const [total, setTotal] = useState("");
  const [phy, setPhy] = useState("");
  const [chem, setChem] = useState("");
  const [maths, setMaths] = useState("");

  const load = useCallback(() => {
    void getSundayReview()
      .then((s) => {
        setState(s);
        setChosen(Object.fromEntries(s.proposedGoals.map((_, i) => [i, true])));
        setTargets(Object.fromEntries(s.proposedGoals.map((g, i) => [i, g.target])));
      })
      .catch(() => setState({ status: "none", weekStart: null, nextWeekStart: null, cards: [], stats: null, proposedGoals: [] }));
    void getSundayHistory().then(setHistory).catch(() => undefined);
    void getXpSummary().then(setXp).catch(() => undefined);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function saveTest() {
    setError(null);
    const max = PATTERNS.find((p) => p.value === pattern)!.max;
    const t = Math.round(Number(total));
    if (total.trim() === "" || !Number.isFinite(t)) return setError("Enter the total marks.");
    if (t > max) return setError(`Total marks cannot be more than ${max} for this exam.`);
    setBusy(true);
    try {
      const num = (v: string) => (v.trim() === "" ? undefined : Math.round(Number(v)));
      const res = await createMock({
        testType: "chapter_test",
        examPattern: pattern,
        testName: "Coaching test",
        dateTaken: state?.weekStart ? new Date(new Date(`${state.weekStart}T00:00:00Z`).getTime() + 6 * 86_400_000).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        totalMarks: t,
        maxMarks: max,
        ...(num(phy) !== undefined ? { physicsMarks: num(phy) } : {}),
        ...(num(chem) !== undefined ? { chemistryMarks: num(chem) } : {}),
        ...(num(maths) !== undefined ? { mathsMarks: num(maths) } : {}),
      });
      setMockId(res.data.id);
      setStep("goals");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save the test. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    if (!state?.weekStart) return;
    setBusy(true);
    setError(null);
    try {
      const goals = picked as unknown as ReturnType<typeof toGoalInput>[];
      await completeSundayReview({ weekStart: state.weekStart, ...(goals.length > 0 ? { goals } : {}), ...(mockId ? { mockId } : {}) });
      setDone(true);
      void refreshXp();
      setStep("share");
      // build the story card now so Save is instant
      if (card.current) setPng(await renderReviewPng(card.current).catch(() => null));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't finish the review. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!state) return <PageLoader label="Loading your week…" />;

  const stats = state.stats;
  const figures = { hours: stats?.hours ?? 0, questions: stats?.questions ?? 0, streak: stats?.streak ?? 0, level: xp?.level ?? stats?.level ?? 1, title: xp?.title ?? "Aspirant", week: state.weekStart ?? "" };

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-5 p-4 sm:p-6" data-testid="sunday-review">
      <ProfileSubpageHeader title="Weekly review" backHref="/home" />

      {state.status === "none" && (
        <p className="rounded-2xl border border-border-subtle bg-surface-elevated p-4 text-[14px] text-muted" data-testid="review-closed">
          Your review opens on Sunday at 6 pm. If you miss it, you can still do it on Monday.
        </p>
      )}

      {state.status === "completed" && !done && (
        <p className="rounded-2xl border border-border-subtle bg-surface-elevated p-4 text-[14px] text-ink" data-testid="review-already">
          You finished this week&apos;s review. See you next Sunday.
        </p>
      )}

      {(state.status === "ready" || done) && (
        <>
          <ol className="flex gap-2" aria-label="Steps">
            {STEPS.map((s) => (
              <li key={s.id} aria-current={step === s.id ? "step" : undefined} className={`flex-1 rounded-full border px-2 py-1.5 text-center text-[12px] font-semibold ${step === s.id ? "border-brand bg-tint-strong text-ink" : "border-border-subtle text-muted"}`}>
                {s.label}
              </li>
            ))}
          </ol>

          {step === "recap" && (
            <section className="flex flex-col gap-4" data-testid="step-recap">
              <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2" data-testid="recap-cards" tabIndex={0} aria-label="Your week, swipe through the cards">
                {state.cards.map((c) => (
                  <article key={c.key} data-testid={`recap-${c.key}`} className="min-h-[200px] min-w-[85%] snap-center rounded-3xl border border-border-subtle bg-surface-elevated-2 p-6 sm:min-w-[60%]">
                    <p className="text-[13px] font-semibold uppercase tracking-wide text-muted">{c.title}</p>
                    <p className="mt-3 text-[56px] font-extrabold leading-none text-ink">{c.value}</p>
                    {c.detail && <p className="mt-3 text-[14px] text-body-text dark:text-ink">{c.detail}</p>}
                  </article>
                ))}
              </div>
              <CoralButton data-testid="to-test" onClick={() => setStep("test")}>
                Continue
              </CoralButton>
            </section>
          )}

          {step === "test" && (
            <section className="flex flex-col gap-4" data-testid="step-test">
              <div>
                <h2 className="text-[18px] font-extrabold text-ink">Log this week&apos;s coaching test</h2>
                <p className="text-[13px] text-muted">A quick mock entry: total and the subject scores. Skip it if there was no test.</p>
              </div>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Exam pattern">
                {PATTERNS.map((p) => (
                  <button key={p.value} type="button" role="radio" aria-checked={pattern === p.value} onClick={() => setPattern(p.value)} className={`min-h-11 rounded-xl border px-2 text-[13px] font-semibold ${pattern === p.value ? "border-[1.5px] border-brand bg-tint-strong text-ink" : "border-border-subtle bg-surface text-body-text dark:text-ink"}`}>
                    {p.label}
                  </button>
                ))}
              </div>
              <label className="flex flex-col gap-1.5 text-[14px] font-semibold text-body-text dark:text-ink">
                Total marks
                <input inputMode="numeric" data-testid="test-total" className={FIELD} value={total} onChange={(e) => setTotal(e.target.value.replace(/[^\d-]/g, ""))} />
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  ["Physics", phy, setPhy],
                  ["Chemistry", chem, setChem],
                  ["Maths", maths, setMaths],
                ].map(([label, value, set]) => (
                  <label key={label as string} className="flex flex-col gap-1.5 text-[13px] font-semibold text-body-text dark:text-ink">
                    {label as string}
                    <input inputMode="numeric" aria-label={`${label as string} marks`} className={FIELD} value={value as string} onChange={(e) => (set as (v: string) => void)(e.target.value.replace(/[^\d-]/g, ""))} />
                  </label>
                ))}
              </div>
              {error && <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-[13px] font-medium text-danger">{error}</p>}
              <CoralButton data-testid="test-save" disabled={busy} onClick={() => void saveTest()}>
                {busy ? "Saving…" : "Save and continue"}
              </CoralButton>
              <GhostButton data-testid="test-skip" disabled={busy} onClick={() => { setError(null); setStep("goals"); }}>
                No test this week
              </GhostButton>
            </section>
          )}

          {step === "goals" && (
            <section className="flex flex-col gap-4" data-testid="step-goals">
              <div>
                <h2 className="text-[18px] font-extrabold text-ink">Next week&apos;s goals</h2>
                <p className="text-[13px] text-muted">Suggested from your timetable, how much you really complete, the classes you have and your backlog. Change a number, untick what you don&apos;t want, or accept as is.</p>
              </div>
              {state.nextWeekStart && <GoalAssistantBody weekStart={state.nextWeekStart} onChange={onPicked} />}
              {error && <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-[13px] font-medium text-danger">{error}</p>}
              <CoralButton data-testid="review-finish" disabled={busy} onClick={() => void finish()}>
                {busy ? "Finishing…" : picked.length > 0 ? "Accept and finish" : "Finish the review"}
              </CoralButton>
            </section>
          )}

          {step === "share" && (
            <section className="flex flex-col items-center gap-4" data-testid="step-share">
              <p className="text-[18px] font-extrabold text-ink">Review done. +50 XP</p>
              {png ? (
                // eslint-disable-next-line @next/next/no-img-element -- a generated data URL
                <img src={png} alt="Your week as a story card" data-testid="share-preview" className="max-h-[480px] rounded-2xl border border-border-subtle" />
              ) : (
                <p className="text-[13px] text-muted">Making your card…</p>
              )}
              <div className="flex w-full flex-col gap-2 sm:flex-row">
                <GhostButton className="flex-1" data-testid="share-save" disabled={!png} onClick={() => png && void downloadPng(png, `prepex-week-${state.weekStart}.png`)}>
                  Save the image
                </GhostButton>
                <GhostButton className="flex-1" data-testid="share-send" disabled={!png} onClick={() => png && void sharePng(png, `prepex-week-${state.weekStart}.png`, "My week on Prepex").then((ok) => { if (!ok) void downloadPng(png, `prepex-week-${state.weekStart}.png`); })}>
                  Share
                </GhostButton>
              </div>
            </section>
          )}
        </>
      )}

      {/* the card is built off screen at 1080x1920 and exported from here */}
      <div aria-hidden style={{ position: "fixed", left: -99999, top: 0, pointerEvents: "none" }}>
        <ReviewShareCard ref={card} figures={figures} />
      </div>

      {history.length > 0 && (
        <section className="flex flex-col gap-2" data-testid="review-history">
          <h2 className="text-[13px] font-bold uppercase tracking-wide text-muted">Past reviews</h2>
          <ul className="flex flex-col gap-2">
            {history.map((h) => (
              <li key={h.id} className="rounded-xl border border-border-subtle bg-surface-elevated px-4 py-3 text-[14px] text-ink" data-testid="history-row">
                <span className="font-semibold">Week of {h.weekStart}</span>
                <span className="block text-[13px] text-muted">{historyLine(h)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
