import { CORE_API_BASE_URL } from "@/lib/api/config";
import { authenticatedRequest } from "@/lib/api/authRequest";

function authRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  return authenticatedRequest<T>(`${CORE_API_BASE_URL}/api/parent${path}`, options);
}

// ---------------------------------------------------------------------------
// Section 13 — Parent WhatsApp weekly report
// ---------------------------------------------------------------------------

export type ParentReportLanguage = "ENGLISH" | "HINDI" | "HINGLISH";

export type ParentConnectionStatus =
  | "PENDING"
  | "VERIFIED"
  | "DECLINED"
  | "LAPSED"
  | "FAILED"
  | "STOPPED"
  | "DISCONNECTED"
  | "CLOSED";

export type ParentConnection = {
  id: string;
  status: ParentConnectionStatus;
  /** E.164, e.g. "+919876543210". */
  phone: string;
  phoneMasked: string;
  parentName: string | null;
  language: ParentReportLanguage;
  requestedAt: string;
  reminderSentAt: string | null;
  /** When an unanswered invite gets its one reminder (PENDING only). */
  reminderDueAt: string | null;
  /** When an unanswered invite lapses (PENDING only). */
  expiresAt: string | null;
  verifiedAt: string | null;
  endedAt: string | null;
  statusReason: string | null;
  reportsEnabled: boolean;
  hideMockScores: boolean;
  /** Reports paused until then; null when not paused. */
  pausedUntil: string | null;
  /** Reports auto-paused after 21 days away — resume when the student returns. */
  hibernating: boolean;
  lastReportAt: string | null;
  /** DECLINED only — this number can be invited again from then. */
  retryAvailableAt: string | null;
};

export type ParentReportSummary = {
  id: string;
  weekStart: string | null;
  variant: string | null;
  status: "QUEUED" | "SENT" | "DELIVERED" | "READ" | "FAILED" | "DRY_RUN";
  sentAt: string | null;
};

export type ParentConnectionState = {
  /** The live connection (pending or verified), if any. */
  connection: ParentConnection | null;
  /** Otherwise the most recent ended one — so the page can say what happened. */
  lastEnded: ParentConnection | null;
  recentReports: ParentReportSummary[];
  /** `live` is false until WhatsApp credentials are configured on the server. */
  whatsapp: { live: boolean; businessNumber: string | null };
};

export type ParentReportPreview = {
  language: ParentReportLanguage;
  weekStart: string;
  variant: string | null;
  /** Why no report would go out this week (exam day, paused after 21 days away, …). */
  skipReason: "EXAM_DAY" | "HIBERNATING" | "EXAM_PASSED" | "UNSAFE_COPY" | null;
  /** The message exactly as the parent would receive it. */
  body: string | null;
};

type StateResponse = { success: true; data: ParentConnectionState };

export function getParentConnection() {
  return authRequest<StateResponse>("");
}

export function connectParent(input: {
  phone: string;
  parentName?: string | null;
  language: ParentReportLanguage;
  /** The student confirms this is their parent's or guardian's number. */
  consent: true;
}) {
  return authRequest<StateResponse>("/connect", { method: "POST", body: JSON.stringify(input) });
}

/** A new number sends a fresh verification to it. */
export function updateParentPhone(input: { phone: string; parentName?: string | null }) {
  return authRequest<StateResponse>("/phone", { method: "PATCH", body: JSON.stringify(input) });
}

export function updateParentSettings(input: {
  language?: ParentReportLanguage;
  parentName?: string | null;
  reportsEnabled?: boolean;
  hideMockScores?: boolean;
  /** 1–12 pauses reports that many weeks; 0 resumes now. */
  pauseWeeks?: number;
}) {
  return authRequest<StateResponse>("/settings", { method: "PATCH", body: JSON.stringify(input) });
}

export function disconnectParent() {
  return authRequest<StateResponse>("", { method: "DELETE" });
}

export function previewParentReport(language?: ParentReportLanguage) {
  return authRequest<{ success: true; data: ParentReportPreview }>(language ? `/preview?language=${language}` : "/preview");
}

export const PARENT_LANGUAGE_OPTIONS: { value: ParentReportLanguage; label: string }[] = [
  { value: "ENGLISH", label: "English" },
  { value: "HINDI", label: "हिन्दी" },
  { value: "HINGLISH", label: "Hinglish" },
];

export const PARENT_NAME_OPTIONS = ["Mom", "Dad", "Mummy", "Papa", "Guardian"];

/** Profile-row summary of the connection state. */
export function parentConnectionSummary(state: ParentConnectionState | null): string {
  const connection = state?.connection;
  if (!connection) return "Not connected";
  const who = connection.parentName || "Parent";
  if (connection.status === "PENDING") return `${who} · waiting to confirm`;
  if (connection.pausedUntil || !connection.reportsEnabled) return `${who} · reports paused`;
  return `${who} · connected`;
}
