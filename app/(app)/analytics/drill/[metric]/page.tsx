"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { SeriesBars } from "@/components/insights/LazyCharts";
import { ProfileSubpageHeader } from "@/components/profile/ProfileSubpageHeader";
import { EmptyNote, StatCard } from "@/components/stats/StatCard";
import { useSubjects } from "@/components/study/useSubjects";
import { FIELD } from "@/components/study/SubjectChapterFields";
import { ApiError } from "@/lib/api/http";
import { getDrill, type Drill } from "@/lib/api/masterAnalytics";
import { drillHref, drillValue, isDrillMetric, isDrillPeriod, METRIC_TITLE, PERIOD_OPTIONS } from "@/lib/insights/analyticsFormat";

const COLOR = { hours: "#6366F1", questions: "#06B6D4", accuracy: "#10B981", speed: "#F59E0B", revisions: "#EC4899" } as const;

export default function DrillPage() {
  const params = useParams<{ metric: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const subjects = useSubjects();
  const metric = isDrillMetric(params.metric) ? params.metric : null;
  const periodParam = search.get("period");
  const period = isDrillPeriod(periodParam) ? periodParam : "month";
  const subjectParam = Number(search.get("subject"));
  const subject = Number.isInteger(subjectParam) && subjectParam > 0 ? subjectParam : null;

  const [data, setData] = useState<Drill | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!metric) return;
    setData(null);
    setError(null);
    try {
      setData((await getDrill(metric, { period, subject })).data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "We couldn't load that. Please try again.");
    }
  }, [metric, period, subject]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load when the choice changes
    void load();
  }, [load]);

  if (!metric) {
    return (
      <div className="flex flex-col gap-4 p-4 sm:p-6 lg:mx-auto lg:max-w-3xl lg:p-8" data-testid="drill-unknown">
        <ProfileSubpageHeader title="Dashboard" backHref="/analytics" />
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
          We don&apos;t have a breakdown for that.
        </p>
        <Link href="/analytics" className="text-[14px] font-bold text-brand underline dark:text-ink">
          Back to your dashboard
        </Link>
      </div>
    );
  }

  const go = (nextPeriod: string, nextSubject: number | null) => router.replace(drillHref(metric, nextPeriod as never, nextSubject));
  const chartData = data?.buckets.map((b) => ({ label: b.label, value: b.value })) ?? [];
  const unit = data?.unit ?? "minutes";
  const hasData = data !== null && data.buckets.some((b) => b.value !== null && b.value !== 0);

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 lg:mx-auto lg:max-w-3xl lg:p-8" data-testid="drill-page" data-metric={metric}>
      <ProfileSubpageHeader title={METRIC_TITLE[metric]} backHref="/analytics" />

      <div role="radiogroup" aria-label="Period" className="grid grid-cols-4 gap-1 rounded-xl bg-tint-strong p-1 dark:bg-[#FAF7F214]">
        {PERIOD_OPTIONS.map((p) => (
          <button
            key={p.value}
            type="button"
            role="radio"
            aria-checked={period === p.value}
            data-testid={`drill-period-${p.value}`}
            onClick={() => go(p.value, subject)}
            className={`min-h-11 rounded-lg px-1 text-[12px] font-bold sm:text-[14px] ${period === p.value ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <label className="flex flex-col gap-1.5 text-[14px] font-semibold text-body-text dark:text-ink" htmlFor="drill-subject">
        Subject
        <select id="drill-subject" data-testid="drill-subject" className={FIELD} value={subject ?? ""} onChange={(e) => go(period, e.target.value ? Number(e.target.value) : null)}>
          <option value="">All subjects</option>
          {subjects.subjects.map((s) => (
            <option key={s.subjectId} value={s.subjectId}>
              {s.subjectName}
            </option>
          ))}
        </select>
      </label>

      {error && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
          {error}{" "}
          <button type="button" className="font-bold underline" onClick={() => void load()}>
            Try again
          </button>
        </p>
      )}
      {!data && !error && <div className="h-64 animate-pulse rounded-xl bg-tint-strong" aria-hidden />}

      {data && (
        <>
          <div className="grid grid-cols-3 gap-3 text-center" data-testid="drill-summary">
            <div className="rounded-2xl border border-brand/10 bg-surface p-3">
              <p className="text-[12px] font-bold uppercase tracking-wide text-muted">{metric === "accuracy" || metric === "speed" ? "Overall" : "Total"}</p>
              <p className="mt-1 text-[22px] font-extrabold text-ink" data-testid="drill-total">
                {drillValue(unit, data.total.value)}
              </p>
            </div>
            <div className="rounded-2xl border border-brand/10 bg-surface p-3">
              <p className="text-[12px] font-bold uppercase tracking-wide text-muted">Average</p>
              <p className="mt-1 text-[22px] font-extrabold text-ink" data-testid="drill-average">
                {drillValue(unit, data.average)}
              </p>
            </div>
            <div className="rounded-2xl border border-brand/10 bg-surface p-3">
              <p className="text-[12px] font-bold uppercase tracking-wide text-muted">{metric === "speed" ? "Fastest" : "Best"}</p>
              <p className="mt-1 text-[22px] font-extrabold text-ink" data-testid="drill-best">
                {drillValue(unit, data.best?.value)}
              </p>
            </div>
          </div>

          <StatCard title={`${METRIC_TITLE[metric]}, ${data.granularity} by ${data.granularity}`} subtitle={`${data.range.from} – ${data.range.to}`}>
            {hasData ? (
              <SeriesBars
                testId="drill-chart"
                data={chartData.map((d) => ({ label: d.label, value: unit === "minutes" && d.value !== null ? Math.round((d.value / 60) * 10) / 10 : d.value }))}
                unit={unit === "minutes" ? "h" : unit === "percent" ? "%" : unit === "seconds_per_question" ? "s" : ""}
                scale={unit === "percent" ? "percent" : "count"}
                color={COLOR[metric]}
              />
            ) : (
              <EmptyNote>Nothing here yet for this period.</EmptyNote>
            )}
          </StatCard>

          <StatCard title="The numbers" subtitle={data.granularity.toUpperCase()}>
            <table className="w-full text-left text-[14px]" data-testid="drill-table">
              <thead>
                <tr className="text-[12px] font-bold uppercase tracking-wide text-muted">
                  <th scope="col" className="pb-2">{data.granularity === "day" ? "Day" : data.granularity === "week" ? "Week of" : "Month"}</th>
                  <th scope="col" className="pb-2 text-right">{METRIC_TITLE[metric]}</th>
                </tr>
              </thead>
              <tbody>
                {[...data.buckets].reverse().map((b) => (
                  <tr key={b.key} data-testid={`drill-row-${b.key}`} className="border-t border-brand/10">
                    <th scope="row" className="py-2 font-semibold text-body-text dark:text-ink">{b.key}</th>
                    <td className="py-2 text-right font-bold text-ink" data-testid={`drill-value-${b.key}`}>
                      {drillValue(unit, b.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </StatCard>

          {data.bySubject && data.bySubject.length > 0 && (
            <StatCard title="By subject" subtitle="SAME PERIOD">
              <ul className="flex flex-col gap-2" data-testid="drill-subjects">
                {data.bySubject.map((s) => (
                  <li key={s.subjectId ?? "other"} className="flex items-center justify-between gap-3 text-[14px]">
                    <span className="font-semibold text-body-text dark:text-ink">{s.name}</span>
                    <span className="text-muted"><span className="font-bold text-ink">{drillValue("minutes", s.minutes)}</span> · {s.share}%</span>
                  </li>
                ))}
              </ul>
            </StatCard>
          )}
        </>
      )}
    </div>
  );
}
