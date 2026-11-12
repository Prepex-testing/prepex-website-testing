"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as Sentry from "@sentry/nextjs";
import { ApiError } from "@/lib/api/http";
import { buildPlan, getPlanDay, type PlanDay } from "@/lib/api/plannerV2";
import { currentUserId } from "@/lib/api/authRequest";

export type PlanDayState =
  | { status: "loading"; day: null; error: null }
  | { status: "ready"; day: PlanDay; error: null }
  | { status: "error"; day: PlanDay | null; error: string };

function messageOf(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

/** Why a planner call failed, in a few words, for the logs. */
export function failureReason(err: unknown): string {
  if (err instanceof ApiError)
    return `${err.status} ${err.message}`.slice(0, 200);
  if (err instanceof Error) return `${err.name}: ${err.message}`.slice(0, 200);
  return "unknown";
}

/**
 * A planner failure never reaches the student as a crash; it is logged with who it happened to and why (A2), so a
 * "Couldn't build your plan" can be traced to its cause.
 */
function reportPlannerFailure(
  err: unknown,
  step: "load" | "build",
  attempt: number,
): void {
  try {
    const userId = currentUserId();
    const reason = failureReason(err);
    Sentry.captureException(err, {
      tags: { area: "planner", step, attempt: String(attempt) },
      user: userId ? { id: userId } : undefined,
      extra: { userId, reason },
    });
    console.warn("[planner] failed", { step, attempt, userId, reason });
  } catch {
    /* logging must never throw */
  }
}

/** A2: one automatic retry after a short pause before the student sees "Couldn't build your plan". */
const AUTO_RETRY_DELAY_MS = 1_200;
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * One day of the planner. A failure never throws into the page: `status` becomes "error" with a calm message and a
 * `retry`, and a day that was already on screen stays visible underneath it.
 */
export function usePlanDay(date: string | undefined) {
  const [state, setState] = useState<PlanDayState>({
    status: "loading",
    day: null,
    error: null,
  });
  const [building, setBuilding] = useState(false);
  const alive = useRef(true);
  const latest = useRef<PlanDay | null>(null);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    for (let attempt = 1; ; attempt += 1) {
      try {
        const res = await getPlanDay(date);
        if (!alive.current) return;
        latest.current = res.data;
        setState({ status: "ready", day: res.data, error: null });
        return;
      } catch (err) {
        if (!alive.current) return;
        reportPlannerFailure(err, "load", attempt);
        // a 4xx is a real answer; anything else gets one more try before the error shows
        const final =
          attempt >= 2 ||
          (err instanceof ApiError &&
            err.status >= 400 &&
            err.status < 500 &&
            err.status !== 408 &&
            err.status !== 429);
        if (!final) {
          await pause(AUTO_RETRY_DELAY_MS);
          if (!alive.current) return;
          continue;
        }
        setState({
          status: "error",
          day: latest.current,
          error: messageOf(err, "Couldn't build your plan — tap retry."),
        });
        return;
      }
    }
  }, [date]);

  useEffect(() => {
    latest.current = null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset while a different day loads
    setState({ status: "loading", day: null, error: null });
    void refresh();
  }, [refresh]);

  /** Builds (SCHEDULED) or rebuilds (REGENERATE) the day, then shows it. Returns an error message, or null. */
  const build = useCallback(
    async (
      reason: "SCHEDULED" | "REGENERATE",
      regenReason?: string,
    ): Promise<string | null> => {
      setBuilding(true);
      for (let attempt = 1; ; attempt += 1)
        try {
          const res = await buildPlan({
            reason,
            ...(date ? { date } : {}),
            ...(regenReason ? { regenReason } : {}),
          });
          if (!alive.current) return null;
          setBuilding(false);
          if (res.data.day) {
            latest.current = res.data.day;
            setState({ status: "ready", day: res.data.day, error: null });
          } else {
            await refresh();
          }
          return null;
        } catch (err) {
          reportPlannerFailure(err, "build", attempt);
          const final =
            attempt >= 2 ||
            (err instanceof ApiError &&
              err.status >= 400 &&
              err.status < 500 &&
              err.status !== 408 &&
              err.status !== 429);
          if (!final && alive.current) {
            await pause(AUTO_RETRY_DELAY_MS);
            continue;
          }
          if (alive.current) setBuilding(false);
          return messageOf(err, "Couldn't build your plan — tap retry.");
        }
    },
    [date, refresh],
  );

  return { ...state, building, refresh, build };
}
