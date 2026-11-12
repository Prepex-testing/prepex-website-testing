"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthCard } from "@/components/layout/AuthCard";
import { Button } from "@/components/ui/Button";
import { magicSignin, ApiError } from "@/lib/api/auth";
import { saveSession } from "@/lib/auth/session";
import { resolveAuthedLanding } from "@/lib/auth/onboardingGate";
import { syncTargetRankAfterLogin } from "@/lib/insights/targetRank";

/**
 * The one-tap link in the pilot welcome email. The page only SIGNS IN when the student taps the button: a mail scanner
 * that merely opens the link cannot use the one-time token up.
 */
export default function MagicSigninPage() {
  return (
    <Suspense fallback={<AuthCard>{null}</AuthCard>}>
      <MagicSignin />
    </Suspense>
  );
}

function MagicSignin() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  const handleTap = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const { data } = await magicSignin(token);
      saveSession(data.tokens, data.user);
      await syncTargetRankAfterLogin(data.tokens.accessToken);
      router.push(await resolveAuthedLanding());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <AuthCard>
      <div className="flex flex-col items-center gap-1 text-center" data-testid="magic-page">
        <h1 className="text-h1 text-ink">Welcome to Prepex</h1>
        <p className="text-sm text-muted">{token ? "One tap and you are in." : "This sign-in link is not complete."}</p>
      </div>

      <div className="mt-8 flex flex-col gap-5">
        {error && (
          <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger" data-testid="magic-error">
            {error}
          </p>
        )}
        {token ? (
          <Button type="button" variant="primary" disabled={isSubmitting} onClick={() => void handleTap()} className="disabled:cursor-not-allowed disabled:opacity-60" data-testid="magic-open">
            {isSubmitting ? "Opening…" : "Open Prepex"}
          </Button>
        ) : (
          <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger" data-testid="magic-missing">
            Please open the link from your welcome email again.
          </p>
        )}
        <p className="text-center text-sm text-muted">
          Link not working?{" "}
          <Link href="/login" className="font-bold text-ink underline">
            Log in with your email and password
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}
