import Link from "next/link";
import type { DiagnosisReport } from "@/lib/api/diagnosisReports";
import { splitSections } from "@/lib/diagnosis/format";
import { formatWhen, splitPlan, toBlocks, type Block } from "@/lib/diagnosis/report";
import { prefillHref } from "@/lib/goals/prefill";

type Props = {
  report: DiagnosisReport;
  /** The student's chapters (every class), to match plan lines to a chapter for "Save to goals". */
  chapters: { id: string; name: string }[];
  /** The report has been unfinished for a long time. */
  tooLong: boolean;
  /** A new diagnosis is being started (after a failure). */
  starting: boolean;
  /** Why starting another one did not work (the daily limit, nothing to read…). */
  startError: string | null;
  onTryAgain: () => void;
};

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="flex flex-col gap-2">
      {blocks.map((b, i) =>
        b.kind === "ul" ? (
          <ul key={i} className="flex list-disc flex-col gap-1.5 pl-5 text-[14px] leading-6 text-body-text dark:text-ink/90">
            {b.items.map((item, j) => (
              <li key={j}>{item}</li>
            ))}
          </ul>
        ) : b.kind === "h" ? (
          <h4 key={i} className="mt-1 text-[14px] font-bold text-ink">
            {b.text}
          </h4>
        ) : (
          <p key={i} className="text-[14px] leading-6 text-body-text dark:text-ink/90">
            {b.text}
          </p>
        ),
      )}
    </div>
  );
}

/** Grey bars while nothing has arrived yet. */
export function ReportSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-4 rounded-2xl border border-brand/10 bg-surface p-4 sm:p-6" data-testid="report-skeleton">
      <div>
        <p className="text-[18px] font-extrabold text-ink">Reading your last 30 days…</p>
        <p className="mt-1 text-[13px] text-muted">This takes under a minute. You can leave this page; it keeps going and will be in your past diagnoses.</p>
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-5 w-1/3 animate-pulse rounded bg-brand/15" />
        <div className="h-4 w-full animate-pulse rounded bg-brand/10" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-brand/10" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-brand/10" />
      </div>
    </div>
  );
}

/** The 30-day diagnosis: waiting, writing itself, finished (with "Save to goals" on the plan), or "AI resting". */
export function ReportView({ report, chapters, tooLong, starting, startError, onTryAgain }: Props) {
  if (report.status === "failed") {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-brand/10 bg-surface p-4 sm:p-6" data-testid="report-resting">
        <p role="status" className="text-[16px] font-bold text-ink">
          AI resting, please try again in a few minutes.
        </p>
        <p className="text-[13px] text-muted">Nothing was lost: this one did not count toward your diagnoses for today.</p>
        {startError && (
          <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-[13px] font-medium text-danger" data-testid="report-start-error">
            {startError}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="report-retry"
            disabled={starting}
            onClick={onTryAgain}
            className="min-h-12 rounded-lg border border-primary-button-border bg-cta px-4 text-[15px] font-semibold text-white hover:bg-[#E8623F] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {starting ? "Starting…" : "Try again"}
          </button>
          <Link href="/analytics" className="flex min-h-12 items-center rounded-lg border border-brand/20 px-4 text-[15px] font-semibold text-ink hover:bg-tint-strong">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (report.reportText === null || report.reportText.trim() === "") {
    return (
      <>
        <ReportSkeleton />
        {tooLong && (
          <p role="status" className="rounded-lg bg-tint-strong px-3 py-2 text-[13px] font-semibold text-ink dark:bg-[#FAF7F214]" data-testid="report-too-long">
            This is taking longer than usual. Check back in a few minutes.
          </p>
        )}
      </>
    );
  }

  const complete = report.status === "complete";
  const sections = splitSections(report.reportText);
  return (
    <article className="flex flex-col gap-5 rounded-2xl border border-brand/10 bg-surface p-4 sm:p-6" data-testid="report-card" data-status={report.status} aria-busy={!complete}>
      <p className="text-[12px] font-bold uppercase tracking-wide text-muted" data-testid="report-label">
        {complete ? `Your last ${report.periodDays} days · ${formatWhen(report.completedAt ?? report.triggeredAt)} IST` : "Writing your report…"}
      </p>
      {sections.map((s, i) => {
        const isPlan = /^30-day action plan$/i.test(s.title);
        const plan = isPlan && complete ? splitPlan(s.body, chapters) : null;
        return (
          <section key={`${s.title}-${i}`} className="flex flex-col gap-2" data-testid="report-section">
            {s.title && <h2 className="text-[17px] font-extrabold text-ink">{s.title}</h2>}
            {plan && plan.items.length > 0 ? (
              <>
                {plan.intro && <Blocks blocks={toBlocks(plan.intro)} />}
                <ul className="flex flex-col gap-3" data-testid="plan-items">
                  {plan.items.map((item, n) => (
                    <li key={item.label} className="flex flex-col gap-2 rounded-xl border border-brand/15 bg-tint-strong p-3 dark:bg-[#FAF7F214]" data-testid={`plan-item-${n}`}>
                      <p className="text-[14px] font-extrabold text-ink">{item.label}</p>
                      <p className="text-[14px] leading-6 text-body-text dark:text-ink/90">{item.text.replace(/^Week\s+\d\s*[:.\-–—]?\s*/i, "")}</p>
                      {item.week && (
                        <Link
                          href={prefillHref({ type: "HOURS", unit: "MINUTES", target: item.minutes, chapterId: item.chapterId, week: item.week })}
                          data-testid={`save-goal-${n}`}
                          className="flex min-h-11 items-center justify-center rounded-lg border border-brand/20 bg-surface px-4 text-[14px] font-semibold text-ink hover:border-brand"
                        >
                          Save to goals{item.chapterName ? ` · ${item.chapterName}` : ""}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <Blocks blocks={toBlocks(s.body)} />
            )}
          </section>
        );
      })}
      {!complete && (
        <span aria-hidden className="inline-block h-4 w-2 animate-pulse rounded-sm bg-brand/40" data-testid="report-caret" />
      )}
      {complete && (
        <p className="text-[12px] text-muted">
          <Link href="/diagnosis" className="font-semibold underline">
            Past diagnoses
          </Link>
        </p>
      )}
    </article>
  );
}
