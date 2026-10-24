"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ProfileSubpageHeader } from "@/components/profile/ProfileSubpageHeader";
import { PageLoader } from "@/components/ui/PageLoader";
import { ApiError } from "@/lib/api/http";
import { completePlanTask, getPlanDay, startPlanTask, type CompleteInput, type PlanTask } from "@/lib/api/plannerV2";
import { inferMock } from "@/lib/planner/cta";
import { EXAM_PATTERN_OPTIONS, MOCK_TYPE_OPTIONS, formatDuration } from "@/lib/planner/format";
import { trackPlanner } from "@/lib/telemetry/planner";

const FIELD = "h-12 w-full rounded-xl border border-input-border bg-surface px-3 text-[16px] text-body-text outline-none focus:border-brand dark:text-ink";
const LABEL = "flex flex-col gap-1.5 text-[14px] font-semibold text-body-text dark:text-ink";

type Wrong = { questionText: string; studentAnswer: string; correctAnswer: string; topic: string };
const BLANK: Wrong = { questionText: "", studentAnswer: "", correctAnswer: "", topic: "" };

const int = (v: string): number | undefined => (v.trim() === "" || !Number.isFinite(Number(v)) ? undefined : Math.round(Number(v)));

function MockScreen() {
  const router = useRouter();
  const taskId = useSearchParams().get("taskId");
  const [task, setTask] = useState<PlanTask | null | undefined>(undefined);
  const [testType, setTestType] = useState("full_mock");
  const [pattern, setPattern] = useState("jee_main");
  const [name, setName] = useState("");
  const [total, setTotal] = useState("");
  const [physics, setPhysics] = useState("");
  const [chemistry, setChemistry] = useState("");
  const [third, setThird] = useState("");
  const [minutes, setMinutes] = useState("");
  const [percentile, setPercentile] = useState("");
  const [wrong, setWrong] = useState<Wrong[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    if (!taskId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- no task in the link
      setTask(null);
      return;
    }
    getPlanDay().then(
      (res) => {
        if (!live) return;
        const found = res.data.tasks.find((t) => t.id === taskId && t.kind === "mock") ?? null;
        setTask(found);
        if (found) {
          const guess = inferMock(found.title);
          setTestType(guess.testType);
          setPattern(guess.examPattern);
          setName(found.title);
          setMinutes(String(found.estimatedMinutes));
          // The CTA moved the task to "in progress"; a failure to record that must not stop the student logging the mock.
          if (found.status === "pending") startPlanTask(found.id).catch(() => undefined);
          trackPlanner("planner_task_start", { kind: "mock" });
        }
      },
      () => live && setTask(null),
    );
    return () => {
      live = false;
    };
  }, [taskId]);

  if (task === undefined) return <PageLoader label="Opening your mock…" />;
  if (task === null) {
    return (
      <div className="flex flex-col gap-4 p-4 sm:p-6 lg:p-8" data-testid="mock-missing">
        <ProfileSubpageHeader title="Log your mock" backHref="/planner" />
        <p role="alert" className="rounded-xl bg-tint-strong px-4 py-4 text-[14px] text-body-text dark:bg-[#FAF7F214] dark:text-ink">
          We couldn&apos;t find that mock in today&apos;s plan. It may have been moved or removed.
        </p>
        <Link href="/planner" className="flex min-h-12 items-center justify-center rounded-lg border-[1.5px] border-secondary-button-border bg-surface px-4 text-[15px] font-semibold text-body-text hover:bg-tint-strong dark:text-ink">
          Back to my plan
        </Link>
      </div>
    );
  }

  const exam = EXAM_PATTERN_OPTIONS.find((o) => o.value === pattern) ?? EXAM_PATTERN_OPTIONS[0]!;
  const thirdLabel = pattern === "neet" ? "Biology marks" : "Maths marks";

  async function finish(withScores: boolean) {
    if (!task) return;
    setError(null);
    const input: CompleteInput = { via: "mock", log: withScores };
    if (withScores) {
      const marks = int(total);
      if (marks === undefined) return setError("Enter your total marks, or choose Mark done without scores.");
      if (marks > exam.maxMarks) return setError(`Total marks cannot be more than ${exam.maxMarks} for ${exam.label}.`);
      const filled = wrong.filter((w) => w.questionText.trim() && w.studentAnswer.trim() && w.correctAnswer.trim());
      if (wrong.length > filled.length) return setError("Fill in the question, your answer and the right answer for each wrong question, or remove it.");
      const t = int(minutes);
      const p = percentile.trim() === "" ? undefined : Number(percentile);
      if (p !== undefined && (!Number.isFinite(p) || p < 0 || p > 100)) return setError("Percentile must be between 0 and 100.");
      input.mock = {
        testType,
        examPattern: pattern,
        testName: name.trim() || task.title,
        totalMarks: marks,
        maxMarks: exam.maxMarks,
        ...(int(physics) !== undefined ? { physicsMarks: int(physics)! } : {}),
        ...(int(chemistry) !== undefined ? { chemistryMarks: int(chemistry)! } : {}),
        ...(int(third) !== undefined ? (pattern === "neet" ? { biologyMarks: int(third)! } : { mathsMarks: int(third)! }) : {}),
        ...(t !== undefined && t > 0 ? { timeMinutes: t } : {}),
        ...(p !== undefined ? { percentile: p } : {}),
      };
      if (filled.length > 0) input.mistakes = filled.map((w) => ({ questionText: w.questionText.trim(), studentAnswer: w.studentAnswer.trim(), correctAnswer: w.correctAnswer.trim(), ...(w.topic.trim() ? { topic: w.topic.trim() } : {}) }));
    }
    setBusy(true);
    try {
      await completePlanTask(task.id, input);
      trackPlanner("planner_task_complete", { kind: "mock", via: "mock", scored: withScores });
      router.push("/planner");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save your mock. Please try again.");
      setBusy(false);
    }
  }

  const setWrongAt = (i: number, patch: Partial<Wrong>) => setWrong((list) => list.map((w, j) => (j === i ? { ...w, ...patch } : w)));

  return (
    <div className="flex flex-col gap-5 p-4 pb-10 sm:p-6 lg:p-8" data-testid="mock-page">
      <ProfileSubpageHeader title="Log your mock" backHref="/planner" />
      <p className="rounded-xl bg-tint-strong px-4 py-3 text-[14px] leading-snug text-body-text dark:bg-[#FAF7F214] dark:text-ink">
        {task.title}, planned for {formatDuration(task.estimatedMinutes)}. Take the test, then enter your score here. Wrong answers can go straight to your mistake notebook.
      </p>

      <section className="flex flex-col gap-4 rounded-2xl border border-brand/10 bg-surface p-4" aria-label="Test details">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className={LABEL}>
            Test type
            <select data-testid="mock-type" className={FIELD} value={testType} onChange={(e) => setTestType(e.target.value)}>
              {MOCK_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className={LABEL}>
            Exam pattern
            <select data-testid="mock-pattern" className={FIELD} value={pattern} onChange={(e) => setPattern(e.target.value)}>
              {EXAM_PATTERN_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className={LABEL}>
          Test name
          <input className={FIELD} value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
        </label>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-brand/10 bg-surface p-4" aria-label="Your score">
        <label className={LABEL}>
          Total marks (out of {exam.maxMarks})
          <input data-testid="mock-total" inputMode="numeric" className={FIELD} value={total} onChange={(e) => setTotal(e.target.value.replace(/[^\d-]/g, ""))} />
        </label>
        <div className="grid grid-cols-3 gap-3">
          <label className={LABEL}>
            Physics
            <input inputMode="numeric" className={FIELD} value={physics} onChange={(e) => setPhysics(e.target.value.replace(/[^\d-]/g, ""))} aria-label="Physics marks" />
          </label>
          <label className={LABEL}>
            Chemistry
            <input inputMode="numeric" className={FIELD} value={chemistry} onChange={(e) => setChemistry(e.target.value.replace(/[^\d-]/g, ""))} aria-label="Chemistry marks" />
          </label>
          <label className={LABEL}>
            {pattern === "neet" ? "Biology" : "Maths"}
            <input inputMode="numeric" className={FIELD} value={third} onChange={(e) => setThird(e.target.value.replace(/[^\d-]/g, ""))} aria-label={thirdLabel} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className={LABEL}>
            Time taken (min)
            <input inputMode="numeric" className={FIELD} value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/[^\d]/g, ""))} />
          </label>
          <label className={LABEL}>
            Percentile (optional)
            <input inputMode="decimal" className={FIELD} value={percentile} onChange={(e) => setPercentile(e.target.value.replace(/[^\d.]/g, ""))} />
          </label>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-brand/10 bg-surface p-4" aria-label="Wrong questions" data-testid="mock-wrong">
        <div>
          <h2 className="text-[16px] font-extrabold text-ink">Questions you got wrong (optional)</h2>
          <p className="mt-0.5 text-[12px] text-muted">Each one goes into your mistake notebook under this mock&apos;s chapter, so it comes back for revision.</p>
        </div>
        {wrong.map((w, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-xl border border-brand/15 p-3" data-testid="mock-wrong-item">
            <label className={LABEL}>
              Question
              <textarea className="min-h-20 w-full rounded-xl border border-input-border bg-surface px-3 py-2 text-[16px] text-body-text outline-none focus:border-brand dark:text-ink" value={w.questionText} maxLength={5000} onChange={(e) => setWrongAt(i, { questionText: e.target.value })} />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className={LABEL}>
                Your answer
                <input className={FIELD} value={w.studentAnswer} maxLength={2000} onChange={(e) => setWrongAt(i, { studentAnswer: e.target.value })} />
              </label>
              <label className={LABEL}>
                Right answer
                <input className={FIELD} value={w.correctAnswer} maxLength={2000} onChange={(e) => setWrongAt(i, { correctAnswer: e.target.value })} />
              </label>
            </div>
            <label className={LABEL}>
              Topic (optional)
              <input className={FIELD} value={w.topic} maxLength={200} onChange={(e) => setWrongAt(i, { topic: e.target.value })} />
            </label>
            <button type="button" onClick={() => setWrong((list) => list.filter((_, j) => j !== i))} className="min-h-11 self-start rounded-lg px-3 text-[13px] font-semibold text-danger hover:bg-danger-bg">
              Remove this question
            </button>
          </div>
        ))}
        {wrong.length < 50 && (
          <button type="button" data-testid="mock-add-wrong" onClick={() => setWrong((list) => [...list, { ...BLANK }])} className="min-h-12 rounded-lg border-[1.5px] border-secondary-button-border bg-surface px-4 text-[14px] font-semibold text-body-text hover:bg-tint-strong dark:text-ink">
            + Add a wrong question
          </button>
        )}
      </section>

      {error && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-[13px] font-medium text-danger" data-testid="mock-error">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <button type="button" data-testid="mock-save" disabled={busy} onClick={() => void finish(true)} className="min-h-14 rounded-lg border border-primary-button-border bg-cta px-4 text-base font-semibold text-white hover:bg-[#E8623F] disabled:opacity-60">
          {busy ? "Saving…" : "Save mock and mark done"}
        </button>
        <button type="button" data-testid="mock-skip" disabled={busy} onClick={() => void finish(false)} className="min-h-12 rounded-lg px-4 text-[14px] font-semibold text-muted hover:underline disabled:opacity-60">
          Mark done without scores
        </button>
      </div>
    </div>
  );
}

export default function PlannerMockPage() {
  return (
    <Suspense fallback={<PageLoader label="Opening your mock…" />}>
      <MockScreen />
    </Suspense>
  );
}
