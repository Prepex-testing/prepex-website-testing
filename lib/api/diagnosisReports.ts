import { CORE_API_BASE_URL } from "@/lib/api/config";
import { authenticatedRequest } from "@/lib/api/authRequest";
import { ApiError } from "@/lib/api/http";
import { getAccessToken } from "@/lib/auth/session";
import { createSseParser } from "@/lib/diagnosis/sse";

/** The anytime 30-day diagnosis (Prepex Brain, via core-service /api/diagnosis-reports). The browser never talks to the Brain. */

export type ReportStatus = "pending" | "streaming" | "complete" | "failed";

export type DiagnosisReport = {
  id: string;
  status: ReportStatus;
  periodDays: number;
  /** The report so far (only its own sections) while it streams; the final text when complete; null before the first heading. */
  reportText: string | null;
  /** Failed because the Brain could not be reached or stopped: the page says "AI resting". */
  resting: boolean;
  lastError: string | null;
  triggeredAt: string;
  completedAt: string | null;
};

export type ReportListItem = {
  id: string;
  status: ReportStatus;
  periodDays: number;
  preview: string | null;
  triggeredAt: string;
  completedAt: string | null;
};

export type ReportLimit = {
  used: number;
  limit: number;
  remaining: number;
  /** The next midnight IST, an ISO instant. */
  resetsAt: string;
};

function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  return authenticatedRequest<T>(`${CORE_API_BASE_URL}/api/diagnosis-reports${path}`, options);
}

/** "Diagnose me now": 202 with the new report's id (a student with one already being written gets that one back). */
export function startDiagnosisReport(input: { targetRank?: number | null } = {}) {
  return request<{ success: true; data: { report: DiagnosisReport; limit: ReportLimit } }>("", {
    method: "POST",
    body: JSON.stringify(input.targetRank ? { targetRank: input.targetRank } : {}),
  });
}

export function getDiagnosisReport(id: string) {
  return request<{ success: true; data: { report: DiagnosisReport } }>(`/${id}`);
}

export function listDiagnosisReports(page = 1) {
  return request<{ success: true; data: { reports: ReportListItem[]; page: number; pageSize: number; total: number; limit: ReportLimit } }>(`?page=${page}`);
}

export type ReportStreamHandlers = {
  onSnapshot: (report: DiagnosisReport) => void;
  /** The whole visible report so far (replaces what was shown; it only ever grows). */
  onText: (text: string) => void;
  onDone: (report: DiagnosisReport) => void;
  onFailed: (report: DiagnosisReport) => void;
};

/**
 * Follows one report live (server-sent events). The browser's EventSource cannot send our Authorization header, so this
 * reads the stream with fetch(): the wire format is the same. Resolves `true` when the report reached `done` or
 * `failed`, `false` when the stream ended without either (the caller then polls). Throws `ApiError` for a non-200.
 */
export async function streamDiagnosisReport(id: string, handlers: ReportStreamHandlers, signal: AbortSignal): Promise<boolean> {
  const token = getAccessToken();
  const res = await fetch(`${CORE_API_BASE_URL}/api/diagnosis-reports/${id}/stream`, {
    cache: "no-store",
    signal,
    headers: { Accept: "text/event-stream", "ngrok-skip-browser-warning": "true", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok || !res.body) throw new ApiError(res.status, "Couldn't follow that report live.");

  let terminal = false;
  const parser = createSseParser((event, data) => {
    const payload = data as { report?: DiagnosisReport; text?: string } | null;
    if (event === "snapshot" && payload?.report) handlers.onSnapshot(payload.report);
    else if (event === "text" && typeof payload?.text === "string") handlers.onText(payload.text);
    else if (event === "done" && payload?.report) {
      terminal = true;
      handlers.onDone(payload.report);
    } else if (event === "failed" && payload?.report) {
      terminal = true;
      handlers.onFailed(payload.report);
    }
  });
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      parser.push(decoder.decode(value, { stream: true }));
      if (terminal) break;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  return terminal;
}
