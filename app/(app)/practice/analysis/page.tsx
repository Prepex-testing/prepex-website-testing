"use client";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useTheme } from "@/components/theme/ThemeProvider";
import { UserMenu } from "@/components/layout/UserMenu";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  BellIcon,
  // ClockIcon,
  XIcon,
  // AlertTriangleIcon,
  // BookIcon,
  // HelpCircleIcon,
  // CheckIcon,
} from "@/components/ui/icons";
import { ClockIcon, ConceptualIcon, TimeIcon, DiceIcon, VectorIcon, CheckIcon } from "@/assets/icons";
const OPTIONS = [
  { key: "A", value: "√15 units" },
  { key: "B", value: "√21 units" },
  { key: "C", value: "4 units" },
  { key: "D", value: "3 units" },
];

const CORRECT_KEY = "A";
const SELECTED_KEY = "B";

const MISTAKE_TAGS = [
  { id: "silly-error", label: "Silly Error", icon: <VectorIcon /> },
  { id: "conceptual-gap", label: "Conceptual Gap", icon: <ConceptualIcon /> },
  { id: "time-pressure", label: "Time Pressure", icon: <TimeIcon /> },
  { id: "wild-guess", label: "Wild Guess", icon: <DiceIcon /> },
];

export default function QuestionAnalysisPage() {
  const { resolvedTheme } = useTheme();
  const [tag, setTag] = useState("conceptual-gap");
  const [isComplete, setComplete] = useState(false);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h1 text-ink">Question Analysis</h1>
        <div className="flex shrink-0 items-center gap-4">
          <ThemeToggle />
          <button
            type="button"
            aria-label="Notifications"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-icon-action-bg text-icon-action-text transition-colors hover:bg-tint-strong"
          >
            <BellIcon />
          </button>
          <UserMenu />
        </div>
      </div>


      <div className="rounded-2xl border border-brand/10 bg-surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-wide text-ink">
            Question Context
          </p>
          <span
            className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide"
            style={
              resolvedTheme === "dark"
                ? { background: "#FAF7F2", color: "#111145" }
                : { background: "#EEF0F8", color: "#1A1A4E" }
            }
          >
            Level: Advanced
          </span>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-body-text">
          Find the length of the common internal tangent to the circles x² + y² − 2x − 4y + 4
          = 0 and x² + y² + 10x + 2y + 22 = 0.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {OPTIONS.map((option) => {
            const isSelected = option.key === SELECTED_KEY;
            return (
              <div
                key={option.key}
                className={`rounded-xl border p-4 ${isSelected ? "border-[1.5px] border-[#F59E0B] bg-cta/5" : "border-brand/10"
                  }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                    Option {option.key}
                    {isSelected && (
                      <span className="ml-1 normal-case text-[#F59E0B]">(Selected)</span>
                    )}
                  </p>
                  {isSelected && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-[#F59E0B]">
                      Your answer
                      <XIcon />
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-sm font-semibold text-ink">
                  {option.value.startsWith("√") ? (
                    <>
                      <span className="mr-0.5">√</span>
                      {option.value.slice(1)}
                    </>
                  ) : (
                    option.value
                  )}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-brand/10 pt-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#F59E0B]">
              Your Answer
            </p>
            <p className="flex items-center gap-1 text-sm font-bold text-[#F59E0B]">
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

        <p className="mt-4 flex items-center gap-1.5 text-xs ">
          <ClockIcon />
          Time Taken: 2:14
        </p>
      </div>

      {/* Tag This Mistake card */}
      <div className="rounded-2xl border border-ink/8 bg-surface p-6">
        <p className="text-[14px] font-bold uppercase leading-5 tracking-[1.4px] text-ink">
          Tag This Mistake
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3 lg:justify-start">
          {MISTAKE_TAGS.map((item) => {
            const isSelected = tag === item.id;
            const stateColor = isSelected
              ? "text-[#1A1A4E] dark:text-white"
              : "text-[#333333] dark:text-muted";

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTag(item.id)}
                aria-pressed={isSelected}
                className={`flex h-[134px] w-full max-w-[129px] shrink-0 flex-col items-center rounded-2xl border px-[36px] pt-5 pb-9 transition-colors ${isSelected
                  ? "border-[#1A1A4E] bg-[#EEF0F8] dark:border-white dark:bg-transparent"
                  : "border-[#E5E7EB] bg-white hover:border-[#1A1A4E]/20 dark:border-[#FAF7F214] dark:bg-[#FAF7F214] dark:hover:bg-[#FAF7F21A]"
                  }`}
              >
                <span
                  className={`flex items-center justify-center [&>svg]:h-12 [&>svg]:w-12 ${stateColor}`}
                >
                  {item.icon}
                </span>

                <span
                  className={`mt-3 text-center font-['Plus_Jakarta_Sans'] text-[12px] font-bold leading-4 tracking-normal ${stateColor}`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Button
          variant="secondary"
          size="sm"
          className="h-13.5 w-full rounded-full border-ink text-[18px] font-bold text-ink hover:bg-[#FF7A59]!"
        >
          Add Personal Note
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="h-13.5 w-full rounded-full border-ink text-[18px] font-bold text-ink hover:bg-[#FF7A59]!"
          onClick={() => setComplete(true)}
        >
          {isComplete ? (
            <>
              <CheckIcon />
              Completed
            </>
          ) : (
            "Mark Complete"
          )}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="h-13.5 w-full rounded-full border-ink text-[18px] font-bold text-ink hover:bg-[#FF7A59]!"
        >
          View Full Solution
        </Button>
      </div>
    </div>
  );
}