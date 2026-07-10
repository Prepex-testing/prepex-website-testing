"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { AuthCard } from "@/components/layout/AuthCard";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Stepper } from "@/components/ui/Stepper";
import { StepProgress } from "@/components/ui/StepProgress";
import { CloudSunIcon, SunIcon, CloudMoonIcon, MoonIcon } from "@/components/ui/icons";

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
  { id: "evening", label: "Evening", range: "4 PM - 9 PM", icon: <CloudMoonIcon /> },
  { id: "night", label: "Night", range: "9 PM - 4 AM", icon: <MoonIcon /> },
];

function deriveStyle(selected: SlotId[]): string {
  if (selected.length === 0) return "Not set yet";
  const dayLeaning = selected.some((id) => id === "morning" || id === "midday");
  const nightLeaning = selected.some((id) => id === "evening" || id === "night");
  if (dayLeaning && !nightLeaning) return "Day person";
  if (nightLeaning && !dayLeaning) return "Night owl";
  return "Flexible";
}

export default function TimeSelectionPage() {
  const [weekdayHours, setWeekdayHours] = useState(4);
  const [weekendHours, setWeekendHours] = useState(8);
  const [sameEveryDay, setSameEveryDay] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<SlotId[]>(["morning"]);

  const handleWeekdayChange = (value: number) => {
    setWeekdayHours(value);
    if (sameEveryDay) setWeekendHours(value);
  };

  const handleSameEveryDayToggle = () => {
    setSameEveryDay((current) => {
      const next = !current;
      if (next) setWeekendHours(weekdayHours);
      return next;
    });
  };

  const toggleSlot = (id: SlotId) => {
    setSelectedSlots((current) =>
      current.includes(id) ? current.filter((slot) => slot !== id) : [...current, id],
    );
  };

  return (
    <AuthCard>
      <StepProgress
        step={4}
        totalSteps={5}
        backHref="/onboarding/where-do-you-study"
        showSkip
        skipHref="/onboarding/which-chapters-have-you-studied"
      />

      <div className="mt-4 flex flex-col gap-1">
        <h1 className="text-h1 text-ink">How many hours can you study daily?</h1>
        <p className="text-sm text-muted">
          This is the daily target your plan respects. Your real life, not aspirational
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-4 rounded-xl bg-tint-strong p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Stepper label="Weekdays" value={weekdayHours} onChange={handleWeekdayChange} />
          <Stepper
            label="Weekends"
            value={weekendHours}
            onChange={setWeekendHours}
            disabled={sameEveryDay}
          />
        </div>

        <Checkbox
          label="Same target every day"
          checked={sameEveryDay}
          onChange={handleSameEveryDayToggle}
        />
      </div>

      <div className="mt-6 flex flex-col gap-1">
        <p className="text-sm font-semibold text-ink">When do you usually study?</p>
        <p className="text-xs text-muted">Pick all that apply</p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {TIME_SLOTS.map((slot) => {
          const selected = selectedSlots.includes(slot.id);
          return (
            <button
              key={slot.id}
              type="button"
              onClick={() => toggleSlot(slot.id)}
              aria-pressed={selected}
              className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-colors ${
                selected
                  ? "border-brand bg-brand text-white"
                  : "border-brand/15 bg-surface text-ink"
              }`}
            >
              {slot.icon}
              <span className="text-xs font-semibold">{slot.label}</span>
              <span className={`text-[10px] ${selected ? "text-white/80" : "text-muted"}`}>
                {slot.range}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-muted">
        Helps crafting planner according to your timings when your brain works best
      </p>
      <p className="mt-1 text-sm font-semibold text-ink">
        Your style: {deriveStyle(selectedSlots)}
      </p>

      <Button
        href="/onboarding/which-chapters-have-you-studied"
        variant="primary"
        className="mt-6"
      >
        Continue
      </Button>
    </AuthCard>
  );
}
