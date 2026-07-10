"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { RadioOption } from "@/components/ui/RadioOption";
import { ArrowLeftIcon, BellIcon, ClockIcon } from "@/components/ui/icons";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";

const OUTCOMES = [
  { id: "completed", label: "Completed as planned" },
  { id: "partial", label: "Partial credit" },
  { id: "distracted", label: "Distracted" },
  { id: "cancelled", label: "Cancel session" },
];

export default function WelcomeBackPage() {
  const [outcome, setOutcome] = useState("completed");

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/home/session" aria-label="Back to Focus Session" className="text-ink">
            <ArrowLeftIcon />
          </Link>
          <h1 className="text-h1 text-ink">Welcome Back</h1>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <button
            type="button"
            aria-label="Notifications"
            className="flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-tint-strong"
          >
            <BellIcon />
          </button>
          <UserMenu />
        </div>
      </div>

      <div className="mx-auto w-full max-w-xl rounded-2xl border border-brand/10 bg-surface p-5 sm:p-8">
        <div className="text-center">
          <span className="inline-flex items-center gap-1 rounded-full bg-tint-strong px-3 py-1 text-xs font-semibold text-ink">
            <ClockIcon />
            Session Overview
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-brand/10 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
              Active Task
            </p>
            <p className="mt-1 text-sm font-bold text-ink">Watch Coaching Lecture</p>
          </div>
          <div className="rounded-xl border border-brand/10 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
              Duration
            </p>
            <p className="mt-1 text-sm font-bold text-ink">62 mins elapsed</p>
          </div>
        </div>

        <p className="mt-5 text-center text-sm font-bold text-ink">How did it go?</p>

        <div className="mt-3 flex flex-col gap-3">
          {OUTCOMES.map((item) => (
            <RadioOption
              key={item.id}
              name="session-outcome"
              value={item.id}
              label={item.label}
              selected={outcome === item.id}
              onSelect={() => setOutcome(item.id)}
            />
          ))}
        </div>

        <Button href="/home/session" variant="primary" className="mt-6">
          Confirm
        </Button>
      </div>
    </div>
  );
}
