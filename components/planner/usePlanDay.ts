"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as Sentry from "@sentry/nextjs";
import { ApiError } from "@/lib/api/http";
import { buildPlan, getPlanDay, type PlanDay } from "@/lib/api/plannerV2";

export type PlanDayState =
  | { status: "loading"; day: null; error: null }
  | { status: "ready"; day: PlanDay; error: null }
  | { status: "error"; day: PlanDay | null; error: string };

function messageOf(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

/** A planner failure never reaches the student as a crash; it is logged to Sentry so it can be fixed. */
function reportPlannerFailure(err: unknown, step: "load" | "build"): void {
  try {
    Sentry.captureException(err, { tags: { area: "planner", step } });
  } catch {
    /* logging must never throw */
  }
}

/**
 * One day of the planner. A failure never throws into the page: `status` becomes "error" with a calm message and a
 * `retry`, and a day that was already on screen stays visible underneath it.
 */
export function usePlanDay(date: string | undefined) {
  const [state, setState] = useState<PlanDayState>({ status: "loading", day: null, error: null });
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
    try {
      const res = await getPlanDay(date);
      if (!alive.current) return;
      latest.current = res.data;
      setState({ status: "ready", day: res.data, error: null });
    } catch (err) {
      if (!alive.current) return;
      reportPlannerFailure(err, "load");
      setState({ status: "error", day: latest.current, error: messageOf(err, "Couldn't build your plan — tap retry.") });
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
    async (reason: "SCHEDULED" | "REGENERATE", regenReason?: string): Promise<string | null> => {
      setBuilding(true);
      try {
        const res = await buildPlan({ reason, ...(date ? { date } : {}), ...(regenReason ? { regenReason } : {}) });
        if (!alive.current) return null;
        if (res.data.day) {
          latest.current = res.data.day;
          setState({ status: "ready", day: res.data.day, error: null });
        } else {
          await refresh();
        }
        return null;
      } catch (err) {
        reportPlannerFailure(err, "build");
        return messageOf(err, "Couldn't build your plan — tap retry.");
      } finally {
        if (alive.current) setBuilding(false);
      }
    },
    [date, refresh],
  );

  return { ...state, building, refresh, build };
}
