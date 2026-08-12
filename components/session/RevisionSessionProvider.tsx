"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { getCheckInStatus } from "@/lib/api/checkin";
import { startRevisionSession, heartbeatRevisionSession, exitRevisionSession } from "@/lib/api/revision";
import { getAccessToken, getStoredUser } from "@/lib/auth/session";
import { secondsSince } from "@/lib/utils/datetime";

const STORAGE_KEY = "prepex_revision_session";
const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;

type StoredSession = {
  taskId: string;
  startedAt: string;
  targetDuration: number;
  taskTitle: string;
  subjectName: string;
  subjectLabel: string;
  baseElapsedSeconds: number;
};

type RevisionSessionState = {
  isActive: boolean;
  taskId: string | null;
  userId: string | null;
  startedAt: string | null;
  elapsedSeconds: number;
  baseElapsedSeconds: number;
  targetDuration: number;
  taskTitle: string;
  subjectName: string;
  subjectLabel: string;
};

const INITIAL_STATE: RevisionSessionState = {
  isActive: false,
  taskId: null,
  userId: null,
  startedAt: null,
  elapsedSeconds: 0,
  baseElapsedSeconds: 0,
  targetDuration: 0,
  taskTitle: "",
  subjectName: "",
  subjectLabel: "",
};

type StartSessionInput = {
  taskId: string;
  targetDuration: number;
  taskTitle?: string;
  subjectName?: string;
  subjectLabel?: string;
  /** Seconds to seed the timer with — e.g. a task's already-banked secondsCompleted. */
  initialElapsedSeconds?: number;
};

type RevisionSessionContextValue = RevisionSessionState & {
  startSession: (input: StartSessionInput) => Promise<void>;
  exitSession: () => Promise<void>;
  clearSession: () => void;
};

const RevisionSessionContext = createContext<RevisionSessionContextValue | null>(null);

function readStoredSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

function writeStoredSession(session: StoredSession) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Best-effort — the timer still works for this tab's lifetime without persistence.
  }
}

function clearStoredSession() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Best-effort.
  }
}

export function RevisionSessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RevisionSessionState>(INITIAL_STATE);
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // GET /checkin/status is the backend source of truth: on load, only trust a
  // locally cached session (taskId/startedAt aren't exposed by that endpoint
  // yet) when the server also confirms a session is active. This provider is
  // mounted in the root layout (every route, including public ones like
  // /splash and /welcome), so skip the call entirely when logged out —
  // otherwise the 401 with no refresh token forces a hard redirect to
  // /login off of pages that never should have required auth.
  useEffect(() => {
    if (!getAccessToken()) return;

    getCheckInStatus()
      .then(({ data }) => {
        const isActiveSession = Boolean(data.checkin?.isActiveSession);
        if (!isActiveSession) {
          clearStoredSession();
          setState(INITIAL_STATE);
          return;
        }

        const cached = readStoredSession();
        if (!cached) return;

        const baseElapsedSeconds = cached.baseElapsedSeconds ?? 0;
        setState({
          isActive: true,
          taskId: cached.taskId,
          userId: getStoredUser()?.id ?? null,
          startedAt: cached.startedAt,
          elapsedSeconds: baseElapsedSeconds + secondsSince(cached.startedAt),
          baseElapsedSeconds,
          targetDuration: cached.targetDuration,
          taskTitle: cached.taskTitle,
          subjectName: cached.subjectName,
          subjectLabel: cached.subjectLabel,
        });
      })
      .catch(() => {
        // Best-effort — if status can't be reached, keep whatever local state exists.
      });
  }, []);

  // Timer recomputed from Date.now() - startedAt every tick, avoiding drift.
  useEffect(() => {
    if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
    if (!state.isActive || !state.startedAt) return;

    const startedAt = state.startedAt;
    const tick = () => {
      setState((current) =>
        current.isActive
          ? { ...current, elapsedSeconds: current.baseElapsedSeconds + secondsSince(startedAt) }
          : current,
      );
    };
    tick();
    tickIntervalRef.current = setInterval(tick, 1000);
    return () => {
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
    };
  }, [state.isActive, state.startedAt]);

  // Heartbeat pings every 5 minutes while a session is active, stops on exit.
  useEffect(() => {
    if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    if (!state.isActive || !state.taskId) return;

    const taskId = state.taskId;
    heartbeatIntervalRef.current = setInterval(() => {
      heartbeatRevisionSession(taskId).catch(() => {
        // Best-effort — the next heartbeat tick will retry.
      });
    }, HEARTBEAT_INTERVAL_MS);
    return () => {
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    };
  }, [state.isActive, state.taskId]);

  const startSession = useCallback(async (input: StartSessionInput) => {
    await startRevisionSession(input.taskId);
    const startedAt = new Date().toISOString();
    const baseElapsedSeconds = Math.max(input.initialElapsedSeconds ?? 0, 0);
    const session: StoredSession = {
      taskId: input.taskId,
      startedAt,
      targetDuration: input.targetDuration,
      taskTitle: input.taskTitle ?? "",
      subjectName: input.subjectName ?? "",
      subjectLabel: input.subjectLabel ?? "",
      baseElapsedSeconds,
    };
    writeStoredSession(session);
    setState({
      isActive: true,
      taskId: session.taskId,
      userId: getStoredUser()?.id ?? null,
      startedAt: session.startedAt,
      elapsedSeconds: baseElapsedSeconds,
      baseElapsedSeconds,
      targetDuration: session.targetDuration,
      taskTitle: session.taskTitle,
      subjectName: session.subjectName,
      subjectLabel: session.subjectLabel,
    });
  }, []);

  const exitSession = useCallback(async () => {
    const taskId = state.taskId;
    const secondsCompleted = state.elapsedSeconds;
    clearStoredSession();
    setState(INITIAL_STATE);
    if (taskId) {
      try {
        await exitRevisionSession(taskId, secondsCompleted);
      } catch {
        // Best-effort — local state is already cleared.
      }
    }
  }, [state.taskId, state.elapsedSeconds]);

  // Resets local/persisted state without an API call — for flows (like
  // mark-done) that already told the backend the session ended.
  const clearSession = useCallback(() => {
    clearStoredSession();
    setState(INITIAL_STATE);
  }, []);

  return (
    <RevisionSessionContext.Provider value={{ ...state, startSession, exitSession, clearSession }}>
      {children}
    </RevisionSessionContext.Provider>
  );
}

export function useRevisionSession() {
  const context = useContext(RevisionSessionContext);
  if (!context) throw new Error("useRevisionSession must be used within a RevisionSessionProvider");
  return context;
}
