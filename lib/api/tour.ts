import { CORE_API_BASE_URL } from "@/lib/api/config";
import { authenticatedRequest } from "@/lib/api/authRequest";

/** The Day-1 tour (core-service /api/tour). */

function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  return authenticatedRequest<T>(`${CORE_API_BASE_URL}/api/tour${path}`, options);
}

/** Should this student be shown the tour now? (False while the pilot flag is off.) */
export function getTourState() {
  return request<{ success: true; data: { show: boolean } }>("");
}

/** The first tooltip is on screen: the tour has been shown and is never offered again. */
export function markTourSeen() {
  return request<{ success: true; data: { show: boolean } }>("/seen", { method: "POST", body: JSON.stringify({}) });
}
