"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800 }}>Something went wrong</h1>
        <p style={{ marginTop: 8 }}>We&apos;ve been told about it. Please try again.</p>
        <button
          type="button"
          onClick={reset}
          style={{ marginTop: 16, minHeight: 48, padding: "0 20px", borderRadius: 8, border: 0, background: "#FF7B54", color: "#fff", fontWeight: 700 }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
