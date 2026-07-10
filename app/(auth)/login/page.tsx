"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthCard } from "@/components/layout/AuthCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MailIcon, LockIcon, GoogleIcon, AppleIcon } from "@/components/ui/icons";
import { CheckInModal } from "@/components/check-in/CheckInModal";

export default function LoginPage() {
  const [isCheckInOpen, setCheckInOpen] = useState(false);

  return (
    <>
    <AuthCard>
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-h1 text-ink">Welcome back</h1>
        <p className="text-sm text-muted">Pick up where you left off</p>
      </div>

      <div className="mt-8 flex flex-col gap-5">
        <Input
          label="Email Address"
          icon={<MailIcon />}
          name="email"
          type="email"
          placeholder="Rohan@example.com"
        />
        <Input
          label="Password"
          icon={<LockIcon />}
          name="password"
          type="password"
          placeholder="Enter password"
        />

        <Button variant="primary" onClick={() => setCheckInOpen(true)}>
          Log In
        </Button>

        <div className="flex items-center gap-4 text-xs text-muted">
          <span className="h-px flex-1 bg-brand/10" />
          or continue with
          <span className="h-px flex-1 bg-brand/10" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary">
            <GoogleIcon />
            Google
          </Button>
          <Button variant="secondary">
            <AppleIcon />
            Apple
          </Button>
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        Don&apos;t have an account?{" "}
        <Link
          href="/create-account"
          className="font-semibold text-ink underline"
        >
          Create an Account
        </Link>
      </p>
    </AuthCard>

    <CheckInModal
      open={isCheckInOpen}
      onClose={() => setCheckInOpen(false)}
      name="Rohan"
    />
    </>
  );
}
