import * as Sentry from "@sentry/nextjs";
import { baseOptions } from "@/lib/observability/sentry-options";

Sentry.init({
  ...baseOptions(),
  // Session replay is deliberately not enabled: it would record students' screens.
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
