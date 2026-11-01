"use client";

import { useState } from "react";
import { CountStepper } from "@/components/planner/tickParts";
import { SubjectChapterFields } from "@/components/study/SubjectChapterFields";
import type { SubjectChapters } from "@/lib/api/dashboard";
import { ApiError } from "@/lib/api/http";
import { estimateMinutes, hm, intakeBacklog, LANE_LABEL, type IntakeResult, type Pace, type Parts } from "@/lib/api/backlogHub";

const EMPTY: Parts = { lectures: 0, dpps: 0, questions: 0, tests: 0 };

/**
 * Fast bulk intake, about 20 seconds a chapter: pick the chapter, say how many lectures / DPPs / questions / tests are left.
 * The hours come from the student's own pace; the lane (and why) comes from the chapter and the exam date. This is the Add
 * tab's one coral button.
 */
export function BacklogIntake({ subjects, pace, onAdded }: { subjects: SubjectChapters[]; pace: Pace | null; onAdded: (r: IntakeResult) => void }) {
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [parts, setParts] = useState<Parts>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<IntakeResult | null>(null);

  const total = parts.lectures + parts.dpps + parts.questions + parts.tests;
  const minutes = pace ? estimateMinutes(parts, pace) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (subjectId === null || !chapterId) return setError("Pick the subject and chapter first.");
    if (total <= 0) return setError("Add at least one lecture, DPP, set of questions or test.");
    setBusy(true);
    setError(null);
    try {
      const result = await intakeBacklog({ subjectId, chapterId, ...parts });
      setDone(result);
      setParts(EMPTY);
      setChapterId(null);
      onAdded(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't add that. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const set = (key: keyof Parts) => (n: number) => setParts((p) => ({ ...p, [key]: n }));

  return (
    <form noValidate onSubmit={(e) => void submit(e)} className="flex flex-col gap-4" data-testid="intake-form">
      <SubjectChapterFields subjects={subjects} subjectId={subjectId} chapterId={chapterId} onChange={(n) => { setSubjectId(n.subjectId); setChapterId(n.chapterId); setDone(null); }} chapterRequired disabled={busy} idPrefix="intake" />
      <div className="grid grid-cols-2 gap-3">
        <CountStepper label="Lectures left" value={parts.lectures} max={500} testId="intake-lectures" onChange={set("lectures")} />
        <CountStepper label="DPPs left" value={parts.dpps} max={500} testId="intake-dpps" onChange={set("dpps")} />
        <CountStepper label="Questions left" value={parts.questions} max={5000} testId="intake-questions" onChange={set("questions")} />
        <CountStepper label="Tests left" value={parts.tests} max={500} testId="intake-tests" onChange={set("tests")} />
      </div>
      <p className="text-[13px] text-muted" data-testid="intake-estimate">
        {minutes === null || total === 0 ? "Say what is left and the hours are worked out for you." : `About ${hm(minutes)} at ${pace?.source === "own" ? "your own pace" : "typical pace"}.`}
      </p>
      {error && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
          {error}
        </p>
      )}
      {done && (
        <p role="status" className="rounded-xl bg-tint-strong px-3 py-2 text-[13px] text-ink" data-testid="intake-done">
          Added: {hm(done.laneMinutes)} in {LANE_LABEL[done.lane]}. {done.reason}
        </p>
      )}
      <button type="submit" data-testid="intake-submit" disabled={busy} className="min-h-14 rounded-lg border border-primary-button-border bg-cta px-4 text-base font-semibold text-white transition-colors hover:bg-[#E8623F] disabled:opacity-60">
        {busy ? "Adding…" : "Add chapter"}
      </button>
    </form>
  );
}
