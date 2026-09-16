"use client";

import { Suspense, useState } from "react";
import type { SubmitEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthCard } from "@/components/layout/AuthCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MailIcon, LockIcon, GoogleIcon } from "@/components/ui/icons";
import { login, getGoogleAuthUrl, ApiError } from "@/lib/api/auth";
import { saveSession } from "@/lib/auth/session";
import { markAccountRestored } from "@/lib/auth/accountRestored";
import { resolveAuthedLanding } from "@/lib/auth/onboardingGate";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  const handleForgotPassword = () => {
    if (!email.trim()) {
      setError("Enter your email address to reset your password.");
      return;
    }
    setError(null);
    router.push(`/forgot-password?email=${encodeURIComponent(email)}`);
  };

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { data } = await login({ email, password });
      saveSession(data.tokens, data.user);
      if (data.restored) markAccountRestored();

      router.push(await resolveAuthedLanding());
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        router.push(`/email-verification?email=${encodeURIComponent(email)}`);
        return;
      }
      setError(
        err instanceof ApiError ? err.message : "Something went wrong. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCard>
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-h1 text-ink">Welcome back</h1>
        <p className="text-sm text-muted">Pick up where you left off</p>
      </div>

      {/* useSearchParams needs a Suspense boundary; keeping it around just the
          notice lets the rest of the page still prerender. */}
      <Suspense fallback={null}>
        <DeletionScheduledNotice />
      </Suspense>

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
          placeholder="Rohan@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <div className="flex flex-col gap-2">
          <Input
            label="Password"
            icon={<LockIcon />}
            name="password"
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <button
            type="button"
            onClick={handleForgotPassword}
            className="self-end text-xs font-semibold text-ink underline"
          >
            Forgot password?
          </button>
        </div>

        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting}
          className="disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Logging in..." : "Log In"}
        </Button>

        <div className="flex items-center gap-4 text-xs text-muted">
          <span className="h-px flex-1 bg-brand/10" />
          or continue with
          <span className="h-px flex-1 bg-brand/10" />
        </div>

        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            window.location.href = getGoogleAuthUrl();
          }}
        >
          <GoogleIcon />
          Google
        </Button>
      </form>

      <p className="mt-6 border-t border-tint pt-5 text-center text-[16px] font-bold leading-[1.4] text-muted dark:text-ink">
        Don't have an account?{" "}
        <Link
          href="/create-account"
          className="mt-2 block font-semibold text-ink underline dark:text-cta sm:mt-0 sm:inline"
        >
          Create an Account
        </Link>
      </p>
    </AuthCard>
  );
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Shown after Account Settings schedules a deletion and signs the student out
 * — `?deletionScheduled=<ISO>` carries the moment it becomes final. It tells
 * them the one thing they can still do about it.
 */
function DeletionScheduledNotice() {
  const searchParams = useSearchParams();
  const finalAt = searchParams.get("deletionScheduled");
  if (!finalAt) return null;

  const date = new Date(finalAt);
  const readable = Number.isNaN(date.getTime())
    ? null
    : `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;

  return (
    <div role="status" className="mt-6 rounded-xl border border-warning/30 bg-warning-bg px-4 py-3 text-left">
      <p className="text-[14px] font-bold text-warning">Your account is scheduled for deletion.</p>
      <p className="mt-1 text-[13px] leading-5 text-body-text">
        {readable ? `It will be deleted permanently on ${readable}. ` : ""}
        Sign in before then to restore it.
      </p>
    </div>
  );
}
