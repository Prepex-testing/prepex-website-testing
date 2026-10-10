"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api/http";
import {
  getActiveFocusSession,
  pauseFocusSession,
  recordFocusInterruption,
  resumeFocusSession,
  startFocusSession,
  stopFocusSession,
  type FocusSession,
  type StartFocusInput,
  type StudyLogRow,
} from "@/lib/api/focus";
import { INTERRUPTION_DEBOUNCE_MS, liveElapsedSeconds, remainingSeconds } from "@/lib/study/timer";

export type FocusPhase = "loading" | "idle" | "running" | "stopping" | "done";

export type FocusResult = { focusSession: FocusSession; studySession: StudyLogRow | null };

function messageOf(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

/**
 * Everything the Focus screen needs: it hydrates a session that is already running (another tab,
 * a reload), keeps the clock honest from server-measured seconds, counts interruptions when the tab
 * is hidden, and — in Deep Focus — warns before the page is closed and asks for fullscreen.
 */
export function useFocusSession() {
  const [phase, setPhase] = useState<FocusPhase>("loading");
  const [session, setSession] = useState<FocusSession | null>(null);
  const [receivedAt, setReceivedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FocusResult | null>(null);

  const sessionRef = useRef<FocusSession | null>(null);
  const lastInterruptionAt = useRef(0);

  const adopt = useCallback((next: FocusSession | null) => {
    sessionRef.current = next;
    setSession(next);
    setReceivedAt(Date.now());
    setNow(Date.now());
  }, []);

  // Hydrate a session that is already running.
  useEffect(() => {
    let alive = true;
    getActiveFocusSession()
      .then((res) => {
        if (!alive) return;
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
    };
  }, [adopt]);

  // Frozen while the summary is open, so the numbers the student is judging do not move under them.
  const ticking = phase === "running" && session?.status === "ACTIVE";

  // Re-render twice a second while the clock is moving.
  useEffect(() => {
    if (!ticking) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [ticking]);

  const elapsedSeconds = session ? liveElapsedSeconds(session, receivedAt, now) : 0;
  const remaining = session ? remainingSeconds(session.plannedMinutes, elapsedSeconds) : 0;

  // Tab title shows the clock while running.
  useEffect(() => {
    if (phase !== "running" || !session) return;
    const previous = document.title;
    const sign = remaining < 0 ? "+" : "";
    const abs = Math.abs(remaining);
    document.title = `${sign}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, "0")} · Focus`;
    return () => {
      document.title = previous;
    };
  }, [phase, session, remaining]);

  // Interruptions: the student left the tab/app while the clock was running.
  useEffect(() => {
    if (phase !== "running") return;
    const onVisibility = () => {
      const current = sessionRef.current;
      if (!document.hidden || !current || current.status !== "ACTIVE") return;
      const t = Date.now();
      if (t - lastInterruptionAt.current < INTERRUPTION_DEBOUNCE_MS) return;
      lastInterruptionAt.current = t;
      setSession((s) => (s ? { ...s, interruptionCount: s.interruptionCount + 1 } : s));
      recordFocusInterruption(current.id).catch(() => {
        /* the local count already moved; a missed server count is not worth interrupting the student */
      });
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

  const leaveFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
  }, []);

  const start = useCallback(
    async (input: StartFocusInput) => {
      setBusy(true);
      setError(null);
      // Fullscreen needs the click's user gesture, so ask before awaiting the network.
      if (input.deepFocusMode) void document.documentElement.requestFullscreen?.().catch(() => undefined);
      try {
        const res = await startFocusSession(input);
        lastInterruptionAt.current = 0;
        adopt(res.data);
        setResult(null);
        setPhase("running");
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
      adopt((await pauseFocusSession(current.id)).data);
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
      adopt((await resumeFocusSession(current.id)).data);
    } catch (err) {
      setError(messageOf(err, "Couldn't resume. Please try again."));
    } finally {
      setBusy(false);
    }
  }, [adopt, busy]);

  /** Opens the summary. The clock is frozen locally while it is open so the numbers do not move. */
  const requestStop = useCallback(() => {
    setNow(Date.now());
    setPhase("stopping");
  }, []);

  const cancelStop = useCallback(() => setPhase("running"), []);

  const confirmStop = useCallback(
    async (wasCompleted: boolean) => {
      const current = sessionRef.current;
      if (!current) return;
      setBusy(true);
      setError(null);
      try {
        const res = await stopFocusSession(current.id, { wasCompleted });
        leaveFullscreen();
        sessionRef.current = null;
        setSession(null);
        setResult(res.data);
        setPhase("done");
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          // It already ended (another tab): treat as finished.
          leaveFullscreen();
          sessionRef.current = null;
          setSession(null);
          setPhase("idle");
          return;
        }
        setError(messageOf(err, "Couldn't save the session. Please try again."));
      } finally {
        setBusy(false);
      }
    },
    [leaveFullscreen],
  );

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setPhase("idle");
  }, []);

  return {
    phase,
    session,
    elapsedSeconds,
    remainingSeconds: remaining,
    busy,
    error,
    result,
    start,
    pause,
    resume,
    requestStop,
    cancelStop,
    confirmStop,
    reset,
  };
}
