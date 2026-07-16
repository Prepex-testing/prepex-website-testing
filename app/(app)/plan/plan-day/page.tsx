"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { AddCustomTaskModal } from "@/components/plan/AddCustomTaskModal";
import { BellIcon, MinusIcon, StarIcon, PinIcon, PlusIcon } from "@/components/ui/icons";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";

const NO_STUDY_REASONS = ["Festival", "Family", "Health", "School exam", "Personal"];

const MOCK_DURATION_OPTIONS = [
  { value: "1", label: "1 Hour" },
  { value: "2", label: "2 Hours" },
  { value: "3", label: "3 Hours" },
  { value: "4", label: "4 Hours" },
];

type Marking = { type: "no-study"; reason: string } | { type: "mock"; name: string } | null;

export default function PlanDayPage() {
  const [marking, setMarking] = useState<Marking>(null);
  const [mockName, setMockName] = useState("");
  const [isAddTaskOpen, setAddTaskOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h1 text-ink">Plan this day</h1>
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

      {/* Date — 18px bold per spec */}
      <p className="text-lg font-bold text-ink">May 23, 2026 (Fri)</p>

      {/* Status banner — rounded-lg (8px), 24px padding, 4px accent bar,
          18px bold copy, per spec */}
      <div className="overflow-hidden rounded-lg border-l-4 border-brand bg-surface p-6 shadow-sm">
        <p className="text-lg font-bold text-ink">
          Currently: AI will generate your plan for this day
        </p>
      </div>

      {/* Section heading — 20px semibold, 28px line-height per spec */}
      <p className="text-xl font-semibold leading-7 text-ink">Mark this day as</p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* No-Study Day */}
        <div
          className={`rounded-2xl border-2 bg-surface p-8 ${
            marking?.type === "no-study" ? "border-brand" : "border-brand/10"
          }`}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-tint text-ink">
            <MinusIcon />
          </span>
          <p className="mt-3 text-xl font-semibold leading-7 text-ink">No-Study Day</p>
          <p className="mt-2 text-base leading-6 text-muted">
            Festival, family event, exam, or personal day. Plan will skip. Streak protected
          </p>
          <p className="mt-2 text-[10px] font-medium text-muted">2 of 8 used this month</p>

          <p className="mt-4 text-[10px] font-medium uppercase tracking-wide text-muted">
            Reason:
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {NO_STUDY_REASONS.map((reason) => (
              <Chip
                key={reason}
                selected={marking?.type === "no-study" && marking.reason === reason}
                onClick={() => setMarking({ type: "no-study", reason })}
              >
                {reason}
              </Chip>
            ))}
          </div>
        </div>

        {/* Mock Day */}
        <div className="rounded-2xl border border-brand/10 bg-surface p-8">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-tint text-ink">
            <StarIcon />
          </span>
          <p className="mt-3 text-xl font-semibold leading-7 text-ink">Mock Day</p>
          <p className="mt-2 text-base leading-6 text-muted">
            Mock test day. Plan will be light morning revision only
          </p>

          <div className="mt-4 flex flex-col gap-3">
            <Input
              label="Mock Name"
              name="mockName"
              placeholder="e.g. JEE Main Mock 4"
              value={mockName}
              onChange={(event) => setMockName(event.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Duration" options={MOCK_DURATION_OPTIONS} defaultValue="3" />
              <Input label="Time" name="mockTime" placeholder="09:00 AM" />
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setMarking({ type: "mock", name: mockName || "Mock Test" })}
            >
              Confirm Mock
            </Button>
          </div>
        </div>

        {/* Custom day */}
        <div className="rounded-2xl border border-brand/10 bg-surface p-8">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-tint text-ink">
            <PinIcon />
          </span>
          <p className="mt-3 text-xl font-semibold leading-7 text-ink">Custom day</p>
          <p className="mt-2 text-base leading-6 text-muted">
            Add anchor tasks. AI will build the rest of the day around them.
          </p>

          <button
            type="button"
            onClick={() => setAddTaskOpen(true)}
            className="mt-4 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-brand/25 py-2.5 text-sm font-semibold text-ink hover:bg-tint-strong"
          >
            <PlusIcon />
            Add Anchor Task
          </button>

          <div className="mt-4 flex items-center justify-between rounded-lg bg-tint-strong px-3 py-2 text-xs">
            <span className="flex items-center gap-1 text-ink">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              Physics Lab Class
            </span>
            <span className="text-muted">2:00 PM</span>
          </div>
        </div>
      </div>

      {/* Confirmation toast — 380x52, rounded-2xl (16px), 16/24 padding, per spec */}
      {marking && (
        <div className="flex justify-center">
          <div className="min-w-[380px] rounded-2xl bg-brand px-6 py-4 text-sm font-medium text-white">
            May 23 marked as {marking.type === "no-study" ? "No-Study Day" : "Mock Day"}.{" "}
            <button
              type="button"
              onClick={() => setMarking(null)}
              className="font-semibold underline"
            >
              Undo?
            </button>
          </div>
        </div>
      )}

      <AddCustomTaskModal open={isAddTaskOpen} onClose={() => setAddTaskOpen(false)} />
    </div>
  );
}