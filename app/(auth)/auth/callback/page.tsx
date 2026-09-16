"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthCard } from "@/components/layout/AuthCard";
import { getProfile, ApiError } from "@/lib/api/auth";
import { saveSession } from "@/lib/auth/session";
import { markAccountRestored } from "@/lib/auth/accountRestored";
import { resolveAuthedLanding } from "@/lib/auth/onboardingGate";

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={<AuthCard>{null}</AuthCard>}>
      <GoogleCallbackHandler />
    </Suspense>
  );
}

function GoogleCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accessToken = searchParams.get("access_token");
  const refreshToken = searchParams.get("refresh_token");
  // Set by auth-service when this Google sign-in cancelled a scheduled deletion.
  const restored = searchParams.get("restored") === "1";

  const missingTokens = !accessToken || !refreshToken;
  const [asyncError, setAsyncError] = useState<string | null>(null);
  const error = missingTokens ? "Google sign-in failed. Please try again." : asyncError;

  useEffect(() => {
    if (!accessToken || !refreshToken) return;

    getProfile(accessToken)
      .then(async ({ data: user }) => {
        saveSession({ accessToken, refreshToken }, user);
        if (restored) markAccountRestored();

        router.push(await resolveAuthedLanding());
      })
      .catch((err) => {
        setAsyncError(
          err instanceof ApiError ? err.message : "Google sign-in failed. Please try again.",
        );
      });
  }, [accessToken, refreshToken, router]);

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
