"use client";

import { useState } from "react";
import { GhostButton } from "@/components/ui/GhostButton";
import { ApiError } from "@/lib/api/http";
import { setLightDay, type PlanDay } from "@/lib/api/plannerV2";

const REASON: Record<NonNullable<PlanDay["lightDayOffer"]>, string> = {
  low_checkin: "Your last check-in said you were running low.",
  falling_hours: "Your study hours have dropped three days in a row.",
};

/**
 * "Switch to a Light Day?" The app only asks; the student decides. A Light Day is 30% less, keeps the class work and the most
 * important revision, and pauses the backlog. Once it is on, the same place says so and offers the way back.
 */
export function LightDayPrompt({ day, date, onChanged }: { day: PlanDay; date: string; onChanged: () => Promise<void> | void }) {
  const [busy, setBusy] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function answer(on: boolean) {
    setBusy(true);
    setError(null);
    try {
      await setLightDay(on, date);
      await onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't change that. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (day.lightDay) {
    return (
      <section data-testid="light-day-on" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand/10 bg-tint-strong px-4 py-3 dark:bg-[#FAF7F214]">
        <p className="min-w-0 text-[13px] leading-snug text-ink">
          <span className="font-bold">Light Day.</span> 30% less today. Your class work and your most important revision are kept, and the backlog waits.
        </p>
        <GhostButton data-testid="light-day-off" disabled={busy} onClick={() => void answer(false)}>
          {busy ? "Working…" : "Back to a full day"}
        </GhostButton>
        {error && (
          <p role="alert" className="w-full text-[12px] font-medium text-danger">
            {error}
          </p>
        )}
      </section>
    );
  }

  if (!day.lightDayOffer || declined) return null;
  return (
    <section data-testid="light-day-offer" aria-label="Switch to a Light Day?" className="flex flex-col gap-3 rounded-2xl border border-brand/15 bg-surface px-4 py-3.5">
      <div>
        <p className="text-[15px] font-bold text-ink">Switch to a Light Day?</p>
        <p className="mt-0.5 text-[13px] leading-snug text-body-text dark:text-ink/80">
          {REASON[day.lightDayOffer]} A Light Day is 30% less. Your class work and your most important revision stay, and the backlog waits for tomorrow.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <GhostButton data-testid="light-day-accept" disabled={busy} onClick={() => void answer(true)}>
          {busy ? "Working…" : "Yes, make today lighter"}
        </GhostButton>
        <GhostButton data-testid="light-day-decline" disabled={busy} onClick={() => setDeclined(true)}>
          No, keep today as it is
        </GhostButton>
      </div>
      {error && (
        <p role="alert" className="text-[12px] font-medium text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
