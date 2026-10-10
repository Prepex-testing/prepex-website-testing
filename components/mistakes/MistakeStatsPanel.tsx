import type { MistakeStats } from "@/lib/api/mistakes";
import { subjectColor, type SubjectLookup } from "@/lib/study/subjects";

type Props = { stats: MistakeStats; lookup: SubjectLookup };

function Stat({ label, value, testId }: { label: string; value: string | number; testId?: string }) {
  return (
    <div className="rounded-xl bg-tint-strong px-3 py-3 text-center dark:bg-[#FAF7F214]">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-[22px] font-extrabold text-ink" data-testid={testId}>
        {value}
      </p>
    </div>
  );
}

/** Counts, mastered %, what is due, and the review streak. */
export function MistakeStatsPanel({ stats, lookup }: Props) {
  return (
    <div className="flex flex-col gap-4" data-testid="mistake-stats">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat label="Saved" value={stats.total} testId="stat-total" />
        <Stat label="Mastered" value={`${stats.masteredPercent}%`} testId="stat-mastered-pct" />
        <Stat label="Due now" value={stats.dueNow} testId="stat-due" />
        <Stat label="Due in 7 days" value={stats.dueNext7Days} />
        <Stat label="Reviewed today" value={stats.reviewedToday} />
        <Stat label="Review streak" value={`${stats.reviewStreak} day${stats.reviewStreak === 1 ? "" : "s"}`} testId="stat-streak" />
      </div>

      <div className="rounded-2xl border border-brand/10 bg-surface p-4">
        <h3 className="mb-3 text-[15px] font-extrabold text-ink">By subject</h3>
        {stats.bySubject.length === 0 ? (
          <p className="text-[13px] text-muted">Nothing saved yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {stats.bySubject.map((s) => {
              const pct = s.total === 0 ? 0 : Math.round((s.mastered / s.total) * 100);
              return (
                <li key={s.subjectId}>
                  <div className="mb-1 flex items-baseline justify-between text-[13px]">
                    <span className="font-bold text-ink">{lookup.subjectName(s.subjectId)}</span>
                    <span className="font-semibold text-muted">
                      {s.mastered} of {s.total} mastered
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-tint-strong" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${lookup.subjectName(s.subjectId)} mastered`}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: subjectColor(s.subjectId) }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
