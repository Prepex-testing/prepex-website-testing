"use client";

import { useState } from "react";
import type { SubmitEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/layout/AuthCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { UserIcon, MailIcon, LockIcon } from "@/components/ui/icons";
import { registerAccount, ApiError } from "@/lib/api/auth";

export default function CreateAccountPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await registerAccount({ fullName, email, password });
      router.push(`/email-verification?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Something went wrong. Please try again.",
      );
      setSubmitting(false);
    }
  };

  return (
    <AuthCard>
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-[32px] font-bold leading-[40px] tracking-[-0.64px] text-ink">
          Create your account
        </h1>
        <p className="text-[16px] leading-[24px] text-muted">
          Quick setup. Takes 30 seconds.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-6 pt-2">
        {error && (
          <p
            role="alert"
            className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger"
          >
            {error}
          </p>
        )}

        <Input
          label="Full Name"
          helperText="Used in your daily plan greetings"
          icon={<UserIcon />}
          name="fullName"
          type="text"
          placeholder="Rohan"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          required
        />
        <Input
          label="Email Address"
          helperText="For plan reminders and account events"
          icon={<MailIcon />}
          name="email"
          type="email"
          placeholder="Rohan@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <Input
          label="Password"
          helperText="At least 8 characters with one number"
          icon={<LockIcon />}
          name="password"
          type="password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          required
        />

        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting}
          className="h-[57px] rounded-2xl text-[16px] font-bold disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Signing up..." : "Sign up"}
        </Button>
      </form>

      <p className="mt-4 text-center text-[12px] leading-[100%] text-muted">
        By clicking &ldquo;Sign Up&rdquo;, you agree to our{" "}
        <Link href="/terms" className="text-ink">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="text-ink">
          Privacy Policy
        </Link>
      </p>

      <p className="mt-6 border-t border-tint pt-5 text-center text-[16px] font-bold leading-[100%] text-muted dark:text-ink">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-bold text-ink underline dark:text-cta"
        >
          Login
        </Link>
      </p>
    </AuthCard>
  );
}
