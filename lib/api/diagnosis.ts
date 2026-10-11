import { CORE_API_BASE_URL } from "@/lib/api/config";
import { authenticatedRequest } from "@/lib/api/authRequest";

/** AI diagnoses (Prepex Brain, via core-service /api/diagnosis). The Brain key never reaches the browser: only the server calls the Brain. */

export type DiagnosisStatus = "pending" | "running" | "ready" | "failed";

export type Fix = {
  title: string;
  chapterId: string | null;
  chapterName: string | null;
  minutes: number | null;
};

export type WeeklyDiagnosis = {
  id: string;
  weekStart: string;
  status: DiagnosisStatus;
  diagnosis: string | null;
  fixes: Fix[];
  trigger: "cron" | "user";
  attempts: number;
  lastError: string | null;
  /** The Brain could not be reached ("AI resting"); a retry is queued, or the student may run it again. */
  resting: boolean;
  completedAt: string | null;
  createdAt: string;
};

type Limit = { used: number; limit: number; retryAfterSeconds: number };

export type WeeklyOverview = {
  current: WeeklyDiagnosis | null;
  latest: WeeklyDiagnosis | null;
  brainConfigured: boolean;
  limits: { diagnosis: Limit; answer: Limit };
};

function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  return authenticatedRequest<T>(`${CORE_API_BASE_URL}/api/diagnosis${path}`, options);
}

export function getWeeklyOverview() {
  return request<{ success: true; data: WeeklyOverview }>("/weekly");
}

/** Starts a run in the background (202). Poll `getWeeklyOverview` until `current.status` is `ready` or `failed`. */
export function runWeeklyDiagnosis() {
  return request<{ success: true; data: { diagnosis: WeeklyDiagnosis } }>("/weekly/run", { method: "POST", body: JSON.stringify({}) });
}
