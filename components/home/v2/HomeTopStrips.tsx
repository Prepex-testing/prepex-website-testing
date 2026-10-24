"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Flame } from "lucide-react";
import { MOODS, type Mood } from "@/components/check-in/moods";

type GreetingProps = {
  greeting: string;
  firstName: string;
  streakCount: number | null;
  dateText: string;
  examCountdown: string | null;
  /** Theme toggle, bell and account menu. */
  actions: ReactNode;
};

/** 1. Greeting strip: who, which day, the streak flame, and the exam countdown. */
export function GreetingStrip({ greeting, firstName, streakCount, dateText, examCountdown, actions }: GreetingProps) {
  return (
    <header className="flex items-start justify-between gap-3" data-testid="home-greeting">
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-extrabold leading-tight text-ink lg:text-h1">
          {greeting}, {firstName}
        </h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-muted">
          <span data-testid="home-date">{dateText}</span>
          <Link
            href="/home/streak"
            data-coach="streak-card"
            data-testid="home-streak"
            aria-label={streakCount !== null ? `${streakCount} day streak. Open streak details.` : "Open streak details"}
            className="flex min-h-9 items-center gap-1 rounded-full bg-[#FFF5F3] px-3 py-1 text-[13px] font-bold text-cta hover:bg-[#FFE9E4] dark:bg-[#FAF7F214] dark:hover:bg-[#FAF7F21f]"
          >
            <Flame className="size-4" aria-hidden fill="currentColor" />
            {streakCount !== null ? `${streakCount} day${streakCount === 1 ? "" : "s"}` : "Streak"}
          </Link>
          {examCountdown && <span data-testid="home-exam-countdown">{examCountdown}</span>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">{actions}</div>
    </header>
  );
}

type CheckInProps = {
  mood: Mood | null;
  busy: boolean;
  onPick: (mood: Mood) => void;
  onChange: () => void;
};

/** 2. Check-in strip: five emoji, one tap, a few seconds. Once done it shrinks to today's mood with a Change link. */
export function CheckInStrip({ mood, busy, onPick, onChange }: CheckInProps) {
  if (mood) {
    return (
      <section data-coach="energy-card" data-testid="checkin-done" aria-label="Today's energy" className="flex items-center justify-between gap-3 rounded-2xl border border-brand/10 bg-surface px-4 py-3">
        <p className="flex min-w-0 items-center gap-3 text-[14px] text-muted">
          <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-tint-strong text-[22px] dark:bg-[#FAF7F214]">
            {mood.emoji}
          </span>
          <span className="min-w-0">
            Today&apos;s energy
            <span className="block truncate text-[16px] font-bold text-ink">{mood.label}</span>
          </span>
        </p>
        <button type="button" onClick={onChange} className="min-h-11 shrink-0 rounded-lg px-3 text-[13px] font-bold text-ink underline-offset-2 hover:underline">
          Change
        </button>
      </section>
    );
  }
  return (
    <section data-coach="energy-card" data-testid="checkin-strip" aria-label="How are you feeling today?" className="flex flex-col gap-3 rounded-2xl border border-brand/10 bg-surface p-4">
      <p className="text-[15px] font-bold text-ink">How are you feeling today?</p>
      <div className="grid grid-cols-5 gap-2" role="group" aria-label="Pick how you feel">
        {MOODS.map((m) => (
          <button
            key={m.id}
            type="button"
            disabled={busy}
            onClick={() => onPick(m)}
            aria-label={m.label}
            data-testid={`mood-${m.id}`}
            className="flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-xl border border-brand/15 bg-surface text-[26px] leading-none transition-colors hover:border-brand/40 hover:bg-tint-strong active:scale-95 disabled:opacity-50"
          >
            <span aria-hidden>{m.emoji}</span>
            <span className="text-[10px] font-semibold text-muted">{m.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
