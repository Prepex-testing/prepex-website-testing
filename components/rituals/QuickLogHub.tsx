"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Sheet } from "@/components/planner/Sheet";
import { CountStepper, RecallPicker, type Recall } from "@/components/planner/tickParts";
import { CoverageChips } from "@/components/rituals/CoverageChips";
import { SubjectChapterFields } from "@/components/study/SubjectChapterFields";
import { useSubjects } from "@/components/study/useSubjects";
import { CoralButton } from "@/components/ui/CoralButton";
import { GhostButton } from "@/components/ui/GhostButton";
import { createMock } from "@/lib/api/mocks";
import { createPracticeLog } from "@/lib/api/practiceLogs";
import { getPlanDay } from "@/lib/api/plannerV2";
import { createRevision } from "@/lib/api/revisionLogs";
import { submitCoverage } from "@/lib/api/rituals";
import { createStudySession } from "@/lib/api/studyLog";
import { ApiError } from "@/lib/api/http";
import { istToday, MINUTE_PRESETS, readLast, writeLast, type LastTarget } from "@/lib/quicklog/last";
import { refreshXp } from "@/lib/rewards/events";
import { loadChapterIndex } from "@/lib/syllabus/chapterIndex";

export type QuickKind = "studied" | "questions" | "revised" | "mock" | "mistake" | "class";

export const QUICK_CHIPS: { kind: QuickKind; label: string }[] = [
  { kind: "studied", label: "Studied" },
  { kind: "questions", label: "Solved Qs" },
  { kind: "revised", label: "Revised" },
  { kind: "mock", label: "Test / Mock" },
  { kind: "mistake", label: "Mistake" },
  { kind: "class", label: "Coaching class" },
];

/** The mock quick log: patterns and their paper totals. */
const PATTERNS = [
  { value: "jee_main", label: "JEE Main", max: 300 },
  { value: "jee_advanced", label: "JEE Advanced", max: 360 },
  { value: "neet", label: "NEET", max: 720 },
] as const;

function messageOf(err: unknown): string {
  return err instanceof ApiError ? err.message : "That didn't save. Please try again.";
}

/**
 * Six chips, each a log in three taps or fewer: open the chip, adjust one number, save. The subject and chapter start
 * where the last log was (or on today's plan), and every save goes through the same endpoint as the full log screens.
 */
export function QuickLogHub({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { subjects } = useSubjects();
  const [kind, setKind] = useState<QuickKind | null>(null);
  const [target, setTarget] = useState<LastTarget>({ subjectId: null, chapterId: null });
  const [minutes, setMinutes] = useState(30);
  const [attempted, setAttempted] = useState(10);
  // empty until the student enters it: accuracy is never inferred from attempted
  const [correct, setCorrect] = useState<number | null>(null);
  const [pattern, setPattern] = useState<(typeof PATTERNS)[number]["value"]>("jee_main");
  const [marks, setMarks] = useState("");
  const [classChapters, setClassChapters] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  // start from the last log, else from the first open task of today's plan
  useEffect(() => {
    if (!open) return;
    setKind(null);
    setError(null);
    setSaved(null);
    const last = readLast();
    if (last?.subjectId) {
      setTarget(last);
      return;
    }
    let alive = true;
    void getPlanDay()
      .then((r) => {
        const t = r.data.tasks.find((x) => x.subjectId !== null && x.chapterId && x.status !== "done");
        if (alive && t) setTarget({ subjectId: t.subjectId, chapterId: t.chapterId });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [open]);

  // the chapters a coaching class could have covered: this subject's chapters that are already in progress
  useEffect(() => {
    if (kind !== "class") return;
    let alive = true;
    void loadChapterIndex()
      .then((index) => {
        const mine = [...index.values()].filter((c) => (target.subjectId ? c.subjectId === target.subjectId : true));
        const ids = [...mine.filter((c) => c.theory === "learning"), ...mine.filter((c) => c.theory === "not_started")].slice(0, 8).map((c) => c.id);
        if (alive) setClassChapters(ids);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [kind, target.subjectId]);

  const needsChapter = kind === "questions" || kind === "revised";
  const ready = useMemo(() => {
    if (kind === "studied") return target.subjectId !== null;
    if (kind === "questions") return target.subjectId !== null && target.chapterId !== null && correct !== null && correct <= attempted;
    if (kind === "revised") return target.subjectId !== null && target.chapterId !== null;
    if (kind === "mock") return marks.trim() !== "" && Number.isFinite(Number(marks));
    return false;
  }, [kind, target, marks, correct, attempted]);

  async function run(work: () => Promise<unknown>, done: string) {
    setBusy(true);
    setError(null);
    try {
      await work();
      if (target.subjectId) writeLast(target);
      setSaved(done);
      void refreshXp();
      setTimeout(onClose, 700);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  const saveStudied = () => run(() => createStudySession({ subjectId: target.subjectId!, chapterId: target.chapterId, durationMinutes: minutes }), "Study time logged");
  const saveQuestions = () =>
    run(
      () => createPracticeLog({ subjectId: target.subjectId!, chapterId: target.chapterId!, source: "own_notebook", questionsAttempted: attempted, questionsCorrect: Math.min(correct ?? 0, attempted), questionsWrong: attempted - Math.min(correct ?? 0, attempted), questionsSkipped: 0 }),
      "Questions logged",
    );
  const saveRevision = (recall: Recall) => run(() => createRevision({ subjectId: target.subjectId!, chapterId: target.chapterId!, revisionType: "notes", durationMinutes: minutes, recall }), "Revision logged");
  const saveMock = () => {
    const max = PATTERNS.find((p) => p.value === pattern)!.max;
    const total = Math.round(Number(marks));
    if (total > max) return setError(`Total marks cannot be more than ${max} for this exam.`);
    return run(() => createMock({ testType: "full_mock", examPattern: pattern, dateTaken: istToday(), totalMarks: total, maxMarks: max }), "Mock logged");
  };
  const saveClass = (pick: { chapterId: string; lectureNumber: number | null }) =>
    run(() => submitCoverage({ blockKey: `manual:${istToday()}:${target.subjectId ?? 0}`, chapterId: pick.chapterId, lectureNumber: pick.lectureNumber }), "Class logged");

  function choose(next: QuickKind) {
    if (next === "mistake") {
      const q = new URLSearchParams();
      if (target.chapterId) q.set("chapter", target.chapterId);
      onClose();
      router.push(`/notebooks/capture${q.size > 0 ? `?${q.toString()}` : ""}`);
      return;
    }
    setKind(next);
    setError(null);
  }

  const showSave = kind === "studied" || kind === "questions" || kind === "mock";

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={kind ? QUICK_CHIPS.find((c) => c.kind === kind)!.label : "Quick log"}
      description={kind ? "Saved the same way as the full log screens." : "What did you just do?"}
      data-testid="quick-log-hub"
      footer={
        <div className="flex flex-col gap-2">
          {(error || saved) && (
            <p role={error ? "alert" : "status"} className={`rounded-lg px-3 py-2 text-[13px] font-medium ${error ? "bg-danger-bg text-danger" : "bg-success-bg text-success"}`}>
              {error ?? saved}
            </p>
          )}
          {showSave ? (
            <CoralButton data-testid="quick-save" disabled={busy || !ready || saved !== null} onClick={() => void (kind === "studied" ? saveStudied() : kind === "questions" ? saveQuestions() : saveMock())}>
              {busy ? "Saving…" : "Save"}
            </CoralButton>
          ) : null}
          {kind && (
            <GhostButton data-testid="quick-back" disabled={busy} onClick={() => setKind(null)}>
              Back
            </GhostButton>
          )}
        </div>
      }
    >
      {!kind ? (
        <div className="grid grid-cols-2 gap-3 pt-1" data-testid="quick-chips">
          {QUICK_CHIPS.map((c) => (
            <button key={c.kind} type="button" data-testid={`quick-${c.kind}`} onClick={() => choose(c.kind)} className="flex min-h-20 items-center justify-center rounded-2xl border border-border-subtle bg-surface-elevated px-3 text-[16px] font-extrabold text-ink transition hover:border-brand active:scale-[0.98]">
              {c.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4 pt-1">
          {kind !== "mock" && (
            <SubjectChapterFields subjects={subjects} subjectId={target.subjectId} chapterId={target.chapterId} onChange={setTarget} chapterRequired={needsChapter} idPrefix="ql" />
          )}

          {(kind === "studied" || kind === "revised") && (
            <div className="flex flex-col gap-2" role="group" aria-label="Minutes">
              <span className="text-[14px] font-semibold text-body-text dark:text-ink">How long?</span>
              <div className="flex flex-wrap gap-2">
                {MINUTE_PRESETS.map((m) => (
                  <button key={m} type="button" data-testid={`minutes-${m}`} aria-pressed={minutes === m} onClick={() => setMinutes(m)} className={`min-h-11 rounded-full border px-4 text-[14px] font-semibold ${minutes === m ? "border-[1.5px] border-brand bg-tint-strong text-ink" : "border-border-subtle bg-surface text-body-text dark:text-ink"}`}>
                    {m} min
                  </button>
                ))}
              </div>
            </div>
          )}

          {kind === "questions" && (
            <>
              <CountStepper label="Attempted" value={attempted} min={1} testId="quick-attempted" onChange={(n) => { setAttempted(n); if (correct !== null && correct > n) setCorrect(n); }} />
              <CountStepper label="Correct" value={correct === null ? null : Math.min(correct, attempted)} max={attempted} testId="quick-correct" onChange={setCorrect} />
            </>
          )}

          {kind === "revised" && <RecallPicker busy={busy || !ready} onPick={(r) => void saveRevision(r)} />}

          {kind === "mock" && (
            <>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Exam pattern">
                {PATTERNS.map((p) => (
                  <button key={p.value} type="button" role="radio" aria-checked={pattern === p.value} onClick={() => setPattern(p.value)} className={`min-h-11 rounded-xl border px-2 text-[13px] font-semibold ${pattern === p.value ? "border-[1.5px] border-brand bg-tint-strong text-ink" : "border-border-subtle bg-surface text-body-text dark:text-ink"}`}>
                    {p.label}
                  </button>
                ))}
              </div>
              <label className="flex flex-col gap-1.5 text-[14px] font-semibold text-body-text dark:text-ink">
                Total marks
                <input data-autofocus inputMode="numeric" data-testid="quick-marks" value={marks} onChange={(e) => setMarks(e.target.value.replace(/[^\d-]/g, ""))} className="h-12 w-full rounded-xl border border-input-border bg-surface px-3 text-[16px] text-ink outline-none focus:border-brand" />
              </label>
              <p className="text-[12px] text-muted">Add per-subject marks and the chapters it exposed on the Mock tests screen.</p>
            </>
          )}

          {kind === "class" && (
            <CoverageChips testId="quick-class" title="What did class cover?" hint="One tap moves the chapter to In progress." chapterIds={classChapters} busy={busy} onPick={(p) => void saveClass(p)} />
          )}
        </div>
      )}
    </Sheet>
  );
}
