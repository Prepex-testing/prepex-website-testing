"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthCard } from "@/components/layout/AuthCard";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { OtpInput } from "@/components/ui/OtpInput";
import { verifyOtp, ApiError } from "@/lib/api/auth";
import { saveSession } from "@/lib/auth/session";

export default function EmailVerificationPage() {
  return (
    <Suspense fallback={<AuthCard>{null}</AuthCard>}>
      <EmailVerificationForm />
    </Suspense>
  );
}

function EmailVerificationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const { data } = await verifyOtp({ email, otp });
      saveSession(data.tokens, data.user);
      router.push("/onboarding/preparing-for");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Something went wrong. Please try again.",
      );
      setSubmitting(false);
    }
  };

  return (
    <AuthCard>
      <div className="flex flex-col items-center gap-6">
        <Logo size="compact" />

        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-h1 text-ink">Verify your email</h1>
          <p className="text-sm text-muted">
            We&apos;ve sent a 6-digit code to{" "}
            <span className="font-semibold text-ink">{email}</span>.
            <br />
            Enter it below to continue.
          </p>
        </div>

        {error && (
          <p
            role="alert"
            className="w-full rounded-lg bg-danger-bg px-3 py-2 text-center text-xs font-medium text-danger"
          >
            {error}
          </p>
        )}

        <OtpInput value={otp} onChange={setOtp} />

        <p className="text-sm text-muted">
          Didn&apos;t receive the code?{" "}
          <button
            type="button"
            className="font-semibold text-ink underline"
          >
            Resend Code
          </button>{" "}
          (in 45 sec)
        </p>

        <Button
          variant="primary"
          onClick={handleVerify}
          disabled={isSubmitting}
          className="disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Verifying..." : "Verify & Continue"}
        </Button>

        <Link href="/create-account" className="text-sm font-semibold text-ink">
          Change Email
        </Link>
      </div>
    </AuthCard>
  );
}
