import * as Sentry from "@sentry/nextjs";
import { baseOptions } from "@/lib/observability/sentry-options";

export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    Sentry.init(baseOptions());
  }
}

export const onRequestError = Sentry.captureRequestError;
