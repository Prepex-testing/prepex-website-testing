"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/layout/AuthCard";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { RadioOption } from "@/components/ui/RadioOption";
import { Stepper } from "@/components/ui/Stepper";
import { StepProgress } from "@/components/ui/StepProgress";
// import { CloudSunIcon, SunIcon, CloudMoonIcon, MoonIcon } from "@/components/ui/icons";
import {CloudSunIcon,SunIcon} from "@/assets/icons";
import { getOnboardingProgress, saveStudySchedule, skipOnboardingStep } from "@/lib/api/onboarding";
import type { ChronotypeValue } from "@/lib/api/onboarding";
import { ApiError } from "@/lib/api/http";
import { useScheduleSuggestion } from "@/lib/onboarding/schedule-suggestion-context";

type SlotId = "morning" | "midday" | "evening" | "night";

type TimeSlot = {
  id: SlotId;
  label: string;
  range: string;
  icon: ReactNode;
};

const TIME_SLOTS: TimeSlot[] = [
  { id: "morning", label: "Morning", range: "5 AM - 11 AM", icon: <CloudSunIcon /> },
  { id: "midday", label: "Midday", range: "11 AM - 4 PM", icon: <SunIcon /> },
  { id: "evening", label: "Evening", range: "4 PM - 9 PM", icon: <SunIcon /> },
  { id: "night", label: "Night", range: "9 PM - 4 AM", icon: <CloudSunIcon /> },
];

const CHRONOTYPE_OPTIONS: Array<{ value: ChronotypeValue; label: string }> = [
  { value: "MORNING_PERSON", label: "Morning Person" },
  { value: "MIDDAY_PERSON", label: "Day Person" },
  { value: "EVENING_PERSON", label: "Evening Person" },
  { value: "NIGHT_PERSON", label: "Night Person" },
];

const DEFAULT_CHRONOTYPE: ChronotypeValue = "MIDDAY_PERSON";

export default function TimeSelectionPage() {
  const router = useRouter();
  const [weekdayHours, setWeekdayHours] = useState(4);
  const [weekendHours, setWeekendHours] = useState(8);
  const [sameEveryDay, setSameEveryDay] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<SlotId[]>(["morning"]);
  const [chronotype, setChronotype] = useState<ChronotypeValue>(DEFAULT_CHRONOTYPE);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const [isSkipping, setSkipping] = useState(false);
  const { suggestion } = useScheduleSuggestion();

  useEffect(() => {
    getOnboardingProgress()
      .then(({ data }) => {
        const profile = data.profile;
        if (profile?.weekdayHours != null) setWeekdayHours(profile.weekdayHours);
        if (profile?.weekendHours != null) setWeekendHours(profile.weekendHours);
        if (profile) setSameEveryDay(profile.sameDailyTarget);

        // A saved answer always wins; a fresh step-3a upload suggestion only
        // fills in blanks the user hasn't already answered.
        const savedWindows = profile?.studyWindows.length ? profile.studyWindows : null;
        const effectiveWindows = savedWindows ?? suggestion?.studyWindows.map((w) => ({ window: w }));
        if (effectiveWindows?.length) {
          setSelectedSlots(effectiveWindows.map((entry) => entry.window.toLowerCase() as SlotId));
        }

        const effectiveChronotype = profile?.chronotype ?? suggestion?.chronotype;
        if (effectiveChronotype) setChronotype(effectiveChronotype);
      })
      .catch(() => {
        // Best-effort — fall back to a blank form if progress can't be loaded.
      });
    // Only the initial suggestion snapshot matters for prefill — deliberately
    // not re-running this on every context update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleWeekdayChange = (value: number) => {
    setWeekdayHours(value);
    if (sameEveryDay) setWeekendHours(value);
  };

  const handleSameEveryDayToggle = () => {
    setSameEveryDay((current) => {
      const next = !current;
      if (next) {
        setWeekdayHours(6);
        setWeekendHours(6);
      }
      return next;
    });
  };

  const toggleSlot = (id: SlotId) => {
    setSelectedSlots((current) =>
      current.includes(id) ? current.filter((slot) => slot !== id) : [...current, id],
    );
  };

  const handleContinue = async () => {
    if (selectedSlots.length === 0) {
      setError("Select at least one study window.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await saveStudySchedule({
        weekdayHours,
        weekendHours,
        sameDailyTarget: sameEveryDay,
        chronotype,
        studyWindows: selectedSlots.map(
          (slot) => slot.toUpperCase() as "MORNING" | "MIDDAY" | "EVENING" | "NIGHT",
        ),
      });
      router.push("/onboarding/which-chapters-have-you-studied");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Something went wrong. Please try again.",
      );
      setSubmitting(false);
    }
  };

  const handleSkip = async () => {
    setError(null);
    setSkipping(true);
    try {
      await skipOnboardingStep(4);
      router.push("/onboarding/which-chapters-have-you-studied");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Something went wrong. Please try again.",
      );
      setSkipping(false);
    }
  };

  return (
    <AuthCard>
      <StepProgress
        step={4}
        totalSteps={5}
        backHref="/onboarding/where-do-you-study"
        showSkip
        onSkip={handleSkip}
        skipDisabled={isSubmitting || isSkipping}
      />

      <div className="mt-4 flex flex-col gap-1">
        <h1 className="text-h1 text-ink">How many hours can you study daily?</h1>
        <p className="text-sm text-muted">
          This is the daily target your plan respects. Your real life, not aspirational
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-4 rounded-xl bg-tint-strong p-4 dark:bg-[#FAF7F2]/8">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Stepper label="Weekdays" value={weekdayHours} onChange={handleWeekdayChange} />
          <Stepper
            label="Weekends"
            value={weekendHours}
            onChange={setWeekendHours}
            disabled={sameEveryDay}
          />
        </div>

        <div className="w-full border-t border-black/5 pt-4 dark:border-[#FAF7F2]/[0.12]">
          <Checkbox
            label="Same target every day"
            checked={sameEveryDay}
            onChange={handleSameEveryDayToggle}
          />
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-1">
        <p className="text-sm font-semibold text-ink">When do you usually study?</p>
        <p className="text-xs text-muted">Pick all that apply</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {TIME_SLOTS.map((slot) => {
          const selected = selectedSlots.includes(slot.id);
          return (
            <button
              key={slot.id}
              type="button"
              onClick={() => toggleSlot(slot.id)}
              aria-pressed={selected}
              className={`flex flex-col items-center gap-1.5 rounded-lg border bg-surface px-2 py-4 text-center transition-colors ${
                selected
                  ? "rounded-xl border-[1.5px] border-brand shadow-hover dark:border-[#FAF7F2]"
                  : "border-brand/15 dark:border-[#FAF7F2]/6"
              }`}
            >
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                  selected
                    ? "bg-brand text-white dark:bg-[#FAF7F2] dark:text-[#0D0D2B]"
                    : "bg-icon-chip-bg text-ink dark:bg-[#FAF7F2]/8"
                }`}
              >
                {slot.icon}
              </span>
              <span className="text-xs font-semibold text-ink">{slot.label}</span>
              <span className="text-[10px] text-muted dark:text-ink">{slot.range}</span>
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-muted">
        Helps crafting planner according to your timings when your brain works best
      </p>

      <div className="mt-4 flex flex-col gap-3">
        <p className="text-sm font-semibold text-ink">Your style</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Chronotype">
          {CHRONOTYPE_OPTIONS.map((option) => (
            <RadioOption
              key={option.value}
              name="chronotype"
              value={option.value}
              label={option.label}
              selected={chronotype === option.value}
              onSelect={() => setChronotype(option.value)}
            />
          ))}
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger"
        >
          {error}
        </p>
      )}

      <Button
        variant="primary"
        onClick={handleContinue}
        disabled={isSubmitting || isSkipping}
        className="mt-6 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Saving..." : "Continue"}
      </Button>
    </AuthCard>
  );
}
