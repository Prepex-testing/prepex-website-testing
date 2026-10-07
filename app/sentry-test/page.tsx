"use client";

import * as Sentry from "@sentry/nextjs";
import { notFound } from "next/navigation";
import { useState } from "react";

// Verification page. It only exists when NEXT_PUBLIC_SENTRY_TEST_ENABLED=true at build time —
// never set on Vercel Production — so on a normal deployment this route is a 404.
const ENABLED = process.env.NEXT_PUBLIC_SENTRY_TEST_ENABLED === "true";

export default function SentryTestPage() {
  const [eventId, setEventId] = useState<string | null>(null);
  if (!ENABLED) notFound();

  async function send() {
    const id = Sentry.captureException(new Error("Sentry verification — website client (test error, safe to resolve)"), {
      tags: { verification: "phase-1-closeout" },
    });
    await Sentry.flush(5000);
    setEventId(id);
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Sentry verification</h1>
      <button type="button" data-testid="send-test-error" onClick={send} style={{ minHeight: 48, padding: "0 20px" }}>
        Send test error
      </button>
      {eventId && <p data-testid="event-id">sent: {eventId}</p>}
    </main>
  );
}
