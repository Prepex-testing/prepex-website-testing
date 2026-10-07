import * as Sentry from "@sentry/nextjs";
import { baseOptions } from "@/lib/observability/sentry-options";

Sentry.init({
  ...baseOptions(),
  // Session replay is deliberately off: it would record students' screens. (No replay
  // integration is registered, so these only make the "off" explicit.)
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
