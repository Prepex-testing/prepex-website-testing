"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { TaskChecklist } from "@/lib/api/planner";

/**
 * A focus session (/home/session) can step out to its chapter's resource page
 * with the timer still running. That page's timer lives in the component and
 * stops when it unmounts, so the trip is recorded here; FocusSessionBanner
 * carries the timer on the resource page, writing the same per-task elapsed
 * seconds (lib/session/activeTask) the session page restores from on return.
 *
 * The record is cleared when the session page mounts again, or when the
 * student leaves the session from the banner.
 */
const KEY = "prepex.focusResourceVisit";
const CHANGE_EVENT = "prepex-focus-visit-change";

export type FocusResourceVisit = {
  taskId: string;
  title: string;
  subjectName: string;
  chapterName: string;
  targetSeconds: number;
  /** A paused session stays paused while reviewing, and on return. */
  paused: boolean;
  /** Carried so leaving from the resource page saves it like the session page does. */
  checklist: Required<TaskChecklist>;
};

function readRaw(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function parse(raw: string | null): FocusResourceVisit | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as FocusResourceVisit;
  } catch {
    return null;
  }
}

export function getFocusResourceVisit(): FocusResourceVisit | null {
  return parse(readRaw());
}

export function startFocusResourceVisit(visit: FocusResourceVisit) {
  try {
    localStorage.setItem(KEY, JSON.stringify(visit));
  } catch {
    // Storage unavailable — the trip still works, the banner just can't show.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function clearFocusResourceVisit() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/** The in-progress resource trip, if any. */
export function useFocusResourceVisit(): FocusResourceVisit | null {
  // The raw string is the snapshot — stable between changes, unlike a parsed object.
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  return useMemo(() => parse(raw), [raw]);
}
