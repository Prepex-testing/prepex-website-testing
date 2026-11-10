"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Autopsy } from "@/components/rank-gps/Autopsy";
import { CoachNote } from "@/components/rank-gps/CoachNote";
import { EffortCheck } from "@/components/rank-gps/EffortCheck";
import { Hero } from "@/components/rank-gps/Hero";
import { LockedGate } from "@/components/rank-gps/LockedGate";
import { OpportunityMap } from "@/components/rank-gps/OpportunityMap";
import { ProLocked } from "@/components/rank-gps/ProLocked";
import { Route } from "@/components/rank-gps/Route";
import { ShareSheet } from "@/components/rank-gps/ShareSheet";
import { WhatIf } from "@/components/rank-gps/WhatIf";
import { WhyMoved } from "@/components/rank-gps/WhyMoved";
import { PanelSection, LogScreenScaffold } from "@/components/logs/LogScreenScaffold";
import { InsightsTabs } from "@/components/insights/InsightsTabs";
import { StatCard } from "@/components/stats/StatCard";
import { CoralButton } from "@/components/ui/CoralButton";
import { GhostButton } from "@/components/ui/GhostButton";
import { PageLoader } from "@/components/ui/PageLoader";
import { clearRequestCache } from "@/lib/api/authRequest";
import { ApiError } from "@/lib/api/http";
import { getRankGps, getRankGpsSnapshot, refreshRankGps, waitForRankGps, type RankGpsOverview, type SnapshotView } from "@/lib/api/rankGps";
import { useStoredFullName } from "@/lib/auth/useStoredFullName";
import { signed, weekLabel } from "@/lib/rankGps/format";
import { COPY } from "@/lib/rankGps/labels";

type Build = { state: "idle" } | { state: "preparing"; id: string } | { state: "slow" } | { state: "failed" };

const BANNER_KEY = "prepex-rank-gps-pro-banner";
const bannerSeen = (id: string) => {
  try {
    return window.localStorage.getItem(BANNER_KEY) === id;
  } catch {
    return false;
  }
};

export function RankGpsScreen() {
  const [data, setData] = useState<RankGpsOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [past, setPast] = useState<SnapshotView | null>(null);
  const [build, setBuild] = useState<Build>({ state: "idle" });
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [share, setShare] = useState(false);
  const [bannerGone, setBannerGone] = useState(false);
  const alive = useRef(true);
  const waiting = useRef<string | null>(null);
  const name = useStoredFullName();
  const firstName = name.trim().split(/\s+/)[0] ?? "";

  const load = useCallback(async () => {
    try {
      const res = await getRankGps();
      if (!alive.current) return;
      setData(res);
      setError(null);
      return res;
    } catch (err) {
      if (alive.current) setError(err instanceof ApiError ? err.message : "We couldn't load your Rank GPS. Please try again.");
    }
  }, []);

  // One held request per build (the server answers when the report is ready or after 25 s). It never loops.
  const waitFor = useCallback(
    async (id: string) => {
      if (waiting.current === id) return;
      waiting.current = id;
      setBuild({ state: "preparing", id });
      try {
        const res = await waitForRankGps(id);
        if (!alive.current) return;
        if (res.status === "ready") {
          clearRequestCache();
          setPast(null);
          setBuild({ state: "idle" });
          await load();
        } else if (res.status === "failed") {
          setBuild({ state: "failed" });
        } else {
          setBuild({ state: "slow" });
        }
      } catch {
        if (alive.current) setBuild({ state: "slow" });
      } finally {
        waiting.current = null;
      }
    },
    [load],
  );

  useEffect(() => {
    alive.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load once on arrival
    void load().then((d) => {
      if (d?.preparing && alive.current) void waitFor(d.preparing.id);
    });
    return () => {
      alive.current = false;
    };
  }, [load, waitFor]);

  async function refresh() {
    setRefreshError(null);
    try {
      const res = await refreshRankGps();
      await waitFor(res.id);
    } catch (err) {
      setRefreshError(err instanceof ApiError ? err.message : "We could not start that. Please try again.");
    }
  }

  async function openPast(id: string) {
    try {
      setPast(await getRankGpsSnapshot(id));
    } catch {
      setRefreshError("We could not open that report.");
    }
  }

  if (!data && !error) return <PageLoader label={COPY.preparing} />;

  const view = past ?? data?.snapshot ?? null;
  const report = view?.report ?? null;
  const preparing = build.state === "preparing";
  const unlocked = data?.gate.unlocked ?? false;
  const change = view && data ? (data.history.find((h) => h.id === view.id)?.change ?? null) : null;
  const showBanner = !!view?.showProBanner && !bannerGone && typeof window !== "undefined" && !bannerSeen(view.id);

  function dismissBanner() {
    setBannerGone(true);
    try {
      if (view) window.localStorage.setItem(BANNER_KEY, view.id);
    } catch {
      /* the banner simply shows again next time */
    }
  }

  const side = data && (
    <>
      <PanelSection title="Refresh" testId="rank-gps-refresh">
        <p className="text-[13px] text-muted">
          Your report is built every Sunday evening.
          {data.refresh.inWindow ? ` In your first month you can also refresh it ${data.refresh.limit} times.` : ""}
        </p>
        <CoralButton className="min-h-11 w-full px-4 py-2 text-[14px]" disabled={!data.refresh.canRefresh || preparing} onClick={() => void refresh()} data-testid="rank-gps-refresh-btn">
          {COPY.refresh}
          {data.refresh.inWindow ? ` (${data.refresh.left} left this month)` : ""}
        </CoralButton>
        {!data.refresh.canRefresh && data.refresh.reason && <p className="text-[12px] text-muted">{data.refresh.reason}</p>}
        {refreshError && <p role="alert" className="text-[12px] font-medium text-danger">{refreshError}</p>}
      </PanelSection>
      <PanelSection title={COPY.pastReports} testId="rank-gps-history">
        {data.history.length === 0 ? (
          <p className="text-[13px] text-muted">Your reports will be listed here.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {data.history.map((h) => (
              <li key={h.id}>
                <button type="button" onClick={() => void openPast(h.id)} aria-current={view?.id === h.id} className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-2 text-left text-[13px] ${view?.id === h.id ? "bg-tint-strong font-bold text-ink" : "text-body-text hover:bg-tint-strong dark:text-ink"}`}>
                  <span>{weekLabel(h.weekStart)}{h.trigger === "on_demand" ? " · refresh" : ""}</span>
                  <span className="font-bold">{h.readiness === null ? "—" : Math.round(h.readiness)}{h.change ? <span className={`ml-2 font-semibold ${h.change > 0 ? "text-success" : "text-danger"}`}>{signed(h.change)}</span> : null}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </PanelSection>
    </>
  );

  return (
    <LogScreenScaffold name="rank-gps" title={COPY.name} subtitle={COPY.tagline} backHref="/home" tabBar={<InsightsTabs current="/analytics/rank-gps" />} sidePanelLabel="Refresh and past reports" sidePanel={side || undefined}>
      {error && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
          {error}{" "}
          <button type="button" className="font-bold underline" onClick={() => void load()}>Try again</button>
        </p>
      )}

      {preparing && <Preparing />}
      {build.state === "slow" && <Notice testId="rank-gps-slow">{COPY.slow}</Notice>}
      {build.state === "failed" && <Notice testId="rank-gps-failed">{COPY.failed}</Notice>}

      {data && !report && !preparing && (unlocked ? (
        <StatCard title={COPY.waitingFirst} subtitle={COPY.waitingFirstSub.toUpperCase()}>
          <div className="flex flex-col items-start gap-3" data-testid="rank-gps-waiting">
            <p className="text-[14px] text-muted">Everything it needs is in place.</p>
            <CoralButton disabled={!data.refresh.canRefresh} onClick={() => void refresh()} data-testid="rank-gps-first-btn">{COPY.getFirst}</CoralButton>
            {refreshError && <p role="alert" className="text-[12px] font-medium text-danger">{refreshError}</p>}
          </div>
        </StatCard>
      ) : (
        <LockedGate gate={data.gate} />
      ))}

      {view && report && data && (
        <div className="stagger flex flex-col gap-5" data-testid="rank-gps-report">
          {past && (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-tint-strong px-4 py-2 text-[13px] text-ink">
              <span>Report from {weekLabel(past.weekStart)}</span>
              <GhostButton className="min-h-11" onClick={() => setPast(null)}>Back to latest</GhostButton>
            </div>
          )}
          {view.tier === "preview" && <p className="w-fit rounded-full bg-tint-strong px-3 py-1 text-[12px] font-bold text-ink" data-testid="preview-badge">{COPY.previewBadge}</p>}
          {showBanner && (
            <div className="flex items-start justify-between gap-3 rounded-xl border border-border-subtle px-4 py-3 text-[13px] text-body-text dark:text-ink" data-testid="pro-banner">
              <span>{COPY.proBanner}</span>
              <button type="button" onClick={dismissBanner} aria-label="Dismiss" className="min-h-11 shrink-0 px-2 font-bold text-muted hover:text-ink">Dismiss</button>
            </div>
          )}

          <Hero report={report} change={change} targetPercentile={report.target?.targetPercentile ?? data.targetPercentile} onShare={() => setShare(true)} />
          {view.coachNote && <CoachNote note={view.coachNote} />}
          {report.change && <WhyMoved change={report.change} />}
          <Route moves={report.opportunity.moves} target={report.target} targetPercentile={data.targetPercentile} track={report.track} locked={view.locked} />
          <OpportunityMap chapters={report.opportunity.chapters} locked={view.locked.fullOpportunityMap} />
          <Autopsy autopsy={report.autopsy} locked={view.locked.autopsyTrend} hasMocks={report.projection.mocksHave > 0} />
          <EffortCheck effort={report.effort} />
          {report.whatIf && report.projection.data ? <WhatIf whatIf={report.whatIf} projection={report.projection.data} paperMax={report.paperMax} /> : view.locked.whatIf ? <ProLocked section="whatIf" /> : null}

          <ShareSheet
            open={share}
            onClose={() => setShare(false)}
            firstName={firstName}
            base={{
              score: report.readiness.score,
              change,
              percentile: report.projection.data?.percentile ?? null,
              rank: report.projection.data?.rank ?? null,
              topMove: report.opportunity.moves[0]?.name ?? null,
              week: weekLabel(view.weekStart),
            }}
          />
        </div>
      )}

      {!report && data && unlocked && <p className="text-[12px] text-muted">Questions about the numbers? <Link href="/analytics" className="underline">Back to your dashboard</Link>.</p>}
    </LogScreenScaffold>
  );
}

function Notice({ children, testId }: { children: string; testId: string }) {
  return <p role="status" data-testid={testId} className="rounded-xl border border-border-subtle px-4 py-3 text-[14px] text-body-text dark:text-ink">{children}</p>;
}

/** "Preparing your report…" as a skeleton in the shape of the report (no spinner). */
function Preparing() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-4" data-testid="rank-gps-preparing">
      <p className="text-[15px] font-bold text-ink">{COPY.preparing}</p>
      <p className="text-[13px] text-muted">{COPY.preparingSub}</p>
      <div className="skeleton h-56 rounded-[20px]" />
      <div className="skeleton h-28 rounded-2xl" />
      <div className="skeleton h-40 rounded-2xl" />
    </div>
  );
}
