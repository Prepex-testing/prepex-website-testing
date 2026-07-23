"use client";

import { Suspense, useState } from "react";
import type { SubmitEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthCard } from "@/components/layout/AuthCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LockIcon, CheckCircleIcon } from "@/components/ui/icons";
import { resetPassword, ApiError } from "@/lib/api/auth";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthCard>{null}</AuthCard>}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const [isReset, setReset] = useState(false);

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!token) {
      setError("This reset link is invalid. Please request a new one.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await resetPassword({ token, password });
      setReset(true);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Something went wrong. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (isReset) {
    return (
      <AuthCard>
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success-bg text-success">
            <CheckCircleIcon />
          </span>
          <h1 className="text-h1 text-ink">Password reset</h1>
          <p className="text-sm text-muted">
            Your password has been updated. You can now log in with your new
            password.
          </p>
          <Button variant="primary" onClick={() => router.push("/login")}>
            Back to Login
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-h1 text-ink">Reset your password</h1>
        <p className="text-sm text-muted">Choose a new password below.</p>
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
          label="New Password"
          helperText="At least 8 characters with one uppercase letter and one number"
          icon={<LockIcon />}
          name="password"
          type="password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          required
        />
        <Input
          label="Confirm New Password"
          icon={<LockIcon />}
          name="confirmPassword"
          type="password"
          placeholder="Re-enter password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          minLength={8}
          required
        />

        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting}
          className="disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Resetting..." : "Reset Password"}
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
