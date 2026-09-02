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

// --- Section 4: Burnout Detection + Bad Day Protocol + Disengagement ----------

/** Section 4.2.2 — what the app should surface for the current burnout tier. */
export type TierResponse =
  | "NONE"
  | "SOFT_INQUIRY"
  | "RECOVERY_SUGGESTED"
  | "RECOVERY_ACTIVATED"
  | "WELLNESS";

/** Section 4.4.2 — the five soft-inquiry options plus the skip path. */
export type DisengagementResponse =
  | "WORKING_WELL"
  | "PLANS_OFF"
  | "TOPICS_WRONG"
  | "MOTIVATION"
  | "NEED_TO_TALK"
  | "SKIPPED";

export type DisengagementInquiry = {
  id: string;
  triggeredAt: string;
  triggers: string[];
  response: DisengagementResponse | null;
  respondedAt: string | null;
  actionTaken: string | null;
};

export type RecoveryWeek = {
  active: boolean;
  /** 1-based day within the 7-day week. */
  day: number;
  endsOn: string | null;
};

export type BurnoutStatus = {
  isInBurnout: boolean;
  message?: string;
  tier: number;
  tierResponse: TierResponse;
  activeSignals: string[];
  /** Short, non-alarmist sentences for the tier pop-up. */
  signalLabels: string[];
  recoveryWeek: RecoveryWeek;
  pendingInquiry: DisengagementInquiry | null;
  isBadDayReturn?: boolean;
  disengagementDetected?: boolean;
};

export type BadDayWelcome = {
  isBadDayReturn: boolean;
  acknowledged: boolean;
  welcome: {
    firstName: string;
    tasks: { id: string; title: string; description: string | null; estimatedMinutes: number }[];
  };
};

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
    isBadDayReturn?: boolean;
    badDayAcknowledgedAt?: string | null;
    isActiveSession?: boolean;
  } | null;
  isInBurnout: boolean;
  burnoutStatus: BurnoutStatus;
  isMockToday: boolean;
  /** Daily target study hours — task durations beyond this trigger a confirm prompt. */
  dailyHours?: number;
  /** True for the entire user's second day on the app — drives the one-time "why we ask this" popup. */
  isSecondDay?: boolean;
  isBacklogAvailable: boolean;
  latestBacklog: {
    title: string;
    addedAt: string;
    daysOverdue: number;
  } | null;
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

export function getBurnoutStatus() {
  return authRequest<{ success: true; data: BurnoutStatus }>("/burnout-status");
}

/** Section 4.2.3 — Tier 3 explicit opt-in to Recovery Week. */
export function activateRecoveryMode() {
  return authRequest<{ success: true; data: BurnoutStatus }>("/recovery/activate", {
    method: "POST",
  });
}

export function endRecoveryMode() {
  return authRequest<{ success: true; data: unknown }>("/end-recovery", {
    method: "POST",
  });
}

/** Section 4.3 — Bad Day welcome screen data. */
export function getBadDayWelcome() {
  return authRequest<{ success: true; data: BadDayWelcome }>("/bad-day");
}

export function acknowledgeBadDay() {
  return authRequest<{ success: true; data: { acknowledged: true } }>("/bad-day/acknowledge", {
    method: "POST",
  });
}

/** Section 4.4 — Disengagement soft inquiry. */
export function getDisengagementInquiry() {
  return authRequest<{ success: true; data: DisengagementInquiry | null }>("/disengagement/inquiry");
}

export function respondToDisengagementInquiry(id: string, response: DisengagementResponse) {
  return authRequest<{ success: true; data: { actionTaken: string } }>(
    `/disengagement/inquiry/${id}/respond`,
    { method: "POST", body: JSON.stringify({ response }) },
  );
}
