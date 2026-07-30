"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthCard } from "@/components/layout/AuthCard";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { OtpInput } from "@/components/ui/OtpInput";
import { verifyOtp, resendOtp, ApiError } from "@/lib/api/auth";
import { saveSession } from "@/lib/auth/session";

const RESEND_COUNTDOWN_SECONDS = 45;

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
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_COUNTDOWN_SECONDS);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (countdown === 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : prev));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleResend = async () => {
    setError(null);
    setResendMessage(null);
    setIsResending(true);
    try {
      const { message } = await resendOtp(email);
      setResendMessage(message);
      setCountdown(RESEND_COUNTDOWN_SECONDS);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Something went wrong. Please try again.",
      );
    } finally {
      setIsResending(false);
    }
  };

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
      {/* HEADER — 333x75, gap 4px */}
      <div className="flex flex-col items-center gap-1">
        <Logo size="compact" />
      </div>

      {/* SECOND CONTAINER — 560x348, gap 32px */}
      <div className="mt-10 flex flex-col items-center gap-6 sm:mt-14 sm:gap-8">
        {/* TITLE BLOCK — 560x96, gap 8px */}
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-[24px] font-bold leading-[32px] tracking-[-0.48px] text-ink sm:text-[32px] sm:leading-[40px] sm:tracking-[-0.64px]">
            Verify your email
          </h1>
          <p className="text-[14px] leading-[22px] text-[#8B8998] sm:text-[16px] sm:leading-[24px]">
            We&apos;ve sent a 6-digit code to{" "}
            <span className="font-semibold">{email}</span>.
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

        {resendMessage && (
          <p
            role="status"
            className="w-full rounded-lg bg-success-bg px-3 py-2 text-center text-xs font-medium text-success"
          >
            {resendMessage}
          </p>
        )}

        {/* OTP + BELOW BLOCK — 465 wide, gap 24px */}
        <div className="flex w-full max-w-[465px] flex-col items-center gap-5 sm:gap-6">
          {/* OTP ROW — 465x64, gap 16px, boxes 64x64 radius 8 */}
          <OtpInput value={otp} onChange={setOtp} />

          {/* LAST BLOCK — 465x132, gap 12px */}
          <div className="flex w-full flex-col items-center gap-3">
            <p className="px-2 pb-2 text-center text-[13px] font-semibold leading-[18px] sm:px-[64.77px] sm:pb-4 sm:text-[14px] sm:leading-[20px]">
              Didn&apos;t receive the code?{" "}
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="text-ink underline disabled:cursor-not-allowed disabled:opacity-60"
              >
                Resend Code
              </button>{" "}
              ( {countdown} sec )
            </p>

            <Button
              variant="primary"
              onClick={handleVerify}
              disabled={isSubmitting}
              className="h-[52px] w-full rounded-2xl text-[15px] font-bold disabled:cursor-not-allowed disabled:opacity-60 sm:h-[57px] sm:text-[16px]"
            >
              {isSubmitting ? "Verifying..." : "Verify & Continue"}
            </Button>

            <Link
              href="/create-account"
              className="text-[14px] font-bold leading-[100%] text-muted dark:text-ink sm:text-[16px]"
            >
              Change Email
            </Link>
          </div>
        </div>
      </div>
    </AuthCard>
  );
}
