"use client";

import { useEffect, useState } from "react";
import { PageLoader } from "@/components/ui/PageLoader";
import { getInsights, REASON_LABEL, SOURCE_LABEL, type Insights, type Reason, type Source } from "@/lib/api/notebooks";
import { insightFor } from "@/lib/notebooks/model";
import type { SubjectLookup } from "@/lib/study/subjects";

/** Widgets with too little behind them are hidden rather than drawn empty. */
const MIN_FOR_PATTERNS = 5;

function Tile({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-brand/10 bg-surface p-4" data-testid={testId}>
      <span className="text-[26px] font-extrabold leading-none text-ink">{value}</span>
      <span className="text-[12px] font-semibold text-muted">{label}</span>
    </div>
  );
}

function Bar({ pct }: { pct: number }) {
  return (
    <span className="h-2 flex-1 overflow-hidden rounded-full bg-tint-strong" aria-hidden>
      <span className="block h-full rounded-full bg-brand" style={{ width: `${Math.max(2, Math.min(100, pct))}%` }} />
    </span>
  );
}

/** Mistake patterns for one notebook (when `notebookId` is given) or for everything the student has saved. */
export function StatsPanel({ notebookId, lookup }: { notebookId?: string; lookup: SubjectLookup }) {
  const [data, setData] = useState<Insights | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    getInsights(notebookId)
      .then((r) => alive && setData(r))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [notebookId]);

  if (failed) return <p role="alert" className="rounded-xl bg-danger-bg p-4 text-[14px] font-semibold text-danger">Could not load the stats.</p>;
  if (!data) return <PageLoader label="Counting your mistakes…" />;
  if (data.total === 0) return <p className="rounded-2xl border border-dashed border-border-subtle p-8 text-center text-[14px] text-muted" data-testid="stats-empty">Stats appear once you have saved a few mistakes.</p>;

  const patterns = data.total >= MIN_FOR_PATTERNS;
  const sources = Object.entries(data.sources).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  const sourceTotal = sources.reduce((n, [, c]) => n + c, 0);

  return (
    <div className="flex flex-col gap-5" data-testid="stats-panel">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile testId="stat-total" label="Mistakes saved" value={String(data.total)} />
        <Tile testId="stat-mastered" label="Mastered" value={`${data.masteredPercent}%`} />
        <Tile testId="stat-due" label="Due now" value={String(data.dueNow)} />
        {data.needSolution > 0 && <Tile testId="stat-solution" label="Need a solution" value={String(data.needSolution)} />}
      </div>

      {patterns ? (
        <section className="flex flex-col gap-3" aria-label="Why you miss questions" data-testid="stats-reasons">
          <h3 className="text-[16px] font-extrabold text-ink">Why you miss questions</h3>
          {data.reasonBySubject.map((s) => {
            const name = s.subjectId === null ? "Other" : lookup.subjectName(s.subjectId);
            const rows = (Object.entries(s.reasons) as [Reason, number][]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
            const tagged = rows.reduce((n, [, c]) => n + c, 0);
            const line = insightFor(name, s.total, s.reasons);
            return (
              <div key={s.subjectId ?? "none"} className="flex flex-col gap-2 rounded-2xl border border-brand/10 bg-surface p-4" data-testid="stats-subject">
                <p className="text-[14px] font-bold text-ink">
                  {name} <span className="font-normal text-muted">({s.total})</span>
                </p>
                {line && <p className="text-[13px] text-body-text dark:text-ink" data-testid="stats-insight">{line}</p>}
                {rows.length === 0 ? (
                  <p className="text-[12px] text-muted">None of these have a reason yet. Tag them to see the pattern.</p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {rows.map(([r, n]) => (
                      <li key={r} className="flex items-center gap-3 text-[13px]">
                        <span className="w-36 shrink-0 text-ink">{REASON_LABEL[r]}</span>
                        <Bar pct={(n / tagged) * 100} />
                        <span className="w-8 text-right font-semibold text-muted">{n}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </section>
      ) : (
        <p className="rounded-2xl bg-tint-strong/60 p-4 text-[13px] text-body-text dark:text-ink" data-testid="stats-thin">Save {MIN_FOR_PATTERNS - data.total} more {MIN_FOR_PATTERNS - data.total === 1 ? "mistake" : "mistakes"} to see which reasons repeat.</p>
      )}

      {!notebookId && data.topChapters.length > 0 && patterns && (
        <section className="flex flex-col gap-2" aria-label="Chapters with the most mistakes" data-testid="stats-chapters">
          <h3 className="text-[16px] font-extrabold text-ink">Where the mistakes are</h3>
          <ol className="flex flex-col gap-1.5 rounded-2xl border border-brand/10 bg-surface p-4">
            {data.topChapters.slice(0, 5).map((c) => (
              <li key={c.chapterId} className="flex items-center gap-3 text-[13px]">
                <span className="min-w-0 flex-1 truncate text-ink">{lookup.chapterName(c.chapterId) ?? "A chapter"}</span>
                <span className="text-muted">{c.open} open of {c.mistakes}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {sources.length > 0 && patterns && (
        <section className="flex flex-col gap-2" aria-label="Where mistakes come from" data-testid="stats-sources">
          <h3 className="text-[16px] font-extrabold text-ink">Where they come from</h3>
          <ul className="flex flex-col gap-1.5 rounded-2xl border border-brand/10 bg-surface p-4">
            {sources.map(([s, n]) => (
              <li key={s} className="flex items-center gap-3 text-[13px]">
                <span className="w-36 shrink-0 text-ink">{SOURCE_LABEL[s as Source] ?? s}</span>
                <Bar pct={(n / sourceTotal) * 100} />
                <span className="w-8 text-right font-semibold text-muted">{n}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
