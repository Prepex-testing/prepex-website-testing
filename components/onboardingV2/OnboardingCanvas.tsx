"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookIcon, CalendarIcon, ClockIcon, GraduationCapIcon } from "@/assets/icons";
import { ChapterPicker } from "@/components/onboarding/ChapterPicker";
import { PexoSpeaks } from "@/components/onboardingV2/PexoSpeaks";
import { TimetableBuilder } from "@/components/timetable/TimetableBuilder";
import { getExams } from "@/lib/api/dashboard";
import { getGoalAssistant, type Assistant } from "@/lib/api/goalAssistant";
import { createGoals } from "@/lib/api/goals";
import { ApiError } from "@/lib/api/http";
import { completeOnboarding, getDefaultExamDates, getOnboardingChapters, type OnboardingSyllabus } from "@/lib/api/onboarding";
import { updatePexoSettings } from "@/lib/api/pexo";
import { markOnboardingComplete } from "@/lib/auth/onboardingGate";
import { getStoredUser } from "@/lib/auth/session";
import { toNewGoal } from "@/lib/goalAssistant/model";
import { countChapters, filterSections, groupByClass } from "@/lib/onboarding/chapters";
import { examForOption, goalOption } from "@/lib/onboarding/goal";
import {
  buildFor,
  buildPayload,
  emptyAnswers,
  firstName,
  levelOf,
  matchVoice,
  nextQuestion,
  schoolAsked,
  spokenDate,
  totalSteps,
  usablePrefill,
  VOICE_QUESTIONS,
  type CanvasAnswers,
  type ClassAnswer,
  type ExamDateChoice,
  type QuestionId,
} from "@/lib/onboardingV2/canvas";
import { sayLocal } from "@/lib/onboardingV2/lines";
import { flushMetrics, questionDone, questionShown } from "@/lib/onboardingV2/metrics";
import { coachingSlotsFor, defaultHours, type HoursAnswer, type StudyWindow } from "@/lib/onboardingV2/timetable";
import { buzz, canListen, listenOnce, speak, stopSpeaking } from "@/lib/onboardingV2/voice";
import { loadPexo, pexoEvent, pexoMark } from "@/lib/pexo/store";
import type { PexoContext, PexoPick } from "@/lib/pexo/engine";
import { formatDuration, replicateDay } from "@/lib/timetable/grid";

const STORE = "prepex_onboarding_v2";
const REACTION_MS = 1300;
const OPTIONAL: ReadonlySet<QuestionId> = new Set(["exam_date", "windows", "chapters", "goals"]);

type Phase = { kind: "ask" } | { kind: "building"; error: string | null } | { kind: "goals"; assistant: Assistant } | { kind: "saving-goals"; assistant: Assistant };

function storeKey(): string {
  return `${STORE}:${getStoredUser()?.id ?? "anon"}`;
}
function loadAnswers(): CanvasAnswers | null {
  try {
    const raw = window.localStorage.getItem(storeKey());
    const v = raw ? (JSON.parse(raw) as CanvasAnswers) : null;
    return v?.version === 1 ? v : null;
  } catch {
    return null;
  }
}
function saveAnswers(a: CanvasAnswers) {
  try {
    window.localStorage.setItem(storeKey(), JSON.stringify(a));
  } catch {
    /* private mode */
  }
}
function clearAnswers() {
  try {
    window.localStorage.removeItem(storeKey());
  } catch {
    /* nothing */
  }
}

/**
 * Onboarding v2, Part C: one full-screen canvas. Pexo (160 px) asks one thing at a time in a big bubble, the student
 * answers with 2-5 one-tap chips, and Pexo climbs one stair per answer instead of "Step x of 5". Back is always there;
 * optional questions have "Skip for now". Answers stay on the device until the one save, which sends exactly the
 * payload the old flow sends.
 */
export function OnboardingCanvas() {
  const router = useRouter();
  const [a, setA] = useState<CanvasAnswers | null>(null);
  const [reaction, setReaction] = useState<PexoPick | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "ask" });
  const [heard, setHeard] = useState<{ text: string; match: string | null } | null>(null);
  const [voiceOn, setVoiceOn] = useState(false);
  const [listening, setListening] = useState(false);
  const reactionTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const saved = loadAnswers();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the saved answers live on the device
    setA(saved ?? emptyAnswers(usablePrefill(getStoredUser()?.fullName)));
    if (!saved) setReaction(sayLocal("onb.hello.1"));
    void loadPexo();
  }, []);

  useEffect(() => {
    if (a) saveAnswers(a);
  }, [a]);

  const q = a?.current ?? "prefs";
  useEffect(() => {
    if (!a || phase.kind !== "ask") return;
    questionShown(q);
    heading.current?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per question
  }, [q, phase.kind, a === null]);

  useEffect(() => {
    if (!reaction) return;
    clearTimeout(reactionTimer.current);
    reactionTimer.current = setTimeout(() => setReaction(null), REACTION_MS);
    return () => clearTimeout(reactionTimer.current);
  }, [reaction]);

  const say = useCallback((trigger: string | readonly string[], ctx: PexoContext = {}) => (a ? sayLocal(trigger, ctx, a.language) : null), [a]);

  // what Pexo says for the question on screen (always filled with real values, or nothing)
  const questionLine = useMemo<PexoPick | null>(() => {
    if (!a) return null;
    switch (phase.kind) {
      case "building":
        return say("onb.building");
      case "goals":
      case "saving-goals": {
        const s = phase.assistant.suggestions;
        const sum = (t: string) => s.filter((x) => x.type === t).reduce((n, x) => n + x.target, 0);
        return say("onb.goals.proposal", { lectures: sum("LECTURES"), questions: sum("QUESTIONS"), revisions: phase.assistant.revisionAuto.chaptersDue });
      }
    }
    switch (q) {
      case "prefs":
        return say("onb.prefs");
      case "name":
        return say("onb.name");
      case "exam":
        return say("onb.exam");
      case "class":
        return say("onb.class");
      case "exam_date": {
        const next = a.examDates[0];
        return next ? say("onb.exam_date.confirm", { exam: next.label, date: spokenDate(next.date), days: next.days }) : null;
      }
      case "school":
        return say("onb.school");
      case "coaching":
        return say("onb.coaching");
      case "coaching_time":
        return say("onb.coaching.time");
      case "hours":
        return say("onb.hours");
      case "windows":
        return say("onb.windows");
      case "week": {
        const w = buildFor(a);
        const minutes = a.weekEdited ? weekdayMinutes(a) : w.weekdayStudyMinutes;
        const time = a.weekEdited ? revisionStart(a) : w.revisionTime;
        return time ? say("onb.week_preview", { hours: Math.round((minutes / 60) * 10) / 10, time }) : null;
      }
      case "chapters":
        return say("onb.chapters");
      case "goals":
        return null;
    }
  }, [a, q, phase, say]);

  const pick = reaction ?? questionLine;
  // Pexo out loud: only with sound on, and only lines that change (the prefs tap is the user gesture browsers need)
  const spoken = useRef<string | null>(null);
  useEffect(() => {
    if (!a?.sound || !pick || spoken.current === pick.id + pick.text) return;
    spoken.current = pick.id + pick.text;
    speak(pick.text, a.language);
  }, [pick, a?.sound, a?.language]);
  useEffect(() => () => stopSpeaking(), []);

  // the exam dates Pexo confirms come from the server's one config file
  useEffect(() => {
    if (!a || q !== "exam_date" || a.examDatesChanged || !a.goal) return;
    let alive = true;
    void getDefaultExamDates(levelOf(a.level), a.goal).then(
      ({ data }) => {
        if (alive) setA((cur) => (cur && !cur.examDatesChanged ? { ...cur, examDates: data.dates.map(({ kind, label, date, days, isDefault }) => ({ kind, label, date, days, isDefault })) } : cur));
      },
      () => undefined,
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only when the facts behind the dates change
  }, [q, a?.goal, a?.level, a?.examDatesChanged]);

  if (!a) return null;

  /** Record the answer, show Pexo's reaction (if any), and move on. */
  const answer = (patch: Partial<CanvasAnswers>, react: PexoPick | null = null, input: "tap" | "voice" = "tap", kind: "answer" | "skip" = "answer") => {
    buzz();
    setHeard(null);
    questionDone(q, kind, input);
    const next = { ...a, ...patch };
    const after = nextQuestion(q, next);
    // a new week is built whenever an answer it depends on changes, unless the student already adjusted it by hand
    if (["class", "school", "coaching", "coaching_time", "hours", "windows"].includes(q) && !next.weekEdited) next.week = [];
    if (after === "week" && next.week.length === 0) next.week = buildFor(next).blocks;
    if (react) setReaction(react);
    if (after) setA({ ...next, history: [...next.history, q], current: after });
    else {
      setA({ ...next, history: [...next.history, q] });
      void submit({ ...next, history: [...next.history, q] });
    }
  };

  const back = () => {
    if (phase.kind !== "ask" || a.history.length === 0) return;
    questionDone(q, "back");
    setHeard(null);
    setReaction(null);
    const prev = a.history[a.history.length - 1]!;
    setA({ ...a, history: a.history.slice(0, -1), current: prev });
  };

  async function submit(final: CanvasAnswers) {
    setPhase({ kind: "building", error: null });
    try {
      const { data: exams } = await getExams();
      const exam = examForOption(goalOption(final.goal === "JEE_BOTH" ? "JEE_BOTH" : "JEE_MAIN")!, exams);
      if (!exam) throw new Error("exam");
      try {
        await completeOnboarding(buildPayload(final, exam.id) as Parameters<typeof completeOnboarding>[0]);
      } catch (err) {
        // 409: already saved (a double tap or another tab) - carry on
        if (!(err instanceof ApiError && err.status === 409)) throw err;
      }
      markOnboardingComplete();
      questionDone("building", "answer");
      // Pexo's own records: the student went through a Pexo-led onboarding (no "Meet Pexo" later), and in their language
      pexoEvent("onboarding_step_completed", { step: "v2" });
      pexoMark("onb.v2", true);
      if (final.language === "hi") void updatePexoSettings({ language: "hi" }).catch(() => undefined);
      const assistant = await getGoalAssistant().then((r) => r.data).catch(() => null);
      if (assistant && assistant.suggestions.length > 0 && !assistant.hasGoals) {
        setPhase({ kind: "goals", assistant });
        questionShown("goals");
      } else finish();
    } catch (err) {
      setPhase({
        kind: "building",
        error: err instanceof ApiError && err.status >= 400 && err.status < 500 ? err.message : "We couldn't save your setup. Nothing was lost, so you can try again.",
      });
    }
  }

  function finish() {
    flushMetrics();
    clearAnswers();
    router.push("/onboarding/welcome-to-prepex");
  }

  async function acceptGoals(assistant: Assistant) {
    setPhase({ kind: "saving-goals", assistant });
    questionDone("goals", "answer");
    try {
      await createGoals(assistant.suggestions.map((s) => toNewGoal(s, s.target)), assistant.weekStart);
    } catch {
      /* goals can be set from Home; never block the finale */
    }
    finish();
  }

  const steps = totalSteps(a);
  const stepIndex = phase.kind === "ask" ? a.history.length : steps;

  const listen = async () => {
    if (!voiceOn) {
      setVoiceOn(true);
      setReaction(say("onb.voice.hint"));
      return;
    }
    setListening(true);
    try {
      const text = await listenOnce(a.language).result;
      const match = text ? matchVoice(q, text) : null;
      setHeard({ text, match });
      if (!match) setReaction(say("onb.voice.didnt_catch"));
    } catch {
      setReaction(say("onb.voice.didnt_catch"));
    } finally {
      setListening(false);
    }
  };
  const suggested = heard?.match ?? null;
  const showMic = phase.kind === "ask" && canListen() && VOICE_QUESTIONS.has(q);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[600px] flex-col px-4 pb-8 pt-4" data-testid="onb-canvas" data-question={phase.kind === "ask" ? q : phase.kind}>
      <div className="flex min-h-11 items-center justify-between">
        {phase.kind === "ask" && a.history.length > 0 ? (
          <button type="button" onClick={back} className="min-h-11 rounded-lg px-2 text-[15px] font-semibold text-ink" data-testid="onb-back">
            Back
          </button>
        ) : (
          <span />
        )}
        {phase.kind === "ask" && OPTIONAL.has(q) && (
          <button type="button" onClick={() => skip()} className="min-h-11 rounded-lg px-2 text-[15px] font-semibold text-muted underline" data-testid="onb-skip">
            Skip for now
          </button>
        )}
      </div>

      <div className="mt-2 flex flex-col items-center gap-6">
        <PexoSpeaks pick={pick} stepIndex={stepIndex} steps={steps} />
        <section aria-labelledby="onb-q" className="flex w-full flex-col gap-4">
          <h1 id="onb-q" ref={heading} tabIndex={-1} className="sr-only">
            {pick?.text ?? "Setting up Prepex"}
          </h1>
          {phase.kind === "ask" && <Illustration q={q} />}
          {phase.kind === "ask" && renderQuestion()}
          {phase.kind === "building" && (
            <div className="flex flex-col items-center gap-3" data-testid="onb-building">
              {phase.error ? (
                <>
                  <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-[14px] font-medium text-danger">
                    {phase.error}
                  </p>
                  <Chip onClick={() => void submit(a)} testId="onb-retry">
                    Try again
                  </Chip>
                </>
              ) : (
                <div className="skeleton h-2 w-40 rounded-full" aria-hidden />
              )}
            </div>
          )}
          {(phase.kind === "goals" || phase.kind === "saving-goals") && (
            <GoalsProposal assistant={phase.assistant} busy={phase.kind === "saving-goals"} onAccept={() => void acceptGoals(phase.assistant)} onAdjust={() => { questionDone("goals", "skip"); flushMetrics(); clearAnswers(); router.push("/goals?welcome=1"); }} />
          )}
          {showMic && (
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => void listen()}
                disabled={listening}
                className="flex min-h-11 items-center gap-2 rounded-full border border-border-subtle bg-surface px-4 text-[14px] font-semibold text-ink disabled:opacity-60"
                data-testid="onb-mic"
                aria-label={voiceOn ? "Say your answer" : "Turn on answering by voice"}
              >
                <MicIcon />
                {listening ? "Listening..." : "Say it"}
              </button>
              {voiceOn && !heard && <p className="text-center text-[12px] text-muted">Your browser turns speech into text. Nothing is kept unless you tap an answer.</p>}
              {heard && (
                <p className="text-center text-[13px] text-muted" data-testid="onb-heard">
                  Heard: &ldquo;{heard.text || "nothing"}&rdquo;{heard.match ? ". Tap the highlighted answer to confirm." : ""}
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );

  function skip() {
    if (!a) return;
    if (q === "windows") return answer({ windows: ["EVENING", "NIGHT"] }, null, "tap", "skip");
    if (q === "chapters") return answer({ chapters: [] }, say("onb.chapters.none"), "tap", "skip");
    if (q === "exam_date") return answer({}, null, "tap", "skip");
  }

  function renderQuestion() {
    if (!a) return null;
    const voiceInput = (id: string) => (suggested === id ? "voice" : "tap");
    switch (q) {
      case "prefs":
        return <Prefs a={a} onDone={(language, sound) => answer({ language, sound })} />;
      case "name":
        return <NameStep initial={a.name} onDone={(name) => answer({ name }, sayLocal("onb.name.after", { name: firstName(name) }, a.language))} />;
      case "exam":
        return (
          <Chips>
            <Chip selected={a.goal === "JEE_MAIN"} suggested={suggested === "JEE_MAIN"} onClick={() => answer({ goal: "JEE_MAIN", examDates: [], examDatesChanged: false }, null, voiceInput("JEE_MAIN"))} testId="onb-exam-main">
              JEE Main
            </Chip>
            <Chip selected={a.goal === "JEE_BOTH"} suggested={suggested === "JEE_BOTH"} onClick={() => answer({ goal: "JEE_BOTH", examDates: [], examDatesChanged: false }, null, voiceInput("JEE_BOTH"))} testId="onb-exam-both">
              JEE Main + Advanced
            </Chip>
            <Chip disabled testId="onb-exam-neet">
              NEET (coming soon)
            </Chip>
          </Chips>
        );
      case "class": {
        const pickClass = (c: ClassAnswer) => {
          const trigger = c === "CLASS_11" ? "onb.class.11" : c === "CLASS_12" ? "onb.class.12" : c === "DROPPER" ? "onb.class.dropper" : null;
          answer({ level: c, examDates: [], examDatesChanged: false, ...(c === "CLASS_11" || c === "CLASS_12" ? {} : { school: null }) }, trigger ? sayLocal(trigger, {}, a.language) : null, voiceInput(c));
        };
        return (
          <Chips>
            {(
              [
                ["CLASS_11", "Class 11"],
                ["CLASS_12", "Class 12"],
                ["DROPPER", "Dropper"],
                ["OTHER", "Other"],
              ] as const
            ).map(([id, label]) => (
              <Chip key={id} selected={a.level === id} suggested={suggested === id} onClick={() => pickClass(id)} testId={`onb-class-${id}`}>
                {label}
              </Chip>
            ))}
          </Chips>
        );
      }
      case "exam_date":
        return <ExamDateStep a={a} suggested={suggested} onYes={() => answer({}, null, voiceInput("YES"))} onChange={(dates) => answer({ examDates: dates, examDatesChanged: true })} />;
      case "school":
        return (
          <Chips>
            <Chip selected={a.school === "MORNING"} suggested={suggested === "MORNING"} onClick={() => answer({ school: "MORNING", coachingSlot: null }, sayLocal("onb.school.yes", {}, a.language), voiceInput("MORNING"))} testId="onb-school-morning">
              Morning school (7:00 to 1:00)
            </Chip>
            <Chip selected={a.school === "DAY"} suggested={suggested === "DAY"} onClick={() => answer({ school: "DAY", coachingSlot: null }, sayLocal("onb.school.yes", {}, a.language), voiceInput("DAY"))} testId="onb-school-day">
              Day school (9:00 to 3:00)
            </Chip>
            <Chip selected={a.school === "NONE"} suggested={suggested === "NONE"} onClick={() => answer({ school: "NONE" }, sayLocal("onb.school.dummy", {}, a.language), voiceInput("NONE"))} testId="onb-school-none">
              No school / dummy school
            </Chip>
          </Chips>
        );
      case "coaching":
        return (
          <Chips>
            {(
              [
                ["OFFLINE", "Offline coaching"],
                ["ONLINE", "Online coaching"],
                ["SELF", "Self-study"],
              ] as const
            ).map(([id, label]) => (
              <Chip key={id} selected={a.coaching === id} suggested={suggested === id} onClick={() => answer({ coaching: id, ...(id === "OFFLINE" ? {} : { coachingSlot: null }) }, null, voiceInput(id))} testId={`onb-coaching-${id}`}>
                {label}
              </Chip>
            ))}
          </Chips>
        );
      case "coaching_time": {
        const allowed = coachingSlotsFor(schoolAsked(a) ? (a.school ?? "NONE") : "NONE");
        const LABEL = { MORNING: "Morning (7:00 to 10:00)", AFTERNOON: "Afternoon (1:00 to 4:00)", EVENING: "Evening (4:00 to 7:00)" } as const;
        return (
          <Chips>
            {(["MORNING", "AFTERNOON", "EVENING"] as const).map((slot) => (
              <Chip key={slot} disabled={!allowed.includes(slot)} selected={a.coachingSlot === slot} suggested={suggested === slot} onClick={() => answer({ coachingSlot: slot }, null, voiceInput(slot))} testId={`onb-ctime-${slot}`}>
                {LABEL[slot]}
                {!allowed.includes(slot) ? " (clashes with school)" : ""}
              </Chip>
            ))}
          </Chips>
        );
      }
      case "hours": {
        const preset = defaultHours(levelOf(a.level), schoolAsked(a) ? (a.school ?? "NONE") : "NONE");
        const current = a.hours ?? preset;
        return (
          <Chips>
            {([2, 4, 6, 8, 10] as HoursAnswer[]).map((h) => (
              <Chip key={h} selected={current === h} suggested={suggested === String(h)} onClick={() => answer({ hours: h }, h === 10 ? sayLocal("onb.hours.high", {}, a.language) : null, voiceInput(String(h)))} testId={`onb-hours-${h}`}>
                {h === 10 ? "10+ hours" : `${h} hours`}
              </Chip>
            ))}
          </Chips>
        );
      }
      case "windows":
        return <WindowsStep initial={a.windows} onDone={(windows) => answer({ windows })} />;
      case "week":
        return <WeekStep a={a} onLooksGood={() => answer({})} onAdjusted={(week, uniform) => setA({ ...a, week, weekEdited: true, weekUniform: uniform })} />;
      case "chapters":
        return (
          <ChaptersStep
            goal={a.goal}
            initial={a.chapters}
            onDone={(chapters) => answer({ chapters }, chapters.length > 0 ? sayLocal("onb.chapters.after", { n: chapters.length }, a.language) : sayLocal("onb.chapters.none", {}, a.language))}
          />
        );
      case "goals":
        return null;
    }
  }
}

function weekdayMinutes(a: CanvasAnswers): number {
  return a.week.filter((b) => b.dayOfWeek === 0 && ["SELF_STUDY", "PRACTICE", "REVISION"].includes(b.activityType)).reduce((s, b) => s + b.endMin - b.startMin, 0);
}
function revisionStart(a: CanvasAnswers): string {
  const r = a.week.filter((b) => b.dayOfWeek === 0 && b.activityType === "REVISION").sort((x, y) => x.startMin - y.startMin)[0];
  return r ? `${String(Math.floor(r.startMin / 60)).padStart(2, "0")}:${String(r.startMin % 60).padStart(2, "0")}` : "";
}

// ---- pieces ---------------------------------------------------------------------------------------------------------

function Chips({ children, multi = false, label }: { children: React.ReactNode; multi?: boolean; label?: string }) {
  return (
    <div role={multi ? "group" : "radiogroup"} aria-label={label} className="flex flex-wrap justify-center gap-2.5">
      {children}
    </div>
  );
}

function Chip({ children, onClick, selected = false, suggested = false, disabled = false, testId, multi = false }: { children: React.ReactNode; onClick?: () => void; selected?: boolean; suggested?: boolean; disabled?: boolean; testId?: string; multi?: boolean }) {
  return (
    <button
      type="button"
      role={multi ? "checkbox" : "radio"}
      aria-checked={selected}
      disabled={disabled}
      onClick={onClick}
      data-testid={testId}
      data-suggested={suggested || undefined}
      className={`min-h-12 rounded-2xl border px-4 py-2.5 text-[16px] font-bold transition active:scale-[0.98] motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-45 ${
        selected ? "border-[var(--cta)] bg-[color-mix(in_srgb,var(--cta)_14%,transparent)] text-ink" : "border-border-subtle bg-surface text-ink hover:border-brand"
      } ${suggested ? "ring-2 ring-[var(--cta)] ring-offset-2" : ""}`}
    >
      {children}
    </button>
  );
}

function Illustration({ q }: { q: QuestionId }) {
  const Icon = q === "class" || q === "school" ? GraduationCapIcon : q === "exam_date" ? CalendarIcon : q === "chapters" || q === "exam" ? BookIcon : q === "hours" || q === "windows" || q === "coaching_time" || q === "week" ? ClockIcon : null;
  if (!Icon) return null;
  return (
    <div aria-hidden className="mx-auto flex size-10 items-center justify-center rounded-full bg-tint-strong text-ink">
      <Icon />
    </div>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path fill="currentColor" d="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-2.08A7 7 0 0 0 19 12h-2Z" />
    </svg>
  );
}

function Prefs({ a, onDone }: { a: CanvasAnswers; onDone: (language: "en" | "hi", sound: boolean) => void }) {
  const [language, setLanguage] = useState(a.language);
  const [sound, setSound] = useState(a.sound);
  return (
    <div className="flex flex-col items-center gap-4">
      <Chips label="Pexo's language">
        <Chip selected={language === "en"} onClick={() => setLanguage("en")} testId="onb-lang-en">
          English
        </Chip>
        <Chip selected={language === "hi"} onClick={() => setLanguage("hi")} testId="onb-lang-hi">
          Hinglish
        </Chip>
      </Chips>
      <Chips label="Pexo's voice">
        <Chip selected={sound} onClick={() => setSound(true)} testId="onb-sound-on">
          With sound
        </Chip>
        <Chip selected={!sound} onClick={() => setSound(false)} testId="onb-sound-off">
          Text only
        </Chip>
      </Chips>
      <PrimaryChip onClick={() => onDone(language, sound)} testId="onb-prefs-next">
        Let&apos;s start
      </PrimaryChip>
    </div>
  );
}

function PrimaryChip({ children, onClick, disabled = false, testId }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; testId?: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} data-testid={testId} className="min-h-12 w-full max-w-[320px] rounded-2xl bg-[var(--cta)] px-5 text-[16px] font-bold text-white transition active:scale-[0.98] disabled:opacity-50">
      {children}
    </button>
  );
}

function NameStep({ initial, onDone }: { initial: string; onDone: (name: string) => void }) {
  const [name, setName] = useState(initial);
  const valid = name.trim().length > 0 && name.trim().length <= 60;
  return (
    <form
      className="flex flex-col items-center gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onDone(name.trim());
      }}
    >
      <label htmlFor="onb-name" className="sr-only">
        Your name
      </label>
      <input id="onb-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" maxLength={60} placeholder="Your name" className="min-h-12 w-full max-w-[320px] rounded-2xl border border-border-subtle bg-surface px-4 text-center text-[18px] font-semibold text-ink focus:border-brand focus:outline-none" data-testid="onb-name" />
      <button type="submit" disabled={!valid} className="min-h-12 w-full max-w-[320px] rounded-2xl bg-[var(--cta)] px-5 text-[16px] font-bold text-white disabled:opacity-50" data-testid="onb-name-next">
        {initial && name.trim() === initial ? "That's me" : "Continue"}
      </button>
    </form>
  );
}

function ExamDateStep({ a, suggested, onYes, onChange }: { a: CanvasAnswers; suggested: string | null; onYes: () => void; onChange: (d: ExamDateChoice[]) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  if (a.examDates.length === 0) return <div className="skeleton mx-auto h-12 w-64 rounded-2xl" aria-busy />;
  if (!editing)
    return (
      <div className="flex flex-col items-center gap-3">
        {a.examDates.length > 1 && (
          <p className="text-center text-[14px] text-muted" data-testid="onb-exam-dates">
            {a.examDates.map((d) => `${d.label}: ${spokenDate(d.date)}`).join(" · ")}
          </p>
        )}
        <Chips>
          <Chip suggested={suggested === "YES"} onClick={onYes} testId="onb-date-yes">
            Yes
          </Chip>
          <Chip suggested={suggested === "CHANGE"} onClick={() => setEditing(true)} testId="onb-date-change">
            Change date
          </Chip>
        </Chips>
      </div>
    );
  const today = new Date().toISOString().slice(0, 10);
  const values = a.examDates.map((d) => ({ ...d, date: draft[d.kind] ?? d.date }));
  const valid = values.every((d) => d.date >= today);
  return (
    <form
      className="flex flex-col items-center gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        const days = (iso: string) => Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
        onChange(values.map((d) => ({ ...d, isDefault: false, days: days(d.date) })).sort((x, y) => x.date.localeCompare(y.date)));
      }}
    >
      {a.examDates.map((d) => (
        <label key={d.kind} className="flex w-full max-w-[320px] flex-col gap-1 text-[14px] font-semibold text-ink">
          {d.label}
          <input type="date" min={today} value={draft[d.kind] ?? d.date} onChange={(e) => setDraft({ ...draft, [d.kind]: e.target.value })} className="min-h-12 rounded-2xl border border-border-subtle bg-surface px-4 text-[16px] text-ink" data-testid={`onb-date-${d.kind}`} />
        </label>
      ))}
      <button type="submit" disabled={!valid} className="min-h-12 w-full max-w-[320px] rounded-2xl bg-[var(--cta)] px-5 text-[16px] font-bold text-white disabled:opacity-50" data-testid="onb-date-save">
        Save date
      </button>
    </form>
  );
}

const WINDOW_LABELS: [StudyWindow, string][] = [
  ["EARLY_MORNING", "Early morning (5:30 to 7:30)"],
  ["MORNING", "Morning (8 to 12)"],
  ["AFTERNOON", "Afternoon (1:30 to 5)"],
  ["EVENING", "Evening (5 to 9)"],
  ["NIGHT", "Night (9 to 11:30)"],
];

function WindowsStep({ initial, onDone }: { initial: StudyWindow[]; onDone: (w: StudyWindow[]) => void }) {
  const [picked, setPicked] = useState<StudyWindow[]>(initial);
  const toggle = (w: StudyWindow) => setPicked((p) => (p.includes(w) ? p.filter((x) => x !== w) : [...p, w]));
  return (
    <div className="flex flex-col items-center gap-4">
      <Chips multi label="When you study best">
        {WINDOW_LABELS.map(([w, label]) => (
          <Chip key={w} multi selected={picked.includes(w)} onClick={() => toggle(w)} testId={`onb-window-${w}`}>
            {label}
          </Chip>
        ))}
      </Chips>
      <PrimaryChip disabled={picked.length === 0} onClick={() => onDone(picked)} testId="onb-windows-next">
        Continue
      </PrimaryChip>
    </div>
  );
}

const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TYPE_LABEL: Record<string, string> = { SELF_STUDY: "Self-study", PRACTICE: "Practice", REVISION: "Revision", SCHOOL: "School", COACHING: "Coaching", SLEEP: "Sleep", MEAL: "Meal", BREAK: "Break" };
const clockOf = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

function WeekStep({ a, onLooksGood, onAdjusted }: { a: CanvasAnswers; onLooksGood: () => void; onAdjusted: (week: CanvasAnswers["week"], uniform: boolean) => void }) {
  const [day, setDay] = useState(0);
  const [editing, setEditing] = useState(false);
  // Adjust opens on ONE day that applies to the whole week (few students plan seven different days); the editor's
  // "same every day" switch lets them edit days separately. A week adjusted that way before stays as it was.
  const [uniform, setUniform] = useState(a.weekEdited ? a.weekUniform === true : true);
  const blocks = a.week.filter((b) => b.dayOfWeek === day && b.activityType !== "SLEEP" && b.activityType !== "BREAK").sort((x, y) => x.startMin - y.startMin);
  const study = a.week.filter((b) => b.dayOfWeek === day && ["SELF_STUDY", "PRACTICE", "REVISION"].includes(b.activityType)).reduce((s, b) => s + b.endMin - b.startMin, 0);
  if (editing)
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-[var(--background)] p-4" role="dialog" aria-modal="true" aria-label="Adjust your week" data-testid="onb-week-editor">
        <TimetableBuilder
          initialBlocks={uniform ? replicateDay(a.week, 0) : a.week}
          subjects={[]}
          saveLabel="Use this week"
          uniformWeek={uniform}
          onUniformWeekChange={setUniform}
          onSave={(next) => {
            onAdjusted(next, uniform);
            setEditing(false);
          }}
          secondaryAction={{ label: "Cancel", onClick: () => setEditing(false), placement: "before" }}
        />
      </div>
    );
  return (
    <div className="flex flex-col gap-3" data-testid="onb-week">
      <div role="tablist" aria-label="Day" className="flex justify-center gap-1">
        {DAY_SHORT.map((d, i) => (
          <button key={d} role="tab" aria-selected={day === i} type="button" onClick={() => setDay(i)} className={`min-h-11 min-w-11 rounded-xl px-2 text-[13px] font-bold ${day === i ? "bg-[var(--cta)] text-white" : "bg-surface text-ink"}`}>
            {d}
          </button>
        ))}
      </div>
      <p className="text-center text-[13px] text-muted">{formatDuration(study)} of study</p>
      <ul className="flex flex-col gap-1.5 rounded-2xl border border-border-subtle bg-surface-elevated p-3">
        {blocks.map((b) => (
          <li key={b.key} className="flex items-center justify-between gap-3 text-[14px]">
            <span className="tabular-nums text-muted">
              {clockOf(b.startMin)} to {clockOf(b.endMin)}
            </span>
            <span className="font-semibold text-ink">{b.label ?? TYPE_LABEL[b.activityType] ?? b.activityType}</span>
          </li>
        ))}
      </ul>
      <Chips>
        <Chip onClick={onLooksGood} testId="onb-week-ok">
          Looks good
        </Chip>
        <Chip onClick={() => setEditing(true)} testId="onb-week-adjust">
          Adjust
        </Chip>
      </Chips>
    </div>
  );
}

function ChaptersStep({ goal, initial, onDone }: { goal: CanvasAnswers["goal"]; initial: string[]; onDone: (c: string[]) => void }) {
  const [syllabus, setSyllabus] = useState<OnboardingSyllabus | null>(null);
  const [failed, setFailed] = useState(false);
  const [completed, setCompleted] = useState<string[]>(initial);
  const [cls, setCls] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  useEffect(() => {
    let alive = true;
    void getExams()
      .then(({ data }) => {
        const exam = examForOption(goalOption(goal === "JEE_BOTH" ? "JEE_BOTH" : "JEE_MAIN")!, data);
        if (!exam) throw new Error("exam");
        return getOnboardingChapters({ examId: exam.id });
      })
      .then(({ data }) => alive && setSyllabus(data))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [goal]);
  const sections = useMemo(() => groupByClass(syllabus?.subjects ?? []), [syllabus]);
  const shown = useMemo(() => filterSections(sections.filter((s) => !cls || s.key === cls), query), [sections, cls, query]);
  if (failed) return <p className="text-center text-[14px] text-muted">We couldn&apos;t load the chapters. You can mark them later from Syllabus.</p>;
  if (!syllabus) return <div className="skeleton mx-auto h-40 w-full rounded-2xl" aria-busy />;
  return (
    <div className="flex flex-col gap-3" data-testid="onb-chapters">
      <div role="tablist" aria-label="Class" className="flex justify-center gap-2">
        {[{ key: null, label: "All" }, ...sections.map((s) => ({ key: s.key, label: s.label }))].map((t) => (
          <button key={t.key ?? "all"} role="tab" aria-selected={cls === t.key} type="button" onClick={() => setCls(t.key)} className={`min-h-11 rounded-xl px-3 text-[14px] font-bold ${cls === t.key ? "bg-[var(--cta)] text-white" : "bg-surface text-ink"}`}>
            {t.label}
          </button>
        ))}
      </div>
      <label className="sr-only" htmlFor="onb-chapter-search">
        Search chapters
      </label>
      <input id="onb-chapter-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search chapters" className="min-h-11 rounded-xl border border-border-subtle bg-surface px-3 text-[15px] text-ink" />
      <p aria-live="polite" className="text-center text-[13px] font-semibold text-ink" data-testid="onb-chapter-count">
        {completed.length} of {countChapters(sections)} done
      </p>
      <div className="max-h-[45dvh] overflow-y-auto rounded-2xl border border-border-subtle bg-surface-elevated p-3">
        <ChapterPicker sections={shown} completed={completed} onChange={setCompleted} expandAll={query.trim().length > 0} />
      </div>
      <PrimaryChip onClick={() => onDone(completed)} testId="onb-chapters-next">
        {completed.length > 0 ? "Done" : "None yet"}
      </PrimaryChip>
    </div>
  );
}

function GoalsProposal({ assistant, busy, onAccept, onAdjust }: { assistant: Assistant; busy: boolean; onAccept: () => void; onAdjust: () => void }) {
  return (
    <div className="flex flex-col gap-3" data-testid="onb-goals">
      <ul className="flex flex-col gap-1.5 rounded-2xl border border-border-subtle bg-surface-elevated p-3">
        {assistant.suggestions.slice(0, 6).map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-3 text-[14px]">
            <span className="min-w-0 truncate text-ink">{s.label}</span>
            <span className="shrink-0 font-semibold tabular-nums text-ink">{s.target}</span>
          </li>
        ))}
      </ul>
      <Chips>
        <Chip disabled={busy} onClick={onAccept} testId="onb-goals-ok">
          Looks good
        </Chip>
        <Chip disabled={busy} onClick={onAdjust} testId="onb-goals-adjust">
          Adjust
        </Chip>
      </Chips>
    </div>
  );
}
