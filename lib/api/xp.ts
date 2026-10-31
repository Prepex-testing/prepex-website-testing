import { CORE_API_BASE_URL } from "@/lib/api/config";
import { authenticatedRequest } from "@/lib/api/authRequest";

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
};

export const getXpSummary = () => core<XpSummary>("/xp/summary");

export type HeartbeatResult = { activeSeconds: number; countsToday: boolean; thresholdSeconds: number };
export const sendHeartbeat = (seconds: number) => core<HeartbeatResult>("/xp/heartbeat", { method: "POST", body: JSON.stringify({ seconds }) });

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
