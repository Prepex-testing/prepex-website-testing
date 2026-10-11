"use client";

import type { CountAspect, Progress, TheoryStatus } from "@/lib/api/syllabus";
import { COUNT_ROWS, THEORY_OPTIONS } from "@/lib/insights/labels";

type TheoryProps = { value: TheoryStatus; busy: boolean; onChange: (v: TheoryStatus) => void };

/** The three-way "how far is the theory" switch. */
export function TheorySwitch({ value, busy, onChange }: TheoryProps) {
  return (
    <div role="radiogroup" aria-label="Theory status" className="grid grid-cols-3 gap-1 rounded-xl bg-tint-strong p-1 dark:bg-[#FAF7F214]" data-testid="theory-switch">
      {THEORY_OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          data-testid={`theory-${o.value}`}
          disabled={busy}
          onClick={() => value !== o.value && onChange(o.value)}
          className={`min-h-11 rounded-lg px-1 text-[13px] font-bold sm:text-[14px] ${value === o.value ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

type CountsProps = { counts: Progress["counts"]; busy: boolean; onChange: (aspect: CountAspect, value: number) => void };

/** Lectures, DPPs, HC Verma, modules, PYQs, revisions: what the logs counted, with + and − to correct it. */
export function CountSteppers({ counts, busy, onChange }: CountsProps) {
  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2" data-testid="count-steppers">
      {COUNT_ROWS.map((row) => {
        const value = counts[row.key];
        return (
          <li key={row.aspect} className="flex items-center justify-between gap-2 rounded-xl border border-brand/10 bg-surface px-3 py-2">
            <span className="text-[14px] font-semibold text-body-text dark:text-ink">{row.label}</span>
            <span className="flex items-center gap-1">
              <button type="button" aria-label={`One fewer: ${row.label}`} data-testid={`count-${row.aspect}-dec`} disabled={busy || value <= 0} onClick={() => onChange(row.aspect, value - 1)} className="flex size-11 items-center justify-center rounded-xl border border-brand/15 text-[20px] font-bold text-ink disabled:opacity-40">
                −
              </button>
              <span className="w-8 text-center text-[16px] font-extrabold text-ink" data-testid={`count-${row.aspect}-value`}>
                {value}
              </span>
              <button type="button" aria-label={`One more: ${row.label}`} data-testid={`count-${row.aspect}-inc`} disabled={busy || value >= 999} onClick={() => onChange(row.aspect, value + 1)} className="flex size-11 items-center justify-center rounded-xl border border-brand/15 text-[20px] font-bold text-ink disabled:opacity-40">
                +
              </button>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
