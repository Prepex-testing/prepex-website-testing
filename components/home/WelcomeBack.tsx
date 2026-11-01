"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/planner/Sheet";
import { CountStepper } from "@/components/planner/tickParts";
import { SubjectChapterFields } from "@/components/study/SubjectChapterFields";
import { useSubjects } from "@/components/study/useSubjects";
import { CoralButton } from "@/components/ui/CoralButton";
import { GhostButton } from "@/components/ui/GhostButton";
import { completeWelcomeBack, dismissWelcomeBack, getWelcomeBack, type WelcomeBackInput, type WelcomeBackState } from "@/lib/api/backlogHub";
import { ApiError } from "@/lib/api/http";
import { loadChapterIndex, type ChapterInfo } from "@/lib/syllabus/chapterIndex";

type BacklogPick = WelcomeBackInput["backlog"][number] & { name: string };

/**
 * Welcome Back: shown once, on the first open after two or more days away. The days that passed expired quietly (nothing
 * piled up, nothing turned into backlog), so this is one calm question: what did you cover while away? One tap per chapter
 * updates it. Then a fresh plan for today, with the week's goals re-spread over the days that are left. No guilt copy and
 * no debt numbers.
 */
export function WelcomeBack({ onDone }: { onDone?: () => void }) {
  const subjects = useSubjects();
  const [state, setState] = useState<WelcomeBackState | null>(null);
  const [index, setIndex] = useState<Map<string, ChapterInfo>>(new Map());
  const [covered, setCovered] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [lectures, setLectures] = useState(0);
  const [questions, setQuestions] = useState(0);
  const [backlog, setBacklog] = useState<BacklogPick[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    let alive = true;
    void getWelcomeBack()
      .then((s) => alive && setState(s))
      .catch(() => undefined);
    void loadChapterIndex()
      .then((m) => alive && setIndex(m))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  if (!state?.show || closed) return null;

  const toggle = (id: string) => setCovered((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const nameOf = (id: string) => index.get(id)?.name ?? "Chapter";

  function addBacklog() {
    if (subjectId === null || !chapterId) return setError("Pick the subject and chapter first.");
    if (lectures + questions <= 0) return setError("Say how many lectures or questions are left.");
    setError(null);
    setBacklog((prev) => [...prev.filter((b) => b.chapterId !== chapterId), { subjectId, chapterId, lectures, dpps: 0, questions, tests: 0, name: nameOf(chapterId) }]);
    setChapterId(null);
    setLectures(0);
    setQuestions(0);
    setAdding(false);
  }

  async function build() {
    setBusy(true);
    setError(null);
    try {
      await completeWelcomeBack({ chapterIds: covered, backlog: backlog.map(({ name: _name, ...rest }) => rest) });
      setClosed(true);
      onDone?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't build your plan. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function later() {
    try {
      await dismissWelcomeBack();
    } catch {
      /* it only hides the screen for today */
    }
    setClosed(true);
  }

  return (
    <Sheet
      open
      onClose={() => void later()}
      title="Welcome back."
      description="What did you cover while away?"
      data-testid="welcome-back"
      footer={
        <div className="flex flex-col gap-2">
          {error && (
            <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-[13px] font-medium text-danger">
              {error}
            </p>
          )}
          <CoralButton data-testid="welcome-build" disabled={busy} onClick={() => void build()}>
            {busy ? "Building…" : "Build today's plan"}
          </CoralButton>
          <GhostButton data-testid="welcome-later" disabled={busy} onClick={() => void later()}>
            Not now
          </GhostButton>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <section className="flex flex-col gap-2" aria-label="Chapters">
          {state.chapterIds.length === 0 ? (
            <p className="text-[14px] text-muted" data-testid="welcome-no-chapters">Nothing to tick. Your plan starts fresh from today.</p>
          ) : (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Chapters you covered">
              {state.chapterIds.map((id) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={covered.includes(id)}
                  data-testid="welcome-chip"
                  onClick={() => toggle(id)}
                  className={`min-h-11 rounded-full border px-4 text-[14px] font-semibold ${covered.includes(id) ? "border-[1.5px] border-brand bg-tint-strong text-ink" : "border-border-subtle bg-surface text-ink"}`}
                >
                  {nameOf(id)}
                </button>
              ))}
            </div>
          )}
          <p className="text-[12px] text-muted">Tap what you covered. Your plan starts fresh from today.</p>
        </section>

        <section className="flex flex-col gap-3" aria-label="Backlog">
          <h3 className="text-[15px] font-bold text-ink">Anything to add to your backlog?</h3>
          {backlog.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {backlog.map((b) => (
                <li key={b.chapterId} className="flex items-center justify-between gap-2 rounded-xl border border-border-subtle bg-surface-elevated px-3 py-2 text-[13px] text-ink" data-testid="welcome-backlog-item">
                  <span className="min-w-0 truncate">
                    {b.name}: {b.lectures > 0 ? `${b.lectures} lectures` : ""}
                    {b.lectures > 0 && b.questions > 0 ? ", " : ""}
                    {b.questions > 0 ? `${b.questions} questions` : ""}
                  </span>
                  <button type="button" className="text-[12px] font-semibold text-muted underline-offset-2 hover:underline" onClick={() => setBacklog((prev) => prev.filter((x) => x.chapterId !== b.chapterId))}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          {adding ? (
            <div className="flex flex-col gap-3 rounded-xl border border-border-subtle p-3" data-testid="welcome-backlog-form">
              <SubjectChapterFields subjects={subjects.subjects} subjectId={subjectId} chapterId={chapterId} onChange={(n) => { setSubjectId(n.subjectId); setChapterId(n.chapterId); }} chapterRequired idPrefix="welcome" />
              <div className="grid grid-cols-2 gap-3">
                <CountStepper label="Lectures left" value={lectures} max={500} testId="welcome-lectures" onChange={setLectures} />
                <CountStepper label="Questions left" value={questions} max={5000} testId="welcome-questions" onChange={setQuestions} />
              </div>
              <GhostButton data-testid="welcome-backlog-add" onClick={addBacklog}>
                Add to the list
              </GhostButton>
            </div>
          ) : (
            <GhostButton data-testid="welcome-backlog-open" onClick={() => setAdding(true)}>
              Add something
            </GhostButton>
          )}
        </section>
      </div>
    </Sheet>
  );
}
