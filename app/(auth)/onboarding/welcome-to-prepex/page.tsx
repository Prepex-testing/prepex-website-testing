"use client";

import { Button } from "@/components/ui/Button";
import { CheckIcon } from "@/components/ui/icons";
import { useStoredFullName } from "@/lib/auth/useStoredFullName";

export default function WelcomeToPrepexPage() {
  const name = useStoredFullName();

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-200 rounded-4xl bg-surface px-16 py-16 text-center shadow-modal">
        <div className="flex flex-col items-center">

          {/* Logo */}
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand text-white">
            <CheckIcon />
          </div>

          {/* Welcome */}
          <div className="mt-6">
            <h2 className="text-4xl font-bold text-ink">
              Welcome to Prepex{name ? `, ${name}` : ""}
            </h2>

            <p className="mt-2 text-lg leading-7 text-muted">
              You&apos;re all set
            </p>
          </div>

          {/* Heading */}
          <div className="mt-10">
            <h1 className="text-5xl font-bold leading-tight text-ink">
              Your first plan is ready
            </h1>

            <p className="mx-auto mt-4 max-w-2xl pb-3 text-xl leading-8 text-muted">
              We&apos;ve prepared a personalized plan to help you stay consistent
              and achieve your goals.
            </p>
          </div>

          {/* Button */}
          <Button
            href="/home"
            variant="primary"
            className="mt-8 h-15 w-71! rounded-full! px-10"
          >
            Go to Home Dashboard
          </Button>

        </div>
      </div>
    </main>
  );
}
