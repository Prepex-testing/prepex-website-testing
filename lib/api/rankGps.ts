import { CORE_API_BASE_URL } from "@/lib/api/config";
import { authenticatedRequest } from "@/lib/api/authRequest";
import type { GateState, RankGpsReport, Track } from "@/lib/rankGps/types";

/** Rank GPS. core-service /api/rank-gps. Reading is cheap; a report is always built by a background job. */

type Envelope<T> = { success: true; data: T };
const core = <T>(path: string, options: RequestInit = {}) => authenticatedRequest<Envelope<T>>(`${CORE_API_BASE_URL}/api${path}`, options).then((r) => r.data);

export type Tier = "preview" | "free" | "full";
export type Locked = { fullOpportunityMap: boolean; autopsyTrend: boolean; whatIf: boolean; subjectGap: boolean };

export type SnapshotView = {
  id: string;
  createdAt: string;
  weekStart: string;
  trigger: "weekly" | "on_demand";
  tier: Tier;
  coachNote: string | null;
  coachSource: "ai" | "template" | null;
  report: RankGpsReport;
  locked: Locked;
  /** The one small "full reports are coming with Prepex Pro" banner: only on the second report. */
  showProBanner: boolean;
};

export type RefreshState = { limit: number; used: number; left: number; inWindow: boolean; windowEndsAt: string; canRefresh: boolean; reason: string | null };

export type HistoryItem = { id: string; weekStart: string; createdAt: string; readiness: number | null; change: number | null; tier: Tier; trigger: "weekly" | "on_demand" };

export type RankGpsOverview = {
  gate: GateState;
  snapshot: SnapshotView | null;
  preparing: { id: string } | null;
  history: HistoryItem[];
  targetPercentile: number | null;
  refresh: RefreshState;
  track: Track | null;
};

export type RankGpsHomeCard = {
  state: "locked" | "waiting" | "ready";
  score: number | null;
  change: number | null;
  topMove: { name: string; action: string } | null;
  gate: GateState;
};

export const getRankGps = () => core<RankGpsOverview>("/rank-gps");
export const getRankGpsSnapshot = (id: string) => core<SnapshotView>(`/rank-gps/snapshots/${id}`);
/** One held request (up to 25 s) that answers when the report is ready: the screen never polls. */
export function waitForRankGps(id: string, signal?: AbortSignal) {
  const own = new AbortController();
  const timer = setTimeout(() => own.abort(), 35_000);
  signal?.addEventListener("abort", () => own.abort());
  return core<{ status: "queued" | "building" | "ready" | "failed" }>(`/rank-gps/snapshots/${id}/wait`, { signal: own.signal }).finally(() => clearTimeout(timer));
}
export const setRankGpsTarget = (percentile: number | null) => core<{ targetPercentile: number | null }>("/rank-gps/target", { method: "PUT", body: JSON.stringify({ percentile }) });
export const refreshRankGps = () => core<{ id: string; status: "queued" | "building"; existing: boolean; left: number }>("/rank-gps/refresh", { method: "POST", body: JSON.stringify({}) });
export const addRankGpsMove = (moveId: string) => core<{ added: boolean; alreadyThere: boolean }>(`/rank-gps/moves/${encodeURIComponent(moveId)}/add`, { method: "POST", body: JSON.stringify({}) });
