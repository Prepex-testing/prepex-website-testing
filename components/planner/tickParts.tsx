"use client";

import type { ReactNode } from "react";

export type Recall = "easy" | "ok" | "hard";

export const RECALL_OPTIONS: { value: Recall; label: string; hint: string }[] = [
  { value: "easy", label: "Easy", hint: "I remembered it without effort" },
  { value: "ok", label: "OK", hint: "I got there with a little thought" },
  { value: "hard", label: "Hard", hint: "I had to look things up" },
];

/**
 * The revision tick: three buttons, one tap. Easy / OK / Hard is stored on the revision log and sets the next interval.
 * Nothing here is filled coral, so the sheet's own primary action (when it has one) stays the only coral button.
 */
export function RecallPicker({ busy, onPick }: { busy: boolean; onPick: (recall: Recall) => void }) {
  return (
    <div className="flex flex-col gap-2" role="group" aria-label="How well did you recall it?" data-testid="recall-picker">
      {RECALL_OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          disabled={busy}
          data-testid={`recall-${o.value}`}
          onClick={() => onPick(o.value)}
          className="flex min-h-16 items-center justify-between rounded-2xl border border-border-subtle bg-surface-elevated px-4 text-left transition hover:border-brand active:scale-[0.99] disabled:opacity-60"
        >
          <span className="text-[18px] font-extrabold text-ink">{o.label}</span>
          <span className="text-[13px] text-muted">{o.hint}</span>
        </button>
      ))}
    </div>
  );
}

/** A number with minus and plus buttons; the number is also a real input so a long count can be typed. */
export function CountStepper({ label, value, min = 0, max = 1000, onChange, testId, children }: { label: string; value: number; min?: number; max?: number; onChange: (n: number) => void; testId: string; children?: ReactNode }) {
  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(n)));
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[14px] font-semibold text-body-text dark:text-ink">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" aria-label={`Less ${label.toLowerCase()}`} data-testid={`${testId}-dec`} onClick={() => onChange(clamp(value - 1))} className="size-12 rounded-xl border border-border-subtle bg-surface-elevated text-[22px] font-bold text-ink">
          −
        </button>
        <input
          inputMode="numeric"
          aria-label={label}
          data-testid={testId}
          value={String(value)}
          onChange={(e) => onChange(clamp(Number(e.target.value.replace(/[^\d]/g, "")) || 0))}
          className="h-12 min-w-0 flex-1 rounded-xl border border-input-border bg-surface px-3 text-center text-[20px] font-extrabold text-ink outline-none focus:border-brand"
        />
        <button type="button" aria-label={`More ${label.toLowerCase()}`} data-testid={`${testId}-inc`} onClick={() => onChange(clamp(value + 1))} className="size-12 rounded-xl border border-border-subtle bg-surface-elevated text-[22px] font-bold text-ink">
          +
        </button>
      </div>
      {children}
    </div>
  );
}
