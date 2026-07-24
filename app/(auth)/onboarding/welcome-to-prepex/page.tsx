"use client";

import { Button } from "@/components/ui/Button";
import { CheckIcon } from "@/components/ui/icons";
import { useStoredFullName } from "@/lib/auth/useStoredFullName";

export default function WelcomeToPrepexPage() {
  const name = useStoredFullName();

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8 sm:px-6 sm:py-12">
      <div className="w-full max-w-200 rounded-3xl bg-surface px-6 py-10 text-center shadow-modal sm:rounded-4xl sm:px-12 sm:py-14 lg:px-16 lg:py-16">
        <div className="flex flex-col items-center">

          {/* Logo */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand text-white sm:h-20 sm:w-20">
            <CheckIcon />
          </div>

          {/* Welcome */}
          <div className="mt-6">
            <h2 className="text-2xl font-bold text-ink sm:text-3xl lg:text-4xl">
              Welcome to Prepex{name ? `, ${name}` : ""}
            </h2>

            <p className="mt-2 text-base leading-7 text-muted sm:text-lg">
              You&apos;re all set
            </p>
          </div>

          {/* Heading */}
          <div className="mt-8 sm:mt-10">
            <h1 className="text-3xl font-bold leading-tight text-ink sm:text-4xl lg:text-5xl">
              Your first plan is ready
            </h1>

            <p className="mx-auto mt-4 max-w-2xl pb-3 text-base leading-7 text-muted sm:text-lg lg:text-xl lg:leading-8">
              We&apos;ve prepared a personalized plan to help you stay consistent
              and achieve your goals.
            </p>
          </div>

          {/* Button */}
          <Button
            href="/home"
            variant="primary"
            className="mt-8 h-14 w-full rounded-full! px-10 sm:h-15 sm:w-71!"
          >
            Go to Home Dashboard
          </Button>

        </div>
      </div>
    </main>
  );
}
