"use client";

import Link from "next/link";
import type { ReportLimit } from "@/lib/api/diagnosisReports";
import { remainingText } from "@/lib/diagnosis/report";

type Props = {
  /** null while it loads (or if it could not be loaded): the button still works, the server enforces the limit. */
  limit: ReportLimit | null;
  starting: boolean;
  error: string | null;
  onStart: () => void;
  /** Show the "Past diagnoses" link (not on the list page itself). */
  showPast?: boolean;
};

/** "Diagnose me now": a full read of the last 30 days, with how many are left today. */
export function DiagnoseNowCard({ limit, starting, error, onStart, showPast = true }: Props) {
  const none = limit !== null && limit.remaining <= 0;
  return (
    <section aria-label="30-day diagnosis" className="flex flex-col gap-3 rounded-2xl border border-brand/10 bg-surface p-4 sm:p-6" data-testid="diagnose-card">
      <div className="flex flex-col gap-1">
        <h2 className="text-[18px] font-extrabold text-ink">Diagnose my last 30 days</h2>
        <p className="text-[13px] text-muted">
          A full read of your study, practice, mistakes, revision and mocks: your strengths, the chapters bleeding marks, your revision debt, where your mocks are heading, and a week-by-week plan.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          data-testid="diagnose-now"
          disabled={starting || none}
          onClick={onStart}
          className="min-h-12 rounded-lg border border-primary-button-border bg-cta px-4 text-[15px] font-semibold text-white transition-colors hover:bg-[#E8623F] disabled:cursor-not-allowed disabled:border-primary-button-disabled-bg disabled:bg-primary-button-disabled-bg disabled:text-primary-button-disabled-text"
        >
          {starting ? "Starting…" : "Diagnose me now"}
        </button>
        {showPast && (
          <Link href="/diagnosis" data-testid="past-diagnoses" className="flex min-h-12 items-center text-[14px] font-semibold text-brand underline underline-offset-2 dark:text-ink">
            Past diagnoses
          </Link>
        )}
      </div>
      {limit && (
        <p className="text-[12px] text-muted" data-testid="diagnose-remaining">
          {remainingText(limit)}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-[13px] font-medium text-danger" data-testid="diagnose-error">
          {error}
        </p>
      )}
    </section>
  );
}
