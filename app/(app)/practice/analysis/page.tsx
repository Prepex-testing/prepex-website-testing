"use client";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  BellIcon,
  ClockIcon,
  XIcon,
  AlertTriangleIcon,
  BookIcon,
  HelpCircleIcon,
  CheckIcon,
} from "@/components/ui/icons";

const OPTIONS = [
  { key: "A", value: "√15 units" },
  { key: "B", value: "√21 units" },
  { key: "C", value: "4 units" },
  { key: "D", value: "3 units" },
];

const CORRECT_KEY = "A";
const SELECTED_KEY = "B";

const MISTAKE_TAGS = [
  { id: "silly-error", label: "Silly Error", icon: <AlertTriangleIcon /> },
  { id: "conceptual-gap", label: "Conceptual Gap", icon: <BookIcon /> },
  { id: "time-pressure", label: "Time Pressure", icon: <ClockIcon /> },
  { id: "wild-guess", label: "Wild Guess", icon: <HelpCircleIcon /> },
];

export default function QuestionAnalysisPage() {
  const [tag, setTag] = useState("conceptual-gap");
  const [isComplete, setComplete] = useState(false);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h1 text-ink">Question Analysis</h1>
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

      <div className="rounded-2xl border border-brand/10 bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">
            Question Context
          </p>
          <span className="rounded-full bg-tint px-2 py-0.5 text-[10px] font-bold uppercase text-ink">
            Level: Advanced
          </span>
        </div>

        <p className="mt-3 text-sm text-body-text">
          Find the length of the common internal tangent to the circles x² + y² - 2x - 4y + 4
          = 0 and x² + y² + 10x + 2y + 22 = 0.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {OPTIONS.map((option) => {
            const isCorrect = option.key === CORRECT_KEY;
            const isSelected = option.key === SELECTED_KEY;
            return (
              <div
                key={option.key}
                className={`rounded-xl border p-3 ${
                  isSelected
                    ? "border-cta bg-cta/10"
                    : isCorrect
                      ? "border-brand bg-tint-strong"
                      : "border-brand/10"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                    Option {option.key}
                    {isSelected && (
                      <span className="ml-1 normal-case text-cta">(Selected)</span>
                    )}
                  </p>
                  {isSelected && <XIcon />}
                </div>
                <p className="mt-1 text-sm font-semibold text-ink">{option.value}</p>
                {isSelected && (
                  <p className="mt-1 text-[10px] font-semibold text-cta">Your answer</p>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-cta">Your Answer</p>
            <p className="flex items-center gap-1 text-sm font-bold text-cta">
              Option {SELECTED_KEY}
              <XIcon />
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-wide text-success">
              Correct
            </p>
            <p className="text-sm font-bold text-success">Option {CORRECT_KEY}</p>
          </div>
        </div>

        <p className="mt-3 flex items-center gap-1 text-xs text-muted">
          <ClockIcon />
          Time Taken: 2:14
        </p>
      </div>

      <div className="rounded-2xl border border-brand/10 bg-surface p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">
          Tag This Mistake
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {MISTAKE_TAGS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTag(item.id)}
              aria-pressed={tag === item.id}
              className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-colors ${
                tag === item.id
                  ? "border-brand bg-tint-strong"
                  : "border-brand/10 hover:bg-tint-strong/50"
              }`}
            >
              <span className="text-ink">{item.icon}</span>
              <span className="text-xs font-semibold text-ink">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" size="sm">
          Add Personal Note
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setComplete(true)}>
          {isComplete ? (
            <>
              <CheckIcon />
              Completed
            </>
          ) : (
            "Mark Complete"
          )}
        </Button>
        <Button variant="primary" size="sm">
          View Full Solution
        </Button>
      </div>
    </div>
  );
}
