"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import type { PlannerWindow } from "@/lib/api/logsCommon";
import { currentWindow, nextDays } from "@/lib/logs/dates";
import { WINDOWS } from "@/lib/logs/labels";

export const MINUTE_CHOICES = [30, 45, 60, 90, 120] as const;
export const MAX_PICKED_DAYS = 14;

export interface PickedDates {
  dates: string[];
  timeSlot: PlannerWindow;
  estimatedMinutes: number;
}

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** What is being scheduled: "Study Kinematics". */
  subject?: string;
  /** Shown above the day chips, e.g. "3 weak chapters are spread across the days you pick." */
  hint?: string;
  defaultMinutes?: number;
  busy: boolean;
  error: string | null;
  confirmLabel?: string;
  onConfirm: (picked: PickedDates) => void;
};

/** "Schedule study": pick one or more of the next 14 days, a time slot and a length. */
export function DatesPickerModal({ open, onClose, title, subject, hint, defaultMinutes = 60, busy, error, confirmLabel = "Add to planner", onConfirm }: Props) {
  const days = useMemo(() => nextDays(MAX_PICKED_DAYS), [open]); // eslint-disable-line react-hooks/exhaustive-deps -- recomputed each time it opens
  const [picked, setPicked] = useState<string[]>([]);
  const [timeSlot, setTimeSlot] = useState<PlannerWindow>(() => currentWindow());
  const [minutes, setMinutes] = useState<number>(defaultMinutes);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset the picker each time it opens
    setPicked([]);
    setTimeSlot(currentWindow());
    setMinutes(defaultMinutes);
    setLocalError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function toggle(key: string) {
    setLocalError(null);
    setPicked((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key].sort()));
  }

  function confirm() {
    if (picked.length === 0) return setLocalError("Pick at least one day.");
    onConfirm({ dates: picked, timeSlot, estimatedMinutes: minutes });
  }

  const shown = localError ?? error;

  return (
    <Modal open={open} onClose={() => (busy ? undefined : onClose())} ariaLabel={title}>
      <div className="flex flex-col gap-5" data-testid="dates-picker">
        <div>
          <h2 className="text-[20px] font-extrabold text-ink">{title}</h2>
          {subject && <p className="mt-1 text-[14px] font-semibold text-muted">{subject}</p>}
          {hint && <p className="mt-1 text-[13px] text-muted">{hint}</p>}
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-[14px] font-semibold text-body-text dark:text-ink">
            Days <span className="font-normal text-muted">({picked.length} picked)</span>
          </legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="dates-days">
            {days.map((d) => {
              const on = picked.includes(d.key);
              return (
                <button
                  key={d.key}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  data-testid={`dates-day-${d.key}`}
                  disabled={busy}
                  onClick={() => toggle(d.key)}
                  className={`min-h-11 rounded-xl border px-2 text-[13px] font-bold ${on ? "border-[1.5px] border-brand bg-tint-strong text-ink dark:border-[#FAF7F2]" : "border-brand/15 bg-surface text-body-text dark:text-ink"}`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-[14px] font-semibold text-body-text dark:text-ink">Time slot</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {WINDOWS.map((w) => (
              <button
                key={w.value}
                type="button"
                data-testid={`dates-slot-${w.value}`}
                aria-pressed={timeSlot === w.value}
                disabled={busy}
                onClick={() => setTimeSlot(w.value)}
                className={`min-h-14 rounded-xl border px-2 text-center ${timeSlot === w.value ? "border-[1.5px] border-brand bg-tint-strong text-ink dark:border-[#FAF7F2]" : "border-brand/15 bg-surface text-body-text dark:text-ink"}`}
              >
                <span className="block text-[14px] font-bold">{w.label}</span>
                <span className="block text-[11px] text-muted">{w.hint}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-[14px] font-semibold text-body-text dark:text-ink">How long, each day</legend>
          <div className="flex flex-wrap gap-2">
            {MINUTE_CHOICES.map((m) => (
              <button
                key={m}
                type="button"
                data-testid={`dates-minutes-${m}`}
                aria-pressed={minutes === m}
                disabled={busy}
                onClick={() => setMinutes(m)}
                className={`min-h-11 rounded-xl border px-4 text-[14px] font-bold ${minutes === m ? "border-[1.5px] border-brand bg-tint-strong text-ink dark:border-[#FAF7F2]" : "border-brand/15 bg-surface text-body-text dark:text-ink"}`}
              >
                {m} min
              </button>
            ))}
          </div>
        </fieldset>

        {shown && (
          <p role="alert" data-testid="dates-error" className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">
            {shown}
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <button type="button" data-testid="dates-confirm" disabled={busy} onClick={confirm} className="min-h-14 flex-1 rounded-lg border border-primary-button-border bg-cta px-4 text-base font-semibold text-white hover:bg-[#E8623F] disabled:opacity-60">
            {busy ? "Adding…" : confirmLabel}
          </button>
          <button type="button" onClick={onClose} disabled={busy} className="min-h-14 flex-1 rounded-lg border-[1.5px] border-secondary-button-border bg-surface px-4 text-base font-semibold text-body-text hover:bg-tint-strong dark:text-ink">
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
