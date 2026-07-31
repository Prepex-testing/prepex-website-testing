import { CORE_API_BASE_URL } from "@/lib/api/config";
import { apiRequest, ApiError } from "@/lib/api/http";
import { refreshAccessToken } from "@/lib/api/auth";
import { getAccessToken, getRefreshToken, saveTokens, clearSession } from "@/lib/auth/session";

async function authRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${CORE_API_BASE_URL}/api/checkin${path}`;
  const accessToken = getAccessToken();

  try {
    return await apiRequest<T>(url, {
      ...options,
      headers: { Authorization: `Bearer ${accessToken}`, ...options.headers },
    });
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 401) throw err;

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearSession();
      throw err;
    }

    const { data: newTokens } = await refreshAccessToken(refreshToken);
    saveTokens(newTokens);

    return apiRequest<T>(url, {
      ...options,
      headers: { Authorization: `Bearer ${newTokens.accessToken}`, ...options.headers },
    });
  }
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
  } | null;
  isInBurnout: boolean;
  burnoutStatus: { isInBurnout: boolean; message: string };
  isMockToday: boolean;
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
