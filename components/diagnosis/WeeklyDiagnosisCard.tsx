import Link from "next/link";
import type { WeeklyDiagnosis, WeeklyOverview } from "@/lib/api/diagnosis";
import { chipLabel, splitSections, waitText, weekLabel } from "@/lib/diagnosis/format";
import { fixToGoalHref } from "@/lib/goals/prefill";

type Props = {
  overview: WeeklyOverview;
  /** The Run now request is in flight. */
  starting: boolean;
  /** A message about the last Run now press (rate limit, nothing to analyse, …). */
  runError: string | null;
  /** We stopped waiting for a run that is taking unusually long. */
  gaveUp: boolean;
  onRun: () => void;
};

const PLAIN = (text: string) => text.replace(/\*\*/g, "");

/** The finished diagnosis: its named sections, then the three action chips. */
export function DiagnosisReport({ diagnosis, label }: { diagnosis: WeeklyDiagnosis; label: string }) {
  const sections = splitSections(diagnosis.diagnosis ?? "");
  return (
    <div className="flex flex-col gap-4" data-testid="weekly-report">
      <p className="text-[12px] font-bold uppercase tracking-wide text-muted" data-testid="weekly-report-label">
        {label}
      </p>
      {sections.map((s, i) => (
        <div key={`${s.title}-${i}`} className="flex flex-col gap-1" data-testid="weekly-section">
          {s.title && <h3 className="text-[15px] font-extrabold text-ink">{s.title}</h3>}
          {s.body && <p className="whitespace-pre-line text-[14px] leading-6 text-body-text dark:text-ink/90">{PLAIN(s.body)}</p>}
        </div>
      ))}
      {diagnosis.fixes.length > 0 && (
        <div className="flex flex-col gap-2" data-testid="weekly-fixes">
          <h3 className="text-[15px] font-extrabold text-ink">Top {diagnosis.fixes.length === 1 ? "fix" : `${diagnosis.fixes.length} fixes`} for next week</h3>
          <p className="text-[12px] text-muted">Tap one to set it as a goal for next week.</p>
          <ul className="flex flex-col gap-2">
            {diagnosis.fixes.map((fix, i) => (
              <li key={`${fix.title}-${i}`}>
                <Link
                  href={fixToGoalHref(fix)}
                  data-testid={`fix-chip-${i}`}
                  className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-brand/20 bg-tint-strong px-4 py-2 text-left text-[14px] font-semibold text-ink hover:border-brand dark:bg-[#FAF7F214]"
                >
                  <span className="min-w-0">
                    {chipLabel(fix)}
                    {fix.chapterName && fix.title.toLowerCase().indexOf(fix.chapterName.toLowerCase()) === -1 && (
                      <span className="block truncate text-[12px] font-normal text-muted">{fix.chapterName}</span>
                    )}
                  </span>
                  <span aria-hidden className="shrink-0 text-[18px] text-muted">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * The "This Week" card: whichever of — AI is resting / nothing yet / working on it / the report — applies, plus the
 * Run now button (disabled while a run is under way or the day's limit is used).
 */
export function WeeklyDiagnosisCard({ overview, starting, runError, gaveUp, onRun }: Props) {
  const { current, latest, brainConfigured, limits } = overview;
  const running = starting || current?.status === "running";
  const limitUsed = limits.diagnosis.used >= limits.diagnosis.limit || limits.answer.used >= limits.answer.limit;
  const limitWait = limits.diagnosis.used >= limits.diagnosis.limit ? limits.diagnosis.retryAfterSeconds : limits.answer.retryAfterSeconds;
  const shown = current?.status === "ready" ? current : latest;
  const showingOlder = shown !== null && shown !== current;

  const runButton = (label: string) => (
    <button
      type="button"
      data-testid="weekly-run"
      disabled={running || limitUsed || !brainConfigured}
      onClick={onRun}
      className="min-h-12 rounded-lg border border-primary-button-border bg-cta px-4 text-[15px] font-semibold text-white transition-colors hover:bg-[#E8623F] disabled:cursor-not-allowed disabled:border-primary-button-disabled-bg disabled:bg-primary-button-disabled-bg disabled:text-primary-button-disabled-text"
    >
      {running ? "Reading your week…" : label}
    </button>
  );

  return (
    <section aria-label="Weekly AI diagnosis" className="flex flex-col gap-4 rounded-2xl border border-brand/10 bg-surface p-4 sm:p-6" data-testid="weekly-card">
      <div className="flex flex-col gap-1">
        <h2 className="text-[18px] font-extrabold text-ink">Your week, diagnosed</h2>
        <p className="text-[13px] text-muted">Every Sunday evening Prepex reads your last 7 days and tells you what is working, what is leaking and what to fix next. You can run it any time.</p>
      </div>

      {!brainConfigured && (
        <p role="status" className="rounded-lg bg-tint-strong px-3 py-2 text-[13px] font-semibold text-ink dark:bg-[#FAF7F214]" data-testid="weekly-resting">
          AI is resting, back soon.
        </p>
      )}

      {running && (
        <div role="status" className="flex flex-col gap-1 rounded-xl bg-tint-strong px-4 py-3 dark:bg-[#FAF7F214]" data-testid="weekly-running">
          <p className="text-[14px] font-bold text-ink">Reading your week…</p>
          <p className="text-[12px] text-muted">This usually takes a minute or two. You can leave this page; it keeps going and will be here when you come back.</p>
        </div>
      )}

      {gaveUp && !running && (
        <p role="status" className="rounded-lg bg-tint-strong px-3 py-2 text-[13px] font-semibold text-ink dark:bg-[#FAF7F214]" data-testid="weekly-gave-up">
          This is taking longer than usual. Check back in a few minutes.
        </p>
      )}

      {!running && current?.status === "failed" && brainConfigured && (
        <p role="status" className="rounded-lg bg-tint-strong px-3 py-2 text-[13px] font-semibold text-ink dark:bg-[#FAF7F214]" data-testid="weekly-failed">
          {current.lastError === "no_activity"
            ? "There was nothing from the last 7 days to read yet. Log some study, practice or a mock first."
            : current.attempts < 3
              ? "AI is resting. We'll try again shortly, or you can run it now."
              : "AI is resting, back soon. You can try again."}
        </p>
      )}

      {runError && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-[13px] font-medium text-danger" data-testid="weekly-run-error">
          {runError}
        </p>
      )}

      {shown && !running && (
        <DiagnosisReport diagnosis={shown} label={showingOlder ? `Week of ${weekLabel(shown.weekStart)} (latest finished)` : `Week of ${weekLabel(shown.weekStart)}`} />
      )}

      {!shown && !running && !current && brainConfigured && (
        <p className="rounded-xl border border-dashed border-brand/25 p-5 text-center text-[14px] text-muted" data-testid="weekly-empty">
          No diagnosis yet. Your first one arrives Sunday evening, or run it now.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {runButton(shown ? "Run again now" : "Run now")}
        {limitUsed && (
          <p className="text-[12px] text-muted" data-testid="weekly-limit">
            You&apos;ve used your AI runs for now. Try again in {waitText(limitWait)}.
          </p>
        )}
      </div>
    </section>
  );
}
