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
