"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DiagnoseNowCard } from "@/components/diagnosis/DiagnoseNowCard";
import { ProfileSubpageHeader } from "@/components/profile/ProfileSubpageHeader";
import { PageLoader } from "@/components/ui/PageLoader";
import { ApiError } from "@/lib/api/http";
import { listDiagnosisReports, type ReportLimit, type ReportListItem } from "@/lib/api/diagnosisReports";
import { formatWhen } from "@/lib/diagnosis/report";
import { useStartReport } from "@/lib/diagnosis/useStartReport";

const STATUS_LABEL: Record<ReportListItem["status"], string> = {
  pending: "Starting…",
  streaming: "Being written…",
  complete: "Finished",
  failed: "AI was resting",
};

/** The list of past 30-day diagnoses, newest first. */
export default function DiagnosisListPage() {
  const [items, setItems] = useState<ReportListItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<ReportLimit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const { start, starting, error: startError } = useStartReport();

  const load = useCallback(async (nextPage: number) => {
    try {
      const res = (await listDiagnosisReports(nextPage)).data;
      setItems((prev) => (nextPage === 1 || prev === null ? res.reports : [...prev, ...res.reports]));
      setTotal(res.total);
      setPage(res.page);
      setLimit(res.limit);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "We couldn't load your diagnoses. Please refresh.");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load once on arrival
    void load(1);
  }, [load]);

  if (items === null && error === null) return <PageLoader label="Loading your diagnoses…" />;

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 lg:mx-auto lg:max-w-3xl lg:p-8" data-testid="diagnosis-list-page">
      <ProfileSubpageHeader title="Past diagnoses" backHref="/analytics" />
      <DiagnoseNowCard limit={limit} starting={starting} error={startError} onStart={() => void start()} showPast={false} />

      {error && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
          {error}
        </p>
      )}

      {items !== null && items.length === 0 && (
        <p className="rounded-xl border border-dashed border-brand/25 p-5 text-center text-[14px] text-muted" data-testid="diagnosis-empty">
          No diagnoses yet. Press &ldquo;Diagnose me now&rdquo; and your first one is ready in about a minute.
        </p>
      )}

      {items !== null && items.length > 0 && (
        <ul className="flex flex-col gap-3" data-testid="diagnosis-list">
          {items.map((r) => (
            <li key={r.id}>
              <Link href={`/diagnosis/${r.id}`} data-testid="diagnosis-item" data-status={r.status} className="flex min-h-12 flex-col gap-1 rounded-2xl border border-brand/10 bg-surface p-4 hover:border-brand/30">
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[15px] font-bold text-ink">{formatWhen(r.triggeredAt)} IST</span>
                  <span className="rounded-full bg-tint-strong px-2.5 py-0.5 text-[12px] font-semibold text-ink dark:bg-[#FAF7F214]">{STATUS_LABEL[r.status]}</span>
                </span>
                {r.preview && <span className="line-clamp-2 text-[13px] text-muted">{r.preview}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {items !== null && items.length < total && (
        <button
          type="button"
          data-testid="diagnosis-more"
          disabled={loadingMore}
          onClick={async () => {
            setLoadingMore(true);
            await load(page + 1);
            setLoadingMore(false);
          }}
          className="min-h-12 rounded-lg border border-brand/20 px-4 text-[14px] font-semibold text-ink hover:bg-tint-strong disabled:opacity-60"
        >
          {loadingMore ? "Loading…" : "Show older"}
        </button>
      )}
    </div>
  );
}
