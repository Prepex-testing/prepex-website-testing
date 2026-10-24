"use client";

import { FOCUS_MODES, MODE_LABELS, type FocusMode } from "@/lib/focus/intent";

type Props = {
  value: FocusMode;
  onChange: (mode: FocusMode) => void;
  disabled?: boolean;
};

/** Pomodoro / Stopwatch / Countdown — one segmented control. */
export function ModeTabs({ value, onChange, disabled = false }: Props) {
  return (
    <div role="radiogroup" aria-label="Timer mode" className="grid grid-cols-3 gap-1 rounded-xl bg-tint-strong p-1 dark:bg-[#FAF7F214]" data-testid="mode-tabs">
      {FOCUS_MODES.map((mode) => {
        const active = mode === value;
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={active}
            data-testid={`mode-${mode}`}
            disabled={disabled}
            onClick={() => onChange(mode)}
            className={`flex min-h-11 items-center justify-center rounded-lg px-1 text-[13px] font-bold transition-colors sm:text-[14px] ${
              active ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
            } disabled:opacity-60`}
          >
            {MODE_LABELS[mode]}
          </button>
        );
      })}
    </div>
  );
}
