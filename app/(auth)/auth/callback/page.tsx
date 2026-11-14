"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/layout/AuthCard";
import { getProfile, ApiError } from "@/lib/api/auth";
import { saveSession } from "@/lib/auth/session";
import { markAccountRestored } from "@/lib/auth/accountRestored";
import { resolveAuthedLanding } from "@/lib/auth/onboardingGate";
import { GUEST_CONFLICT_KEY, markGuestSaved } from "@/lib/onboardingV2/guest";
import { readOAuthHandoff, type OAuthHandoff } from "@/lib/auth/oauthHandoff";

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={<AuthCard>{null}</AuthCard>}>
      <GoogleCallbackHandler />
    </Suspense>
  );
}

function GoogleCallbackHandler() {
  const router = useRouter();
  // Read once: the tokens arrive in the URL fragment (never sent to a server); the query is an older auth-service.
  const [handoff, setHandoff] = useState<OAuthHandoff | null>(null);
  const accessToken = handoff?.accessToken ?? null;
  const refreshToken = handoff?.refreshToken ?? null;
  // Set by auth-service when this Google sign-in cancelled a scheduled deletion.
  const restored = handoff?.restored ?? false;
  // Part D: this Google sign-in saved a guest account (same account), or found the Google account already had Prepex
  const savedGuest = handoff?.saved ?? false;
  const guestConflict = handoff?.guestConflict ?? false;

  const missingTokens = handoff !== null && (!accessToken || !refreshToken);
  const [asyncError, setAsyncError] = useState<string | null>(null);
  const error = missingTokens ? "Google sign-in failed. Please try again." : asyncError;

  // Read after hydration (the server never sees the fragment), then take the tokens out of the address bar and history.
  useEffect(() => {
    const read = readOAuthHandoff(window.location.hash, window.location.search);
    if (window.location.hash || window.location.search) window.history.replaceState(null, "", "/auth/callback");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one read of browser-only state after mount
    setHandoff(read);
  }, []);

  useEffect(() => {
    if (!accessToken || !refreshToken) return;

    getProfile(accessToken)
      .then(async ({ data: user }) => {
        saveSession({ accessToken, refreshToken }, user);
        if (restored) markAccountRestored();
        if (savedGuest) markGuestSaved(user.id);
        if (guestConflict) {
          try {
            window.localStorage.setItem(GUEST_CONFLICT_KEY, "1");
          } catch {
            /* private mode */
          }
        }

        router.push(await resolveAuthedLanding());
      })
      .catch((err) => {
        setAsyncError(
          err instanceof ApiError ? err.message : "Google sign-in failed. Please try again.",
        );
      });
  }, [accessToken, refreshToken, router, restored, savedGuest, guestConflict]);

  return (
    <AuthCard>
      <div className="flex flex-col items-center gap-4 text-center">
        {error ? (
          <>
            <p
              role="alert"
              className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger"
            >
              {error}
            </p>
            <Link href="/login" className="font-semibold text-ink underline">
              Back to Login
            </Link>
          </>
        ) : (
          <p className="text-sm text-muted">Signing you in...</p>
        )}
      </div>
    </AuthCard>
  );
}
