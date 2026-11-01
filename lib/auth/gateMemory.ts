import { getStoredUser } from "@/lib/auth/session";

/**
 * What the two gates in front of the app (onboarding finished, today's check-in done) last learned from the server, kept
 * in this browser per student. Both answers only ever change one way (onboarding is never un-finished, a check-in is never
 * un-done within the day), so a fresh open can paint at once and confirm with the server in the background, instead of
 * holding a blank screen for two round trips in a row. Never throws: a blocked store only means the gate waits as before.
 */
const ONBOARDED = "prepex.gate.onboarded";
const CHECKED_IN = "prepex.gate.checkedIn";

const userId = () => getStoredUser()?.id ?? null;
const istToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

function read(key: string): string | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string | null): void {
  try {
    if (typeof window === "undefined") return;
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* a blocked store only costs the shortcut */
  }
}

export function rememberOnboarded(): void {
  const id = userId();
  if (id) write(ONBOARDED, id);
}
export function isOnboardedRemembered(): boolean {
  const id = userId();
  return id !== null && read(ONBOARDED) === id;
}

export function rememberCheckedInToday(): void {
  const id = userId();
  if (id) write(CHECKED_IN, `${id}|${istToday()}`);
}
export function isCheckedInTodayRemembered(): boolean {
  const id = userId();
  return id !== null && read(CHECKED_IN) === `${id}|${istToday()}`;
}

/** Sign-out: the next student on this browser starts from the server's answers. */
export function forgetGateMemory(): void {
  write(ONBOARDED, null);
  write(CHECKED_IN, null);
}
