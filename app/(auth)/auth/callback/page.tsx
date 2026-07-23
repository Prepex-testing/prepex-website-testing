"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthCard } from "@/components/layout/AuthCard";
import { CheckInModal } from "@/components/check-in/CheckInModal";
import { getProfile, ApiError } from "@/lib/api/auth";
import { saveSession } from "@/lib/auth/session";
import { getOnboardingProgress, getOnboardingStepPath } from "@/lib/api/onboarding";

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

  const missingTokens = !accessToken || !refreshToken;
  const [asyncError, setAsyncError] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [isCheckInOpen, setCheckInOpen] = useState(false);
  const error = missingTokens ? "Google sign-in failed. Please try again." : asyncError;

  useEffect(() => {
    if (!accessToken || !refreshToken) return;

    getProfile(accessToken)
      .then(async ({ data: user }) => {
        saveSession({ accessToken, refreshToken }, user);

        try {
          const { data: onboarding } = await getOnboardingProgress();
          if (!onboarding.progress.isCompleted) {
            router.push(getOnboardingStepPath(onboarding.progress.currentStep));
            return;
          }
        } catch {
          // Couldn't confirm onboarding status — fall through to check-in.
        }

        setUserName(user.fullName);
        setCheckInOpen(true);
      })
      .catch((err) => {
        setAsyncError(
          err instanceof ApiError ? err.message : "Google sign-in failed. Please try again.",
        );
      });
  }, [accessToken, refreshToken, router]);

  return (
    <>
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

      <CheckInModal
        open={isCheckInOpen}
        onClose={() => setCheckInOpen(false)}
        name={userName}
      />
    </>
  );
}
