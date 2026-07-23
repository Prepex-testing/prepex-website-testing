"use client";

import { Suspense, useState } from "react";
import type { SubmitEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthCard } from "@/components/layout/AuthCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MailIcon, CheckCircleIcon } from "@/components/ui/icons";
import { forgotPassword, ApiError } from "@/lib/api/auth";

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<AuthCard>{null}</AuthCard>}>
      <ForgotPasswordForm />
    </Suspense>
  );
}

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const [isSent, setSent] = useState(false);

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Something went wrong. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (isSent) {
    return (
      <AuthCard>
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success-bg text-success">
            <CheckCircleIcon />
          </span>
          <h1 className="text-h1 text-ink">Check your email</h1>
          <p className="text-sm text-muted">
            If <span className="font-semibold text-ink">{email}</span> is
            registered, we&apos;ve sent a link to reset your password.
          </p>
          <Link href="/login" className="font-semibold text-ink underline">
            Back to Login
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-h1 text-ink">Forgot password?</h1>
        <p className="text-sm text-muted">
          We&apos;ll send a reset link to your email.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
        {error && (
          <p
            role="alert"
            className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger"
          >
            {error}
          </p>
        )}

        <Input
          label="Email Address"
          icon={<MailIcon />}
          name="email"
          type="email"
          value={email}
          readOnly
          required
        />

        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting || !email}
          className="disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Sending..." : "Send Reset Link"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Remembered your password?{" "}
        <Link href="/login" className="font-semibold text-ink underline">
          Login
        </Link>
      </p>
    </AuthCard>
  );
}
