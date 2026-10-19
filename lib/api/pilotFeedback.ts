import { CORE_API_BASE_URL } from "@/lib/api/config";
import { authenticatedRequest } from "@/lib/api/authRequest";

/** The pilot feedback button (core-service /api/pilot-feedback). */

function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  return authenticatedRequest<T>(`${CORE_API_BASE_URL}/api/pilot-feedback${path}`, options);
}

/** Whether the button is on (a server flag, so it flips without a new website build). */
export function getFeedbackConfig() {
  return request<{ success: true; data: { enabled: boolean } }>("/config");
}

export type NewFeedback = {
  /** The page the student is on: a path, no query string. */
  screen: string;
  feedbackText: string;
  rating?: number;
  /** A `data:image/...;base64,` URL (downscaled). */
  screenshot?: string;
};

export function sendFeedback(input: NewFeedback) {
  return request<{ success: true; data: { feedback: { id: string } } }>("", { method: "POST", body: JSON.stringify(input) });
}
