"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { withRetry } from "@/lib/api/retry";

/**
 * Onboarding v2, A1: one Home tile's data. It shows the last good answer straight away (from this tab's memory)
 * while a fresh one loads, retries passing failures with backoff, and only reports an error once every try has
 * failed and there is nothing real to show. It never invents a value: no data means a loading state, not a zero.
 */
export type ResourceState<T> = {
  data: T | null;
  /** loading = no answer yet; ready = data is real; error = every try failed and there is no copy to show */
  status: "loading" | "ready" | "error";
  retry: () => void;
};

const lastGood = new Map<string, unknown>();
if (typeof window !== "undefined") {
  // a different student signing in on this tab never sees the last one's numbers
  window.addEventListener("prepex:session-cleared", () => lastGood.clear());
}

/** For tests. */
export function forgetResources(): void {
  lastGood.clear();
}

export function useResource<T>(key: string, load: () => Promise<T>): ResourceState<T> {
  const [data, setData] = useState<T | null>(() => (lastGood.has(key) ? (lastGood.get(key) as T) : null));
  const [status, setStatus] = useState<ResourceState<T>["status"]>(() => (lastGood.has(key) ? "ready" : "loading"));
  const [round, setRound] = useState(0);
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    let alive = true;
    withRetry(() => loadRef.current())
      .then((value) => {
        if (!alive) return;
        lastGood.set(key, value);
        setData(value);
        setStatus("ready");
      })
      .catch(() => {
        // keep showing a real earlier answer if there is one; otherwise say it failed (never a made-up value)
        if (alive) setStatus(lastGood.has(key) ? "ready" : "error");
      });
    return () => {
      alive = false;
    };
  }, [key, round]);

  const retry = useCallback(() => {
    setStatus((s) => (s === "error" ? "loading" : s));
    setRound((r) => r + 1);
  }, []);
  return { data, status, retry };
}
