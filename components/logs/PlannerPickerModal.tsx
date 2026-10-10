"use client";

import { useEffect, useMemo, useState } from "react";
import type { PlannerWindow } from "@/lib/api/logsCommon";
import type { SuggestedSlot } from "@/lib/api/backlogItems";
import { addDaysToKey, currentWindow, dayKey, dayLabel, nextDays } from "@/lib/logs/dates";
import { WINDOWS } from "@/lib/logs/labels";
import { Modal } from "@/components/ui/Modal";

export const MAX_DAYS_AHEAD = 28;
export const MINUTE_CHOICES = [20, 30, 45, 60, 90] as const;

export interface PickedPlacement {
  date: string;
  timeSlot: PlannerWindow;
  /** Only when the modal offers a length. */
  estimatedMinutes?: number;
}

type Props = {
  open: boolean;
  onClose: () => void;
  /** "Add to planner", "Schedule backlog item" … */
  title: string;
  /** What is being added: "Revise Kinematics". */
  subject?: string;
  /** Offers a length picker, starting here. Omit to keep the task's own length. */
  defaultMinutes?: number | null;
  /** Loaded when the modal opens; best-fit slots shown as one-tap chips. */
  loadSuggestions?: () => Promise<SuggestedSlot[]>;
  busy: boolean;
  error: string | null;
  confirmLabel?: string;
  onConfirm: (placement: PickedPlacement) => void;
};

/** "Add to planner": pick a day and a time slot (and optionally a length), then confirm. */
export function PlannerPickerModal({ open, onClose, title, subject, defaultMinutes, loadSuggestions, busy, error, confirmLabel = "Add to planner", onConfirm }: Props) {
  const days = useMemo(() => nextDays(7), [open]); // eslint-disable-line react-hooks/exhaustive-deps -- recomputed each time it opens
  const [date, setDate] = useState(() => dayKey(new Date()));
  const [timeSlot, setTimeSlot] = useState<PlannerWindow>(() => currentWindow());
  const [minutes, setMinutes] = useState<number | null>(defaultMinutes ?? null);
  const [suggestions, setSuggestions] = useState<SuggestedSlot[] | null>(null);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset the picker each time it opens
    setDate(dayKey(new Date()));
    setTimeSlot(currentWindow());
    setMinutes(defaultMinutes ?? null);
    setSuggestions(null);
    if (!loadSuggestions) return;
    let alive = true;
    loadSuggestions()
      .then((s) => alive && setSuggestions(s))
      .catch(() => alive && setSuggestions([]));
    return () => {
      alive = false;
    };
    // load once per opening
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const today = dayKey(new Date());
  const maxDate = addDaysToKey(today, MAX_DAYS_AHEAD);
  const inQuickList = days.some((d) => d.key === date);

  return (
    <Modal open={open} onClose={() => (busy ? undefined : onClose())} ariaLabel={title}>
      <div className="flex flex-col gap-5" data-testid="planner-picker">
        <div>
          <h2 className="text-[20px] font-extrabold text-ink">{title}</h2>
          {subject && <p className="mt-1 text-[14px] font-semibold text-muted">{subject}</p>}
        </div>

        {suggestions && suggestions.length > 0 && (
          <fieldset className="flex flex-col gap-2" data-testid="picker-suggestions">
            <legend className="mb-1 text-[14px] font-semibold text-body-text dark:text-ink">Best fits in your timetable</legend>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={`${s.date}-${s.start}`}
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setDate(s.date);
                    setTimeSlot(s.window);
                  }}
                  className={`min-h-11 rounded-xl border px-3 text-left text-[13px] font-bold ${date === s.date && timeSlot === s.window ? "border-[1.5px] border-brand bg-tint-strong text-ink dark:border-[#FAF7F2]" : "border-brand/15 bg-surface text-body-text dark:text-ink"}`}
                >
                  {dayLabel(s.date)} · {s.start}–{s.end}
                  {s.subjectMatch && <span className="ml-1 text-[11px] font-semibold text-muted">· your block</span>}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-[14px] font-semibold text-body-text dark:text-ink">Day</legend>
          <div className="flex gap-2 overflow-x-auto pb-1" data-testid="picker-days">
            {days.map((d) => (
              <button
                key={d.key}
                type="button"
                data-testid={`picker-day-${d.key}`}
                aria-pressed={date === d.key}
                disabled={busy}
                onClick={() => setDate(d.key)}
                className={`min-h-11 shrink-0 rounded-xl border px-3 text-[14px] font-bold ${date === d.key ? "border-[1.5px] border-brand bg-tint-strong text-ink dark:border-[#FAF7F2]" : "border-brand/15 bg-surface text-body-text dark:text-ink"}`}
              >
                {d.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-[13px] font-semibold text-muted" htmlFor="picker-date">
            Another day
            <input
              id="picker-date"
              data-testid="picker-date"
              type="date"
              min={today}
              max={maxDate}
              disabled={busy}
              value={inQuickList ? "" : date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="h-11 rounded-xl border border-input-border bg-surface px-3 text-[15px] text-body-text dark:text-ink"
            />
          </label>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-[14px] font-semibold text-body-text dark:text-ink">Time slot</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {WINDOWS.map((w) => (
              <button
                key={w.value}
                type="button"
                data-testid={`picker-slot-${w.value}`}
                aria-pressed={timeSlot === w.value}
                disabled={busy}
                onClick={() => setTimeSlot(w.value)}
                className={`flex min-h-12 flex-col items-center justify-center rounded-xl border px-2 text-[14px] font-bold ${timeSlot === w.value ? "border-[1.5px] border-brand bg-tint-strong text-ink dark:border-[#FAF7F2]" : "border-brand/15 bg-surface text-body-text dark:text-ink"}`}
              >
                {w.label}
                <span className="text-[11px] font-semibold text-muted">{w.hint}</span>
              </button>
            ))}
          </div>
        </fieldset>

        {defaultMinutes !== undefined && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-[14px] font-semibold text-body-text dark:text-ink">How long?</legend>
            <div className="flex flex-wrap gap-2">
              {[...new Set([...(minutes && !MINUTE_CHOICES.includes(minutes as never) ? [minutes] : []), ...MINUTE_CHOICES])].sort((a, b) => a - b).map((m) => (
                <button
                  key={m}
                  type="button"
                  data-testid={`picker-minutes-${m}`}
                  aria-pressed={minutes === m}
                  disabled={busy}
                  onClick={() => setMinutes(m)}
                  className={`min-h-11 min-w-14 rounded-xl border px-3 text-[15px] font-bold ${minutes === m ? "border-[1.5px] border-brand bg-tint-strong text-ink dark:border-[#FAF7F2]" : "border-brand/15 bg-surface text-body-text dark:text-ink"}`}
                >
                  {m}m
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="button"
            data-testid="picker-confirm"
            disabled={busy}
            onClick={() => onConfirm({ date, timeSlot, ...(minutes ? { estimatedMinutes: minutes } : {}) })}
            className="min-h-14 flex-1 rounded-lg border border-primary-button-border bg-cta px-4 text-base font-semibold text-white transition-colors hover:bg-[#E8623F] disabled:opacity-60"
          >
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
