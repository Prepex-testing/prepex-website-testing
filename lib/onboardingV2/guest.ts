"use client";

import { emptyAnswers, type CanvasAnswers } from "@/lib/onboardingV2/canvas";

/**
 * Onboarding v2, Part D: a guest starts with sensible defaults (D1) and is asked the rest later, one small card per
 * session on Home (D2). The answers that shape the week are kept on the device so the week can be rebuilt with the
 * same generator the canvas uses.
 */
export const GUEST_DEFAULTS: CanvasAnswers = {
  ...emptyAnswers("Guest"),
  goal: "JEE_BOTH",
  level: "CLASS_12",
  school: "NONE",
  coaching: "SELF",
  hours: 6,
  windows: ["EVENING", "NIGHT"],
  current: "chapters",
};

export type GuestAsk = "class" | "exam_date" | "school" | "hours" | "chapters";
export const GUEST_ASK_ORDER: GuestAsk[] = ["class", "exam_date", "school", "hours", "chapters"];

export interface GuestState {
  answers: CanvasAnswers;
  asked: GuestAsk[];
  /** When the guest started (ISO), for the day-3 save prompt. Missing on states saved before it existed. */
  startedAt?: string;
}

const key = (userId: string) => `prepex_guest:${userId}`;
const SESSION_KEY = "prepex_guest_ask_shown";

export function loadGuest(userId: string): GuestState {
  try {
    const raw = window.localStorage.getItem(key(userId));
    if (raw) return JSON.parse(raw) as GuestState;
  } catch {
    /* fall through */
  }
  return { answers: GUEST_DEFAULTS, asked: [] };
}

export function saveGuest(userId: string, state: GuestState): void {
  try {
    window.localStorage.setItem(key(userId), JSON.stringify(state));
  } catch {
    /* private mode */
  }
}

/** The next question to ask, or null when everything has been asked. School only for Class 11/12. */
export function nextAsk(state: GuestState): GuestAsk | null {
  for (const ask of GUEST_ASK_ORDER) {
    if (state.asked.includes(ask)) continue;
    if (ask === "school" && !(state.answers.level === "CLASS_11" || state.answers.level === "CLASS_12")) continue;
    return ask;
  }
  return null;
}

/** One card per browser session (D2). */
export function askShownThisSession(): boolean {
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}
export function markAskShown(): void {
  try {
    window.sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    /* nothing */
  }
}

export const isGuestUser = (u: { authProvider?: string; email?: string } | null | undefined) => u?.authProvider === "guest" || (u?.email ?? "").endsWith("@guest.prepex.invalid");

// ---- D3: saving the guest ---------------------------------------------------------------------------------------------

const savedKey = (userId: string) => `prepex_guest_saved:${userId}`;
const promptsKey = (userId: string) => `prepex_guest_prompts:${userId}`;
export const GUEST_CONFLICT_KEY = "prepex_guest_conflict";

function readList(key: string): string[] {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

/** The account was just saved (same id): Pexo says guest.saved once, and the ask cards keep going. */
export function markGuestSaved(userId: string): void {
  try {
    window.localStorage.setItem(savedKey(userId), "1");
  } catch {
    /* private mode */
  }
}

/** True once, right after saving. */
export function takeGuestSaved(userId: string): boolean {
  try {
    const v = window.localStorage.getItem(savedKey(userId)) === "1";
    if (v) window.localStorage.removeItem(savedKey(userId));
    return v;
  } catch {
    return false;
  }
}

/** A saved-from-guest account still has questions to answer (the cards go on after saving). */
export function hasGuestAsks(userId: string): boolean {
  try {
    return window.localStorage.getItem(`prepex_guest:${userId}`) !== null;
  } catch {
    return false;
  }
}

export type SavePrompt = "first_session" | "dayclose" | "day3";

/** Each save prompt is shown at most once per guest. */
export function promptShown(userId: string, prompt: SavePrompt): boolean {
  return readList(promptsKey(userId)).includes(prompt);
}
export function markPromptShown(userId: string, prompt: SavePrompt): void {
  try {
    window.localStorage.setItem(promptsKey(userId), JSON.stringify([...new Set([...readList(promptsKey(userId)), prompt])]));
  } catch {
    /* private mode */
  }
}

/** Which save prompt is due, most important first: day 3, then a closed day, then a first study session. */
export function duePrompt(facts: { daysSinceStart: number; dayClosed: boolean; studied: boolean }, shown: (p: SavePrompt) => boolean): SavePrompt | null {
  if (facts.daysSinceStart >= 2 && !shown("day3")) return "day3";
  if (facts.dayClosed && !shown("dayclose")) return "dayclose";
  if (facts.studied && !shown("first_session")) return "first_session";
  return null;
}
