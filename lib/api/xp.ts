import { CORE_API_BASE_URL } from "@/lib/api/config";
import { authenticatedRequest } from "@/lib/api/authRequest";
import type { PexoBatch, PexoState } from "@/lib/api/pexo";
import type { RankGpsHomeCard } from "@/lib/api/rankGps";

/** XP, levels, the active-time heartbeat and rewards (badges, records, lifetime counters). core-service /api/xp and /api/rewards. */

type Envelope<T> = { success: true; data: T };

const core = <T>(path: string, options: RequestInit = {}) => authenticatedRequest<Envelope<T>>(`${CORE_API_BASE_URL}/api${path}`, options).then((r) => r.data);

export type XpSummary = {
  level: number;
  title: string;
  totalXp: number;
  currentThreshold: number;
  nextThreshold: number | null;
  progressPct: number;
  todayXp: number;
  monthXp: number;
  /** Minutes behind today's XP (timer plus manual, capped like the XP). */
  todayMinutes: number;
  /** Real minutes studied today, including time past the XP cap. */
  todayStudyMinutes: number;
  /** The compact Rank GPS card for Home (null when it could not be read). */
  rankGps?: RankGpsHomeCard | null;
  /** Pexo: is it on for this student, their settings and what was already shown (null when it could not be read). */
  pexo?: PexoState | null;
};

type SummaryListener = (summary: XpSummary) => void;
const summaryListeners = new Set<SummaryListener>();
/** Told about every summary that arrives (Pexo keeps its state fresh from the call the app already makes). */
export function onXpSummary(listener: SummaryListener): () => void {
  summaryListeners.add(listener);
  return () => summaryListeners.delete(listener);
}

export const getXpSummary = () =>
  core<XpSummary>("/xp/summary").then((summary) => {
    for (const l of summaryListeners) {
      try {
        l(summary);
      } catch {
        /* a listener must never break the summary */
      }
    }
    return summary;
  });

export type HeartbeatResult = { activeSeconds: number; countsToday: boolean; thresholdSeconds: number; /** Friends who just started studying with this student (Pexo part D). */ pexoJoined?: { name: string }[] };
/** `pexo` is what Pexo showed since the last beat: it rides this call so a bubble never costs a request of its own. */
export const sendHeartbeat = (seconds: number, pexo?: PexoBatch | null) => core<HeartbeatResult>("/xp/heartbeat", { method: "POST", body: JSON.stringify(pexo ? { seconds, pexo } : { seconds }) });

export type BadgeInfo = { key: string; title: string; description: string; hidden: boolean; earned: boolean; earnedAt: string | null; seen: boolean };
export type RecordKind = "most_hours_day" | "most_questions_day" | "best_weekly_accuracy" | "longest_streak" | "best_chapter_improvement";
export type RewardsSummary = {
  lifetime: { questions: number; hours: number; chaptersCompleted: number };
  badges: BadgeInfo[];
  unseen: string[];
  records: { kind: RecordKind; value: number; achievedOn: string }[];
  brokenRecords: { kind: RecordKind; value: number; previous: number | null }[];
};

export const getRewards = () => core<RewardsSummary>("/rewards");
export const markBadgesSeen = (keys: string[]) => core<{ marked: number }>("/rewards/seen", { method: "POST", body: JSON.stringify({ keys }) });

export const RECORD_LABELS: Record<RecordKind, { label: string; unit: string }> = {
  most_hours_day: { label: "Most hours in a day", unit: "h" },
  most_questions_day: { label: "Most questions in a day", unit: "" },
  best_weekly_accuracy: { label: "Best weekly accuracy", unit: "%" },
  longest_streak: { label: "Longest streak", unit: " days" },
  best_chapter_improvement: { label: "Biggest chapter improvement", unit: " points" },
};
