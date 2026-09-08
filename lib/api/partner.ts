import { CORE_API_BASE_URL } from "@/lib/api/config";
import { authenticatedRequest } from "@/lib/api/authRequest";

function authRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  return authenticatedRequest<T>(`${CORE_API_BASE_URL}/api/partner${path}`, options);
}

// ---------------------------------------------------------------------------
// Status / eligibility (Section 6.2)
// ---------------------------------------------------------------------------

export type PartnerStatusValue = "NONE" | "PENDING" | "ACTIVE" | "PAUSED";

export type DeclineInfo = {
  count: number;
  maxDeclines: number;
  remaining: number;
  canDecline: boolean;
};

export type DisconnectCooldown = {
  active: boolean;
  availableFrom: string | null;
};

export type MatchingEligibility = {
  daysSinceSignup: number;
  eligibleForMatching: boolean;
  daysUntilEligible: number;
  declines: DeclineInfo;
  disconnectCooldown: DisconnectCooldown;
};

export type PartnerSummary = {
  fullName: string;
  city: string | null;
  examId?: string;
  examName: string | null;
  targetExamDate: string | null;
  streak: number;
};

export type PartnershipSettings = {
  messagingEnabled: boolean;
  hideCompletionPct: boolean;
  pausedUntil: string | null;
};

export type PartnershipStatusResponse = {
  status: PartnerStatusValue;
  partnershipId?: string;
  meAccepted?: boolean;
  partnerAccepted?: boolean;
  matchedAt?: string | null;
  partner: PartnerSummary | null;
  settings?: PartnershipSettings;
  eligibility: MatchingEligibility;
};

export function getPartnerStatus() {
  return authRequest<{ success: true; data: PartnershipStatusResponse }>("/status");
}

// ---------------------------------------------------------------------------
// Matching lifecycle
// ---------------------------------------------------------------------------

export type FindMatchResponse =
  | { matched: true; partnershipId: string }
  | { matched: false; message: string; poolSize?: number };

export function findMatch() {
  return authRequest<{ success: true; data: FindMatchResponse }>("/find-match", {
    method: "POST",
  });
}

export function acceptMatch() {
  return authRequest<{
    success: true;
    data: { accepted: boolean; partnershipActive: boolean; waitingForPartner: boolean };
  }>("/accept", { method: "POST" });
}

/** PRD 6.2.4 — capped at 2 lifetime attempts (see eligibility.declines). */
export function declineMatch() {
  return authRequest<{
    success: true;
    data: { declined: boolean; declineCount: number; attemptsRemaining: number };
  }>("/decline", { method: "POST" });
}

/**
 * PRD 6.5.3 — unmatches immediately (no partner confirmation needed, since
 * this is how you escape an inactive/unresponsive partner). Unlimited uses.
 */
export function requestRematch() {
  return authRequest<{
    success: true;
    data: { rematchRequested: boolean; unmatched: boolean; message: string };
  }>("/rematch", { method: "POST" });
}

/** PRD 6.7.2 — 30-day cooldown applies to you before a new match. */
export function disconnectPartner() {
  return authRequest<{ success: true; data: { disconnected: boolean; cooldownDays: number } }>(
    "",
    { method: "DELETE" },
  );
}

// ---------------------------------------------------------------------------
// Partner profile (Section 6.3 — PRD-limited fields only)
// ---------------------------------------------------------------------------

export type PartnerProfile = {
  fullName: string;
  city: string | null;
  examId?: string;
  examName: string | null;
  daysToExam: number | null;
  currentStreak: number;
  daysActiveThisWeek: number;
  focusSecondsThisWeek: number;
  todayCompletionPct: number | null;
};

export function getPartnerProfile() {
  return authRequest<{ success: true; data: PartnerProfile }>("/partner");
}

export type InactivitySuggestedAction = "check_in" | "rematch" | null;

export type InactivityInfo = {
  partnerInactiveDays: number | null;
  lastActiveDate?: string;
  suggestion: string | null;
  suggestedAction: InactivitySuggestedAction;
  autoUnmatched: boolean;
};

export function getPartnerInactivity() {
  return authRequest<{ success: true; data: InactivityInfo }>("/inactivity");
}

// ---------------------------------------------------------------------------
// Template messages (Section 6.4) — 5 fixed categories, fixed templates only.
// No free text, no emoji/reactions.
// ---------------------------------------------------------------------------

export type MessageCategory = "ENCOURAGE" | "PUSH_BACK" | "CHECK_IN" | "GOAL_SHARE" | "CELEBRATE";

export type MessageTemplateOption = {
  id: string;
  text: string;
  quickReply?: boolean;
};

export type TemplatesResponse = {
  templates: Record<MessageCategory, MessageTemplateOption[]>;
  quickReplies: MessageTemplateOption[];
};

export function getMessageTemplates() {
  return authRequest<{ success: true; data: TemplatesResponse }>("/messages/templates");
}

export type PartnerMessage = {
  id: string;
  senderId: string | null;
  sender: { fullName: string } | null;
  category: MessageCategory;
  templateId: string | null;
  createdAt: string;
  text: string;
  isMine: boolean;
};

export function getMessages(limit?: number) {
  return authRequest<{ success: true; data: PartnerMessage[] }>(
    `/messages${limit ? `?limit=${limit}` : ""}`,
  );
}

export function sendMessage(input: { category: MessageCategory; templateId: string }) {
  return authRequest<{
    success: true;
    data: { sent: boolean; message: { id: string; category: MessageCategory; templateId: string | null; createdAt: string; text: string } };
  }>("/messages", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// ---------------------------------------------------------------------------
// Weekly goals (Goal-Setting Sunday — Section 6.6)
// ---------------------------------------------------------------------------

export type GoalCompletionStatus = "NOT_COMPLETE" | "PARTIAL" | "COMPLETE";

export type WeeklyGoals = {
  weekStart: string;
  myGoal: string | null;
  partnerGoal: string | null;
  myStatus: GoalCompletionStatus | null;
  partnerStatus: GoalCompletionStatus | null;
  bothSet: boolean;
  /** PRD 6.6.2 — both partners have reflected "Goal hit?" for the week. */
  bothReflected: boolean;
};

export function getWeeklyGoals() {
  return authRequest<{ success: true; data: WeeklyGoals }>("/goals");
}

export function setWeeklyGoal(goal: string) {
  return authRequest<{ success: true; data: { goalSet: boolean } }>("/goals", {
    method: "POST",
    body: JSON.stringify({ goal }),
  });
}

/** PRD 6.6.2 — Friday "Goal hit?" reflection on my own goal. */
export function setGoalCompletionStatus(status: GoalCompletionStatus) {
  return authRequest<{ success: true; data: { statusSet: boolean; status: GoalCompletionStatus } }>(
    "/goals/status",
    { method: "POST", body: JSON.stringify({ status }) },
  );
}

// ---------------------------------------------------------------------------
// Settings & pause (Section 6.7)
// ---------------------------------------------------------------------------

export function updatePartnerSettings(input: { messagingEnabled?: boolean; hideCompletionPct?: boolean }) {
  return authRequest<{ success: true; data: { updated: boolean } }>("/settings", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/** Omit weeks to resume immediately (clears an existing pause). */
export function pausePartnership(weeks?: number) {
  return authRequest<{ success: true; data: { paused: boolean; pausedUntil: string | null } }>(
    "/pause",
    { method: "POST", body: JSON.stringify(weeks ? { weeks } : {}) },
  );
}
