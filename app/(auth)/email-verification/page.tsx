"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/layout/AuthCard";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { OtpInput } from "@/components/ui/OtpInput";

export default function EmailVerificationPage() {
  const router = useRouter();

  return (
    <AuthCard>
      <div className="flex flex-col items-center gap-6">
        <Logo size="compact" />

        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-h1 text-ink">Verify your email</h1>
          <p className="text-sm text-muted">
            We&apos;ve sent a 6-digit code to{" "}
            <span className="font-semibold text-ink">
              Rohan@example.com
            </span>
            .
            <br />
            Enter it below to continue.
          </p>
        </div>

        <OtpInput />

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
          onClick={() => router.push("/onboarding/preparing-for")}
        >
          Verify &amp; Continue
        </Button>

        <Link href="/create-account" className="text-sm font-semibold text-ink">
          Change Email
        </Link>
      </div>
    </AuthCard>
  );
}
