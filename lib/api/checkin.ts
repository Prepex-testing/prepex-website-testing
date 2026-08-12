import { CORE_API_BASE_URL } from "@/lib/api/config";
import { authenticatedRequest } from "@/lib/api/authRequest";

function authRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  return authenticatedRequest<T>(`${CORE_API_BASE_URL}/api/checkin${path}`, options);
}

export type CheckInMoodValue = "DRAINED" | "HEAVY" | "STEADY" | "GOOD" | "STRONG";

const MOOD_API_VALUES: Record<string, CheckInMoodValue> = {
  drained: "DRAINED",
  heavy: "HEAVY",
  steady: "STEADY",
  good: "GOOD",
  energised: "STRONG",
};

export function moodIdToApiValue(moodId: string): CheckInMoodValue {
  return MOOD_API_VALUES[moodId] ?? (moodId.toUpperCase() as CheckInMoodValue);
}

const MOOD_IDS_BY_API_VALUE: Record<string, string> = Object.fromEntries(
  Object.entries(MOOD_API_VALUES).map(([id, value]) => [value, id]),
);

export function apiValueToMoodId(apiValue: string): string {
  return MOOD_IDS_BY_API_VALUE[apiValue] ?? apiValue.toLowerCase();
}

export type CheckInStatus = {
  checkinDate: string;
  exists: boolean;
  checkin: {
    id: string;
    mood: CheckInMoodValue;
    isSkipped: boolean;
    isStudyingCrossApp: boolean;
    crossAppActivity: string | null;
    switchCrossStudyAt: string | null;
    burnoutDetected: boolean;
    burnoutTier: number;
    streakCount: number;
    longestStreak: number;
    missingDays: number;
    isInRecoveryMode?: boolean;
    isActiveSession?: boolean;
  } | null;
  isInBurnout: boolean;
  burnoutStatus: { isInBurnout: boolean; message: string };
  isMockToday: boolean;
  /** Daily target study hours — task durations beyond this trigger a confirm prompt. */
  dailyHours?: number;
  /** True for the entire user's second day on the app — drives the one-time "why we ask this" popup. */
  isSecondDay?: boolean;
};

export function getCheckInStatus() {
  return authRequest<{ success: true; data: CheckInStatus }>("/status");
}

export function submitCheckIn(input: { mood: CheckInMoodValue } | { isSkipped: true }) {
  return authRequest<{ success: true; data: unknown }>("", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function endRecoveryMode() {
  return authRequest<{ success: true; data: unknown }>("/end-recovery", {
    method: "POST",
  });
}
