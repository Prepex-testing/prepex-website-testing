"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppBlockIndicator } from "@/components/focus/AppBlockIndicator";
import { AwayNag } from "@/components/focus/AwayNag";
import { FocusRing } from "@/components/focus/FocusRing";
import { FocusSetup, type StartExtras } from "@/components/focus/FocusSetup";
import { FocusSummaryModal } from "@/components/focus/FocusSummaryModal";
import { SessionDone } from "@/components/focus/SessionDone";
import { SoundPicker } from "@/components/focus/SoundPicker";
import { StreakChip } from "@/components/focus/StreakChip";
import { useFocusSession } from "@/components/focus/useFocusSession";
import { useSubjects } from "@/components/study/useSubjects";
import { PageLoader } from "@/components/ui/PageLoader";
import { Toast, useToast } from "@/components/ui/Toast";
import { getFocusIntent, getFocusStats, type FocusStats, type ResolvedIntent, type StartFocusInput } from "@/lib/api/focus";
import { getCurrentGoals, type Goal } from "@/lib/api/goals";
import { readBlockedApps, startAppBlock, stopAppBlock, type BlockableAppId } from "@/lib/focus/appBlock";
import { goalStripFor } from "@/lib/focus/goalStrip";
import { MODE_LABELS, TASK_TYPE_LABELS, originBackHref, originChipText, type FocusSessionIntent } from "@/lib/focus/intent";
import { DEFAULT_POMODORO, breakDue, breakRemainingSeconds, breaksTakenBefore, pomodoroPosition } from "@/lib/focus/pomodoro";
import { needsServerIntent, resolveFocusIntent } from "@/lib/focus/resolve";
import { shareOrSaveCard, shareText } from "@/lib/focus/shareCard";
import { Soundscape, readStoredSound, storeSound, type SoundId } from "@/lib/focus/soundscape";
import { formatMinutes } from "@/lib/study/format";
import { subjectColor } from "@/lib/study/subjects";
import { formatClock, ringProgress } from "@/lib/study/timer";

function StatsFooter({ stats }: { stats: FocusStats | null }) {
  return (
    <section aria-label="Today" className="grid grid-cols-3 gap-2 rounded-2xl border border-brand/10 bg-surface p-3" data-testid="focus-stats">
      <div className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Today</p>
        <p className="mt-1 text-[18px] font-extrabold text-ink" data-testid="stat-today">
          {stats ? formatMinutes(stats.todayMinutes) : "—"}
        </p>
      </div>
      <div className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">This week</p>
        <p className="mt-1 text-[18px] font-extrabold text-ink">{stats ? formatMinutes(stats.weekMinutes) : "—"}</p>
      </div>
      <div className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Win streak</p>
        <p className="mt-1 text-[18px] font-extrabold text-ink" data-testid="stat-streak">
          {stats ? `${stats.currentStreak} day${stats.currentStreak === 1 ? "" : "s"}` : "—"}
        </p>
      </div>
    </section>
  );
}

/** Pomodoro bookkeeping that has to survive a reload: how many breaks were taken, and when the current one began. */
type BreakState = { taken: number; breakStartedAt: number | null };
const breakKey = (sessionId: string) => `prepex.focus.pomodoro.${sessionId}`;
function readBreakState(sessionId: string): BreakState | null {
  try {
    const raw = sessionStorage.getItem(breakKey(sessionId));
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<BreakState>;
    return { taken: Number(p.taken) || 0, breakStartedAt: typeof p.breakStartedAt === "number" ? p.breakStartedAt : null };
  } catch {
    return null;
  }
}
function writeBreakState(sessionId: string, state: BreakState): void {
  try {
    sessionStorage.setItem(breakKey(sessionId), JSON.stringify(state));
  } catch {
    /* a reload mid-break just shows an ordinary pause */
  }
}

function Shell({ header, children }: { header: ReactNode; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[45] overflow-y-auto bg-background" data-testid="focus-page">
      <div className="mx-auto flex min-h-full w-full max-w-xl flex-col gap-5 px-4 pb-8 pt-[max(env(safe-area-inset-top),1rem)] sm:px-6">
        {header}
        {children}
      </div>
    </div>
  );
}

/**
 * The one focus timer, full screen. It opens pre-filled from `launch` (what the student tapped) and walks through
 * setup → running (with Pomodoro breaks) → end-of-session sheet → what was saved.
 */
export function FocusExperience({ launch }: { launch: FocusSessionIntent }) {
  const router = useRouter();
  const subjects = useSubjects();
  const focus = useFocusSession();
  const toast = useToast();

  const [stats, setStats] = useState<FocusStats | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [intentState, setIntentState] = useState<{ done: boolean; server: ResolvedIntent | null }>({ done: false, server: null });
  const [sound, setSound] = useState<SoundId>("off");
  const [blocked, setBlocked] = useState<BlockableAppId[]>([]);
  const [breakStartedAt, setBreakStartedAt] = useState<number | null>(null);
  const [sharing, setSharing] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  const soundscape = useRef<Soundscape | null>(null);
  const breaksTaken = useRef(0);
  const breakChimed = useRef(false);
  const allRoundsChimed = useRef(false);
  const hydratedFor = useRef<string | null>(null);

  const getSoundscape = useCallback(() => (soundscape.current ??= new Soundscape()), []);

  useEffect(() => {
    setSound(readStoredSound());
    setBlocked(readBlockedApps());
    return () => {
      soundscape.current?.dispose();
      void stopAppBlock();
    };
  }, []);

  const loadStats = useCallback(() => {
    getFocusStats()
      .then((res) => setStats(res.data))
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    loadStats();
  }, [loadStats]);
  useEffect(() => {
    getCurrentGoals()
      .then((res) => setGoals(res.data.goals))
      .catch(() => undefined);
  }, []);

  // Fill in whatever the link only carries an id for (the task, goal, backlog item or mistake it points at).
  const launchKey = JSON.stringify(launch);
  useEffect(() => {
    let alive = true;
    if (!needsServerIntent(launch)) {
      setIntentState({ done: true, server: null });
      return;
    }
    getFocusIntent({ origin: launch.originSource, id: launch.originId, chapter: launch.chapter })
      .then((res) => alive && setIntentState({ done: true, server: res.data }))
      // An id that no longer resolves (a removed task) still opens the timer, just without the pre-fill.
      .catch(() => alive && setIntentState({ done: true, server: null }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `launch` is covered by launchKey
  }, [launchKey]);

  const resolved = useMemo(
    () => (subjects.status === "loading" || !intentState.done ? null : resolveFocusIntent(launch, intentState.server, subjects.subjects)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `launch` is covered by launchKey
    [launchKey, intentState, subjects.status, subjects.subjects],
  );

  // After a save: refresh the footer and tell the student if they crossed a weekly goal.
  const resultId = focus.result?.focusSession.id ?? null;
  useEffect(() => {
    if (!resultId) return;
    loadStats();
    const hits = focus.result?.extras.goalHits ?? [];
    if (hits.length > 0) toast.show(hits.length === 1 ? "Goal hit! You reached a weekly goal." : `Goal hit! You reached ${hits.length} weekly goals.`, 6000);
    soundscape.current?.stop();
    void stopAppBlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires once per saved session
  }, [resultId]);

  const session = focus.session;
  const running = (focus.phase === "running" || focus.phase === "stopping") && session !== null;
  const pom = session?.pomodoro ?? DEFAULT_POMODORO;

  // Pomodoro: pick up the break count (and a break in progress) when a session is first seen, even after a reload.
  useEffect(() => {
    if (!session || hydratedFor.current === session.id) return;
    hydratedFor.current = session.id;
    breakChimed.current = false;
    allRoundsChimed.current = false;
    const stored = readBreakState(session.id);
    breaksTaken.current = stored ? stored.taken : breaksTakenBefore(pom, focus.elapsedSeconds, false);
    setBreakStartedAt(stored?.breakStartedAt ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per session id
  }, [session?.id]);

  const startBreak = useCallback(() => {
    if (!session) return;
    breaksTaken.current += 1;
    const at = Date.now();
    setBreakStartedAt(at);
    breakChimed.current = false;
    writeBreakState(session.id, { taken: breaksTaken.current, breakStartedAt: at });
    soundscape.current?.chime();
    navigator.vibrate?.(200);
    void focus.pause();
  }, [focus, session]);

  // A Pomodoro block ended: pause for the break (a pause, so the break is never counted as study time).
  useEffect(() => {
    if (focus.phase !== "running" || !session || session.mode !== "pomodoro" || session.status !== "ACTIVE" || focus.busy) return;
    if (hydratedFor.current !== session.id) return;
    if (breakDue(pom, focus.elapsedSeconds, breaksTaken.current)) startBreak();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reacts to the clock
  }, [focus.phase, focus.elapsedSeconds, focus.busy, session?.status, session?.mode]);

  const inBreak = session?.mode === "pomodoro" && session.status === "PAUSED" && breakStartedAt !== null;
  const breakLeft = inBreak && breakStartedAt !== null ? breakRemainingSeconds(pom, (focus.now - breakStartedAt) / 1000) : 0;
  useEffect(() => {
    if (inBreak && breakLeft === 0 && !breakChimed.current) {
      breakChimed.current = true;
      soundscape.current?.chime();
      navigator.vibrate?.([120, 80, 120]);
    }
  }, [inBreak, breakLeft]);

  const position = session?.mode === "pomodoro" ? pomodoroPosition(pom, focus.elapsedSeconds) : null;
  useEffect(() => {
    if (position?.finished && session?.status === "ACTIVE" && !allRoundsChimed.current) {
      allRoundsChimed.current = true;
      soundscape.current?.chime();
      toast.show("All your rounds are done. Finish up, or keep going.", 6000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the last round completes
  }, [position?.finished, session?.status]);

  // The tab title carries the clock while a session runs.
  const remaining = focus.remainingSeconds;
  useEffect(() => {
    if (focus.phase !== "running" || !session) return;
    const previous = document.title;
    const shown = session.mode === "stopwatch" ? focus.elapsedSeconds : session.mode === "pomodoro" && position && !position.finished ? position.remainingInBlock : remaining;
    const sign = session.mode !== "stopwatch" && shown < 0 ? "+" : "";
    const abs = Math.abs(shown);
    document.title = `${sign}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, "0")} · Focus`;
    return () => {
      document.title = previous;
    };
  }, [focus.phase, session, remaining, focus.elapsedSeconds, position]);

  const handleStart = useCallback(
    (input: StartFocusInput, extras: StartExtras) => {
      // Audio and fullscreen both need the tap that started the session, so they run before the request goes out.
      setSound(extras.sound);
      setBlocked(extras.blockedApps);
      getSoundscape().start(extras.sound);
      void startAppBlock(extras.blockedApps);
      breaksTaken.current = 0;
      hydratedFor.current = null;
      void focus.start(input);
    },
    [focus, getSoundscape],
  );

  const changeSound = (id: SoundId) => {
    setSound(id);
    storeSound(id);
    if (session?.status === "ACTIVE") getSoundscape().start(id);
    else soundscape.current?.stop();
  };

  const onPause = () => {
    soundscape.current?.stop();
    void focus.pause();
  };
  const onResume = async () => {
    setBreakStartedAt(null);
    if (session) writeBreakState(session.id, { taken: breaksTaken.current, breakStartedAt: null });
    if (sound !== "off") getSoundscape().start(sound);
    await focus.resume();
  };

  const startAnother = () => {
    soundscape.current?.stop();
    setShareMessage(null);
    focus.reset();
  };

  const subjectName = (id: number) => subjects.lookup.subjectName(id);

  const onShare = async () => {
    const result = focus.result;
    if (!result?.studySession) return;
    setSharing(true);
    const s = result.focusSession;
    const data = {
      minutes: result.studySession.durationMinutes,
      subjectName: subjectName(s.subjectId),
      chapterName: subjects.lookup.chapterName(s.chapterId),
      taskTypeLabel: TASK_TYPE_LABELS[s.taskType],
      streakDays: result.extras.streak.current,
      highlights: result.extras.goalHits.length > 0 ? ["Weekly goal hit"] : [],
    };
    const outcome = await shareOrSaveCard(data);
    setShareMessage(outcome.ok ? outcome.message : `${outcome.message} ${shareText(data)}`);
    setSharing(false);
  };

  const closeTimer = () => {
    const back = originBackHref(session?.originSource ?? launch.originSource);
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push(back);
  };

  const originSource = session?.originSource ?? launch.originSource;
  const chip = originChipText(originSource);
  const header = (
    <header className="flex items-center justify-between gap-3">
      <button type="button" onClick={closeTimer} aria-label={running ? "Minimise the timer" : "Close the timer"} data-testid="close-focus" className="flex size-11 items-center justify-center rounded-full border border-brand/15 bg-surface text-[20px] text-ink hover:bg-tint-strong">
        <span aria-hidden>{running ? "▾" : "✕"}</span>
      </button>
      {chip ? (
        <span data-testid="origin-chip" className="truncate rounded-full bg-tint-strong px-3 py-1.5 text-[12px] font-bold text-ink dark:bg-[#FAF7F214]">
          {chip}
        </span>
      ) : (
        <h1 className="text-[16px] font-extrabold text-ink">Focus</h1>
      )}
      <StreakChip streak={stats?.streak ?? focus.result?.extras.streak ?? null} />
    </header>
  );

  if (focus.phase === "loading" || subjects.status === "loading" || (focus.phase === "idle" && !resolved)) {
    return (
      <Shell header={header}>
        <PageLoader label="Getting your focus space ready…" />
      </Shell>
    );
  }

  const planned = session?.plannedMinutes ?? 0;
  const mode = session?.mode ?? "countdown";
  const overtime = running && mode !== "stopwatch" && !inBreak && (mode === "pomodoro" ? Boolean(position?.finished) && remaining < 0 : remaining < 0);
  const chapterName = session ? subjects.lookup.chapterName(session.chapterId) : null;
  const stripGoal = session ? goalStripFor(goals, session.subjectId, session.chapterId, subjectName(session.subjectId)) : null;

  let ringLabel = "";
  let ringCaption: ReactNode = "";
  let ringProgressValue = 0;
  if (session) {
    if (inBreak) {
      ringLabel = formatClock(breakLeft);
      ringCaption = breakLeft === 0 ? "Break's over. Resume when you're ready." : "Break time. Breathe, stretch, sip some water.";
      ringProgressValue = 1 - breakLeft / Math.max(1, pom.breakMinutes * 60);
    } else if (mode === "stopwatch") {
      ringLabel = formatClock(focus.elapsedSeconds);
      ringCaption = session.status === "PAUSED" ? "Paused" : "Stopwatch";
      ringProgressValue = (focus.elapsedSeconds % 3600) / 3600;
    } else if (mode === "pomodoro" && position) {
      ringLabel = position.finished ? formatClock(Math.min(remaining, 0)) : formatClock(position.remainingInBlock);
      ringCaption = session.status === "PAUSED" ? "Paused" : position.finished ? "All rounds done. Wrap up when you're ready" : `Round ${position.cycle} of ${position.cycles}`;
      ringProgressValue = position.finished ? 1 : position.secondsIntoBlock / position.blockSeconds;
    } else {
      ringLabel = formatClock(remaining);
      ringCaption = session.status === "PAUSED" ? "Paused" : overtime ? "Overtime. Wrap up when you're ready" : `of ${formatMinutes(planned)}`;
      ringProgressValue = ringProgress(planned, focus.elapsedSeconds);
    }
  }

  return (
    <Shell header={header}>
      <Toast state={toast} />

      {focus.phase === "idle" && resolved && (
        <FocusSetup key={launchKey} subjects={subjects.subjects} initial={resolved} busy={focus.busy} error={subjects.status === "error" ? "We couldn't load your subjects. Please refresh the page." : focus.error} onStart={handleStart} />
      )}

      {running && session && (
        <section aria-label="Focus session" className="flex flex-col items-center gap-5 rounded-2xl border border-brand/10 bg-surface p-4 py-6 sm:p-6" data-testid="focus-running">
          <div className="flex flex-wrap items-center justify-center gap-2 text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-tint-strong px-3 py-1.5 text-[13px] font-bold text-ink dark:bg-[#FAF7F214]">
              <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: subjectColor(session.subjectId) }} />
              {subjectName(session.subjectId)}
              {chapterName ? ` · ${chapterName}` : ""}
            </span>
            {session.topic && <span className="text-[13px] font-semibold text-muted">{session.topic}</span>}
            <span className="rounded-full border border-brand/15 px-2.5 py-1 text-[11px] font-bold text-muted" data-testid="running-meta">
              {TASK_TYPE_LABELS[session.taskType]} · {MODE_LABELS[session.mode]}
            </span>
          </div>

          <FocusRing
            progress={ringProgressValue}
            label={ringLabel}
            paused={session.status === "PAUSED" && !inBreak}
            onBreak={inBreak}
            overtime={overtime}
            caption={ringCaption}
            ariaLabel={`${subjectName(session.subjectId)} focus timer. ${inBreak ? "On a break." : session.status === "PAUSED" ? "Paused." : ""} ${ringLabel}${mode === "stopwatch" ? " elapsed" : overtime ? " over" : " left"}.`}
          />

          {stripGoal && (
            <p data-testid="goal-strip" className="w-full rounded-xl bg-tint-strong px-3 py-2 text-center text-[13px] font-bold text-ink dark:bg-[#FAF7F214]">
              {stripGoal.text}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-center gap-2 text-[12px] font-semibold text-muted">
            <span data-testid="interruptions">Distractions: {session.interruptionCount}</span>
            {session.deepFocusMode && <span className="rounded-full bg-tint-strong px-2 py-0.5 text-ink dark:bg-[#FAF7F214]">Deep Focus</span>}
          </div>

          {focus.error && (
            <p role="alert" className="w-full rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">
              {focus.error}
            </p>
          )}

          <div className="flex w-full items-center justify-center gap-6">
            <button
              type="button"
              data-testid="stop-focus"
              disabled={focus.busy}
              onClick={focus.requestStop}
              className="min-h-14 min-w-20 rounded-full border border-[#1A1A4E] bg-[#1A1A4E] px-5 text-[15px] font-bold text-white hover:opacity-90 disabled:opacity-60 dark:border-[#FAF7F2] dark:bg-[#FAF7F2] dark:text-[#1A1A4E]"
            >
              End
            </button>
            {session.status === "PAUSED" ? (
              <button
                type="button"
                data-testid="resume-focus"
                disabled={focus.busy}
                onClick={() => void onResume()}
                aria-label={inBreak ? "Resume focusing" : "Resume"}
                className="flex size-[88px] items-center justify-center rounded-full border border-primary-button-border bg-cta text-[16px] font-extrabold text-white shadow-modal hover:bg-[#E8623F] active:scale-95 disabled:opacity-60"
              >
                Resume
              </button>
            ) : (
              <button
                type="button"
                data-testid="pause-focus"
                disabled={focus.busy}
                onClick={onPause}
                aria-label="Pause"
                className="flex size-[88px] items-center justify-center rounded-full border-[1.5px] border-secondary-button-border bg-surface text-[16px] font-extrabold text-ink shadow-modal hover:bg-tint-strong active:scale-95 disabled:opacity-60"
              >
                Pause
              </button>
            )}
            <span aria-hidden className="min-w-20" />
          </div>

          <div className="flex w-full flex-col gap-4 border-t border-brand/10 pt-4">
            <AppBlockIndicator blocked={blocked} />
            <SoundPicker value={sound} onChange={changeSound} />
          </div>
        </section>
      )}

      {focus.phase === "done" && (
        <SessionDone
          result={focus.result}
          saving={focus.saving}
          subjectName={focus.result ? subjectName(focus.result.focusSession.subjectId) : ""}
          chapterName={focus.result ? subjects.lookup.chapterName(focus.result.focusSession.chapterId) : null}
          originSource={focus.result?.focusSession.originSource ?? originSource}
          shareMessage={shareMessage}
          sharing={sharing}
          onAnother={startAnother}
          onShare={() => void onShare()}
          onCheckIn={() => router.push("/home")}
        />
      )}

      {focus.saving && focus.phase === "done" && (
        <p role="status" data-testid="retry-toast" className="rounded-xl bg-warning-bg px-3 py-2 text-center text-[13px] font-semibold text-ink">
          Session not fully saved. Retrying…
        </p>
      )}

      {focus.phase !== "stopping" && focus.phase !== "running" && <StatsFooter stats={stats} />}

      {focus.phase === "stopping" && session && (
        <FocusSummaryModal
          open
          plannedMinutes={session.plannedMinutes}
          elapsedSeconds={focus.elapsedSeconds}
          interruptions={session.interruptionCount}
          taskType={session.taskType}
          originSource={session.originSource}
          hasChapter={session.chapterId !== null}
          busy={focus.busy}
          error={focus.error}
          onKeepGoing={focus.cancelStop}
          onSave={(input) => void focus.confirmStop(input)}
        />
      )}

      {focus.phase === "running" && focus.away && (
        <AwayNag awayMs={focus.away.ms} blocked={blocked} onBack={focus.dismissAway} />
      )}

      <p className="text-center text-[12px] text-muted">
        <Link href="/sessions" className="underline-offset-2 hover:underline">
          Study log
        </Link>
      </p>
    </Shell>
  );
}
