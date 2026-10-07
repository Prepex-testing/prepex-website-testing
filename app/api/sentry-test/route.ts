import { notFound } from "next/navigation";

// Server-side verification: throws so `onRequestError` reports it. Gated by SENTRY_TEST_ENABLED
// (server env, never set on Production) — otherwise this route is a 404.
export const dynamic = "force-dynamic";

export function GET() {
  if (process.env.SENTRY_TEST_ENABLED !== "true") notFound();
  throw new Error("Sentry verification — website server (test error, safe to resolve)");
}
