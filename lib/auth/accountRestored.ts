/**
 * A sign-in within the 30-day window cancels a scheduled account deletion.
 * The student may not realise that's what signing in did, so they're told —
 * but the sign-in page navigates away immediately, so the message is carried
 * to the app in sessionStorage and shown once by AccountRestoredNotice.
 */
const KEY = "prepex.accountRestored";

export function markAccountRestored() {
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {
    // Storage unavailable — the restore still happened; only the notice is lost.
  }
}

/**
 * A pure read, safe to call from a useState initialiser. (Reading and clearing
 * in one call would not be: StrictMode runs initialisers twice in dev and may
 * keep the second result — which would find the flag already gone.)
 */
export function hasAccountRestoredNotice(): boolean {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function clearAccountRestoredNotice() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
