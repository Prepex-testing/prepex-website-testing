"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api/http";
import {
  createFocusSession,
  getActiveFocusSession,
  pauseFocusSession,
  recordFocusInterruption,
  resumeFocusSession,
  stopFocusSession,
  type FocusSession,
  type StartFocusInput,
  type StopFocusInput,
  type StopFocusResult,
} from "@/lib/api/focus";
import { NAG_AFTER_AWAY_MS } from "@/lib/focus/appBlock";
import {
  MAX_RETRY_ATTEMPTS,
  clearPendingStop,
  isRetryable,
  readPendingStop,
  retryDelayMs,
  writePendingStop,
} from "@/lib/focus/pendingStop";
import { trackFocusEvent } from "@/lib/focus/telemetry";
import { INTERRUPTION_DEBOUNCE_MS, liveElapsedSeconds, remainingSeconds } from "@/lib/study/timer";

/**
 * loading   asking the server whether a session is already running
 * idle      nothing running: the setup form
 * running   a session is running (or paused, or on a Pomodoro break)
 * stopping  the end-of-session sheet is open; the clock is frozen
 * done      the session is over. `result` is what was saved, or null while the save is still being retried
 */
export type FocusPhase = "loading" | "idle" | "running" | "stopping" | "done";

function messageOf(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

/** Fields that can make the server reject a save; dropped on the last try so the session itself is never lost. */
function withoutSheet(input: StopFocusInput): StopFocusInput {
  return { wasCompleted: input.wasCompleted, moodRating: input.moodRating ?? null, confidenceRating: input.confidenceRating ?? null, notes: input.notes ?? null };
}

/**
 * Everything the timer screen needs: it hydrates a session that is already running (another tab, a reload), keeps the
 * clock honest from server-measured seconds, counts interruptions when the tab is hidden, and — in Deep Focus — warns
 * before the page is closed and asks for fullscreen. Finishing is one request that the server saves all-or-nothing; when
 * it cannot be sent, the answers are kept and re-sent in the background until they land.
 */
export function useFocusSession() {
  const [phase, setPhase] = useState<FocusPhase>("loading");
  const [session, setSession] = useState<FocusSession | null>(null);
  const [receivedAt, setReceivedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StopFocusResult | null>(null);
  /** The save has not gone through yet and is being retried in the background. */
  const [saving, setSaving] = useState(false);
  /** The student came back to the tab after being away from it (for the web "nag" overlay). */
  const [away, setAway] = useState<{ ms: number } | null>(null);

  const sessionRef = useRef<FocusSession | null>(null);
  const lastInterruptionAt = useRef(0);
  const hiddenAt = useRef<number | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmounted = useRef(false);
  /** The latest `trySave`, so a scheduled retry can call itself without referring to a const that is not declared yet. */
  const trySaveRef = useRef<((sessionId: string, input: StopFocusInput, attempts: number) => Promise<void>) | null>(null);

  const adopt = useCallback((next: FocusSession | null) => {
    sessionRef.current = next;
    setSession(next);
    setReceivedAt(Date.now());
    setNow(Date.now());
  }, []);

  const leaveFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
  }, []);

  // --- finishing: send, and keep sending until it lands -----------------------------------------------------------------
  const finish = useCallback(
    (res: StopFocusResult) => {
      clearPendingStop();
      leaveFullscreen();
      sessionRef.current = null;
      setSession(null);
      setResult(res);
      setSaving(false);
      setPhase("done");
      const s = res.focusSession;
      const base = { sessionId: s.id, originSource: s.originSource, taskType: s.taskType, mode: s.mode, actualMinutes: s.actualMinutes ?? 0 };
      trackFocusEvent("focus_session_end", base);
      if (s.wasCompleted) trackFocusEvent("focus_session_complete", base);
      for (const kind of res.completion.logsWritten) trackFocusEvent("focus_session_log_written", { ...base, log: kind });
    },
    [leaveFullscreen],
  );

  const trySave = useCallback(
    async (sessionId: string, input: StopFocusInput, attempts: number) => {
      if (unmounted.current) return;
      try {
        const res = await stopFocusSession(sessionId, input);
        finish(res.data);
      } catch (err) {
        if (unmounted.current) return;
        if (err instanceof ApiError && err.status === 409) {
          // It already ended (another tab, or the first try landed after all): nothing left to save.
          clearPendingStop();
          leaveFullscreen();
          sessionRef.current = null;
          setSession(null);
          setSaving(false);
          setPhase("done");
          return;
        }
        if (isRetryable(err) && attempts + 1 < MAX_RETRY_ATTEMPTS) {
          const next = attempts + 1;
          writePendingStop({ sessionId, input, attempts: next, savedAt: Date.now() });
          setSaving(true);
          setBusy(false);
          setPhase("done");
          retryTimer.current = setTimeout(() => void trySaveRef.current?.(sessionId, next >= MAX_RETRY_ATTEMPTS - 1 ? withoutSheet(input) : input, next), retryDelayMs(attempts));
          return;
        }
        // The server rejected it for good (a bad sheet, say): keep the student on the sheet to fix it.
        clearPendingStop();
        setSaving(false);
        setBusy(false);
        setError(messageOf(err, "Couldn't save the session. Please try again."));
        setPhase("stopping");
      }
    },
    [finish, leaveFullscreen],
  );

  useEffect(() => {
    trySaveRef.current = trySave;
  }, [trySave]);

  // Hydrate a session that is already running, and pick up a save that was still being retried when the page closed.
  useEffect(() => {
    unmounted.current = false;
    let alive = true;
    getActiveFocusSession()
      .then((res) => {
        if (!alive) return;
        const pending = readPendingStop();
        if (res.data.session && pending && pending.sessionId === res.data.session.id) {
          adopt(res.data.session);
          setSaving(true);
          setPhase("done");
          void trySave(pending.sessionId, pending.input, pending.attempts);
          return;
        }
        if (pending) clearPendingStop(); // it ended some other way: nothing left to retry
        if (res.data.session) {
          adopt(res.data.session);
          setPhase("running");
        } else {
          setPhase("idle");
        }
      })
      .catch((err) => {
        if (!alive) return;
        setError(messageOf(err, "We couldn't check for a running focus session. Please refresh."));
        setPhase("idle");
      });
    return () => {
      alive = false;
      unmounted.current = true;
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, [adopt, trySave]);

  // Frozen while the summary is open, so the numbers the student is judging do not move under them.
  const ticking = phase === "running" && session?.status === "ACTIVE";

  // Re-render twice a second while the clock is moving (and once a second during a break, when the break clock is shown).
  const onBreakOrPaused = phase === "running" && session?.status === "PAUSED";
  useEffect(() => {
    if (!ticking && !onBreakOrPaused) return;
    const id = window.setInterval(() => setNow(Date.now()), ticking ? 500 : 1000);
    return () => window.clearInterval(id);
  }, [ticking, onBreakOrPaused]);

  const elapsedSeconds = session ? liveElapsedSeconds(session, receivedAt, now) : 0;
  const remaining = session ? remainingSeconds(session.plannedMinutes, elapsedSeconds) : 0;

  // Interruptions and the "welcome back" nag: the student left the tab/app while the clock was running.
  useEffect(() => {
    if (phase !== "running") return;
    const onVisibility = () => {
      const current = sessionRef.current;
      if (document.hidden) {
        if (current?.status === "ACTIVE") hiddenAt.current = Date.now();
        else hiddenAt.current = null;
        if (!current || current.status !== "ACTIVE") return;
        const t = Date.now();
        if (t - lastInterruptionAt.current < INTERRUPTION_DEBOUNCE_MS) return;
        lastInterruptionAt.current = t;
        setSession((s) => (s ? { ...s, interruptionCount: s.interruptionCount + 1 } : s));
        recordFocusInterruption(current.id).catch(() => {
          /* the local count already moved; a missed server count is not worth interrupting the student */
        });
        return;
      }
      const left = hiddenAt.current;
      hiddenAt.current = null;
      if (left !== null && current?.status === "ACTIVE") {
        const ms = Date.now() - left;
        if (ms >= NAG_AFTER_AWAY_MS) setAway({ ms });
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [phase]);

  // Deep Focus: warn before the page is closed or reloaded.
  const deep = phase === "running" && session?.deepFocusMode === true;
  useEffect(() => {
    if (!deep) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [deep]);

  // Keep the screen awake while the clock runs (where the browser allows it).
  useEffect(() => {
    if (phase !== "running" || session?.status !== "ACTIVE") return;
    let lock: WakeLockSentinel | null = null;
    let released = false;
    navigator.wakeLock
      ?.request("screen")
      .then((sentinel) => {
        if (released) void sentinel.release();
        else lock = sentinel;
      })
      .catch(() => {
        /* not supported or denied: harmless */
      });
    return () => {
      released = true;
      void lock?.release();
    };
  }, [phase, session?.status]);

  const start = useCallback(
    async (input: StartFocusInput) => {
      setBusy(true);
      setError(null);
      // Fullscreen needs the click's user gesture, so ask before awaiting the network.
      if (input.deepFocusMode) void document.documentElement.requestFullscreen?.().catch(() => undefined);
      try {
        const res = await createFocusSession(input);
        lastInterruptionAt.current = 0;
        adopt(res.data);
        setResult(null);
        setAway(null);
        setPhase("running");
        trackFocusEvent("focus_session_start", {
          sessionId: res.data.id,
          originSource: res.data.originSource,
          taskType: res.data.taskType,
          mode: res.data.mode,
          plannedMinutes: res.data.plannedMinutes,
        });
      } catch (err) {
        leaveFullscreen();
        // Someone (another tab) already started one: pick it up instead of leaving the student stuck.
        if (err instanceof ApiError && err.status === 409) {
          const active = await getActiveFocusSession().catch(() => null);
          if (active?.data.session) {
            adopt(active.data.session);
            setPhase("running");
            return;
          }
        }
        setError(messageOf(err, "Couldn't start the session. Please try again."));
      } finally {
        setBusy(false);
      }
    },
    [adopt, leaveFullscreen],
  );

  const pause = useCallback(async () => {
    const current = sessionRef.current;
    if (!current || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await pauseFocusSession(current.id);
      adopt(res.data);
      trackFocusEvent("focus_session_pause", { sessionId: current.id, taskType: current.taskType, mode: current.mode });
    } catch (err) {
      setError(messageOf(err, "Couldn't pause. Please try again."));
    } finally {
      setBusy(false);
    }
  }, [adopt, busy]);

  const resume = useCallback(async () => {
    const current = sessionRef.current;
    if (!current || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await resumeFocusSession(current.id);
      adopt(res.data);
      setAway(null);
      trackFocusEvent("focus_session_resume", { sessionId: current.id, taskType: current.taskType, mode: current.mode });
    } catch (err) {
      setError(messageOf(err, "Couldn't resume. Please try again."));
    } finally {
      setBusy(false);
    }
  }, [adopt, busy]);

  /** Opens the end-of-session sheet. The clock is frozen locally while it is open so the numbers do not move. */
  const requestStop = useCallback(() => {
    setNow(Date.now());
    setPhase("stopping");
  }, []);

  const cancelStop = useCallback(() => {
    setError(null);
    setPhase("running");
  }, []);

  const confirmStop = useCallback(
    async (input: StopFocusInput) => {
      const current = sessionRef.current;
      if (!current) return;
      setBusy(true);
      setError(null);
      await trySave(current.id, input, 0);
      setBusy(false);
    },
    [trySave],
  );

  const dismissAway = useCallback(() => setAway(null), []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setSaving(false);
    setAway(null);
    setPhase("idle");
  }, []);

  return {
    phase,
    session,
    elapsedSeconds,
    remainingSeconds: remaining,
    /** Date.now() as of the last render tick; lets the screen time a break without its own interval. */
    now,
    busy,
    error,
    result,
    saving,
    away,
    start,
    pause,
    resume,
    requestStop,
    cancelStop,
    confirmStop,
    dismissAway,
    reset,
  };
}
