import { CORE_API_BASE_URL } from "@/lib/api/config";
import { authenticatedRequest } from "@/lib/api/authRequest";

/** Launch step 2 (B1): "Report a bug / Share an idea". */
export type FeedbackType = "bug" | "idea" | "other";

/** The build this page came from (set at build time), so a report says which version it is about. */
export const APP_VERSION = process.env.NEXT_PUBLIC_SENTRY_RELEASE || process.env.NEXT_PUBLIC_APP_VERSION || "dev";

export function sendFeedback(input: { type: FeedbackType; message: string; route: string; screenshot?: File | null }) {
  const body = new FormData();
  body.set("type", input.type);
  body.set("message", input.message);
  body.set("route", input.route.slice(0, 200));
  body.set("appVersion", APP_VERSION.slice(0, 40));
  if (input.screenshot) body.set("screenshot", input.screenshot);
  return authenticatedRequest<{ success: true; data: { id: string } }>(`${CORE_API_BASE_URL}/api/feedback`, { method: "POST", body });
}
