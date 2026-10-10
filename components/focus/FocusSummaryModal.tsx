"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { formatMinutes } from "@/lib/study/format";
import { defaultWasCompleted, previewMinutes } from "@/lib/study/timer";

type Props = {
  open: boolean;
  plannedMinutes: number;
  elapsedSeconds: number;
  interruptions: number;
  busy: boolean;
  error: string | null;
  /** Keep going: close the summary and leave the clock running. */
  onKeepGoing: () => void;
  onSave: (wasCompleted: boolean) => void;
};

/** Planned vs actual, "was this a win?", then save. */
export function FocusSummaryModal({ open, plannedMinutes, elapsedSeconds, interruptions, busy, error, onKeepGoing, onSave }: Props) {
  const [choice, setChoice] = useState<boolean | null>(null);
  const win = choice ?? defaultWasCompleted(plannedMinutes, elapsedSeconds);

  return (
    <Modal open={open} onClose={busy ? () => undefined : onKeepGoing} ariaLabel="Session summary">
      <div className="flex flex-col gap-5" data-testid="focus-summary">
        <div>
          <h2 className="text-[22px] font-extrabold text-ink">Wrap up this session</h2>
          <p className="mt-1 text-[13px] text-muted">Here&apos;s how it went.</p>
        </div>

        <dl className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-tint-strong px-2 py-3 dark:bg-[#FAF7F214]">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">Planned</dt>
            <dd className="mt-1 text-[18px] font-extrabold text-ink" data-testid="summary-planned">
              {formatMinutes(plannedMinutes)}
            </dd>
          </div>
          <div className="rounded-xl bg-tint-strong px-2 py-3 dark:bg-[#FAF7F214]">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">Focused</dt>
            <dd className="mt-1 text-[18px] font-extrabold text-ink" data-testid="summary-actual">
              {formatMinutes(previewMinutes(elapsedSeconds))}
            </dd>
          </div>
          <div className="rounded-xl bg-tint-strong px-2 py-3 dark:bg-[#FAF7F214]">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">Distractions</dt>
            <dd className="mt-1 text-[18px] font-extrabold text-ink">{interruptions}</dd>
          </div>
        </dl>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-[15px] font-bold text-ink">Was this a win?</legend>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Was this a win?">
            {[
              { value: true, label: "Yes, a win" },
              { value: false, label: "Not really" },
            ].map((o) => (
              <button
                key={String(o.value)}
                type="button"
                role="radio"
                aria-checked={win === o.value}
                data-testid={o.value ? "win-yes" : "win-no"}
                disabled={busy}
                onClick={() => setChoice(o.value)}
                className={`min-h-12 rounded-xl border px-3 text-[15px] font-bold transition-colors ${
                  win === o.value ? "border-[1.5px] border-brand bg-tint-strong text-ink dark:border-[#FAF7F2]" : "border-brand/15 bg-surface text-body-text dark:text-ink"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            data-testid="save-session"
            disabled={busy}
            onClick={() => onSave(win)}
            className="min-h-14 rounded-lg border border-primary-button-border bg-cta px-4 text-base font-semibold text-white hover:bg-[#E8623F] disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save session"}
          </button>
          <button type="button" disabled={busy} onClick={onKeepGoing} className="min-h-12 rounded-lg px-4 text-[14px] font-semibold text-muted underline-offset-2 hover:underline">
            Keep going
          </button>
        </div>
      </div>
    </Modal>
  );
}
