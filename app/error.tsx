"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";
import { Logo } from "@/components/ui/Logo";

// Launch step 1 (A2): the error boundary for every route under the root layout. A crash in one screen shows this card
// (and is reported) instead of a blank page; the layout, and so the rest of the app, keeps working.
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main role="alert" className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <Logo size="compact" showTagline={false} />
      <h1 className="text-lg font-bold text-ink">Something went wrong</h1>
      <p className="max-w-xs text-sm text-muted">We&apos;ve been told about it. Your study data is safe. Please try again.</p>
      <div className="flex gap-3">
        <button type="button" onClick={reset} className="inline-flex min-h-12 items-center rounded-xl border border-ink/15 px-5 text-sm font-semibold text-ink">
          Try again
        </button>
        <Link href="/home" className="inline-flex min-h-12 items-center rounded-xl border border-ink/15 px-5 text-sm font-semibold text-ink">
          Home
        </Link>
      </div>
    </main>
  );
}
