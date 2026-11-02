"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api/http";
import type { SaveState } from "@/lib/notebooks/model";

/**
 * Saves a changing value a moment after the last change, shows "Saved", retries quietly when the network drops, and writes any
 * pending change when the tab is hidden or the page closes, so a refresh never loses work.
 */
export function useAutosave<T>(value: T, save: (v: T) => Promise<void>, opts: { delay?: number; enabled?: boolean } = {}) {
  const { delay = 800, enabled = true } = opts;
  const [state, setState] = useState<SaveState>("saved");
  const latest = useRef(value);
  const saved = useRef(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const running = useRef(false);
  /** A value the server refused (4xx): sending it again fails the same way, so wait for the next edit. */
  const refused = useRef<unknown>(undefined);
  const saveRef = useRef(save);
  const runRef = useRef<() => Promise<void>>(async () => undefined);
  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const run = useCallback(async () => {
    if (running.current) return;
    if (Object.is(latest.current, saved.current) || Object.is(latest.current, refused.current)) return;
    running.current = true;
    const sending = latest.current;
    setState("saving");
    try {
      await saveRef.current(sending);
      saved.current = sending;
      setState(Object.is(latest.current, sending) ? "saved" : "dirty");
    } catch (err) {
      if (err instanceof ApiError && err.status >= 400 && err.status < 500 && err.status !== 408 && err.status !== 429) {
        refused.current = sending;
        setState("refused");
      } else {
        setState("error");
        timer.current = setTimeout(() => ((timer.current = null), void runRef.current()), 3000);
      }
    } finally {
      running.current = false;
    }
    if (!Object.is(latest.current, saved.current) && !timer.current) timer.current = setTimeout(() => ((timer.current = null), void runRef.current()), 200);
  }, []);
  useEffect(() => {
    runRef.current = run;
  }, [run]);

  useEffect(() => {
    latest.current = value;
    if (!enabled) {
      saved.current = value;
      return;
    }
    if (Object.is(value, saved.current)) return;
     
    setState((s) => (s === "saving" ? s : "dirty"));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      void run();
    }, delay);
  }, [value, enabled, delay, run]);

  useEffect(() => {
    const flush = () => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      void run();
    };
    const onHide = () => document.visibilityState === "hidden" && flush();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [run]);

  /** The value the server is known to hold, for the page that loaded it. */
  const reset = useCallback((v: T) => {
    saved.current = v;
    latest.current = v;
    setState("saved");
  }, []);

  return { state, flush: run, reset };
}
