import { getCheckInStatus } from "@/lib/api/checkin";
import { getOnboardingProgress, getOnboardingStepPath } from "@/lib/api/onboarding";

/**
 * Where a signed-in student belongs right now.
 *
 * Onboarding is the gate in front of the whole app: a student who closed the
 * tab on step 3 has a valid access token, so every entry point that only
 * checks for one — the splash redirect, a bookmarked /home, the login form —
 * used to drop them into the app with half a profile. All of them ask here
 * instead, so "resume where you left off" is one rule in one place rather
 * than a branch copied into each screen.
 */

// The server can only ever flip this from false to true, so once it says
// "done" the answer is cached for the tab and the gate stops paying for a
// request on every protected navigation. Cleared on logout, since the next
// student signing in on this tab may not be finished.
let knownComplete = false;

export function isOnboardingKnownComplete(): boolean {
  return knownComplete;
}

export function markOnboardingComplete(): void {
  knownComplete = true;
}

export function forgetOnboardingStatus(): void {
  knownComplete = false;
}

/**
 * The onboarding screen this student still owes, or null if they're done.
 *
 * A failed lookup answers null: the status endpoint being down is not a
 * reason to strand someone on a blank gate, and the individual steps
 * re-check their own progress anyway.
 */
export async function pendingOnboardingPath(): Promise<string | null> {
  if (knownComplete) return null;
  try {
    const { data } = await getOnboardingProgress();
    if (data.progress.isCompleted) {
      knownComplete = true;
      return null;
    }
    return getOnboardingStepPath(data.progress.currentStep);
  } catch {
    return null;
  }
}

/**
 * The landing path for a student who has just signed in, or who has arrived
 * on splash/login with a session already in hand: their unfinished onboarding
 * step if there is one, otherwise today's check-in until it's been done.
 */
export async function resolveAuthedLanding(): Promise<string> {
  const step = await pendingOnboardingPath();
  if (step) return step;

  try {
    const { data } = await getCheckInStatus();
    return data.exists ? "/home" : "/check-in";
  } catch {
    // Couldn't confirm the check-in — home rather than a blocked sign-in.
    return "/home";
  }
}
