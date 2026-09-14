import { CORE_API_BASE_URL } from "@/lib/api/config";
import { authenticatedRequest } from "@/lib/api/authRequest";
import type { PlannerSubject } from "@/lib/api/planner";

function authRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  return authenticatedRequest<T>(`${CORE_API_BASE_URL}/api/weakness${path}`, options);
}

export type WeaknessTier = "CRITICAL" | "STRONG" | "MODERATE" | "MILD" | "ON_TRACK";
export type WeaknessSignalLevel = "high" | "medium" | "low";
export type WeaknessSignalKey = "practice" | "revision" | "abandonment" | "time";

export type WeaknessChapter = {
  id: string;
  name: string;
  subject: PlannerSubject;
  chapterMetadata?: { category?: string | null; difficulty?: string | null } | null;
};

// Decimal columns come back over JSON as strings — callers coerce with Number().
export type WeakTopicSummary = {
  id: string;
  chapterId: string;
  weaknessScore: number | string;
  weaknessTier: WeaknessTier;
  tierLabel: string;
  practiceSignal: number | string;
  revisionSignal: number | string;
  abandonmentSignal: number | string;
  timeSignal: number | string;
  totalAttempts: number;
  practiceAccuracy: number | string | null;
  hardRevisionCount: number;
  abandonedTaskCount: number;
  avgTimeDeviation: number | string | null;
  isTopFocus: boolean;
  chapter: WeaknessChapter | null;
  /** Top 5 only — last 7 days' practice accuracy minus the 7 days before, in
   *  percentage points. Null when either week has no answered questions. */
  accuracyChangeThisWeek?: number | null;
};

export type WeaknessSignal = {
  key: WeaknessSignalKey;
  title: string;
  level: WeaknessSignalLevel | null;
  description: string;
  note?: string;
};

export type WeaknessRecommendedAction = {
  key: "watch_lecture" | "targeted_practice" | "revision_rotation" | (string & {});
  label: string;
  /** targeted_practice only — how many questions the set has (5 / 10 / 15 by tier). */
  questionCount?: number;
};

export type WeaknessTopicDetail = {
  chapterId: string;
  chapter: WeaknessChapter | null;
  weaknessScore: number;
  weaknessTier: WeaknessTier;
  tierLabel: string;
  isTopFocus: boolean;
  signalBreakdown: WeaknessSignal[];
  recommendedActions: WeaknessRecommendedAction[];
  planAdjustmentAvailable: boolean;
};

/** PRD 14.5 — Top 5 Weak Topics. */
export function getTop5WeakTopics() {
  return authRequest<{ topics: WeakTopicSummary[] }>("/top5");
}

/** PRD 14.4 — current stabilised Top Focus Topic (null until enough data). */
export function getFocusTopic() {
  return authRequest<{ focusTopic: WeakTopicSummary | null }>("/focus-topic");
}

/** PRD 14.6 — Weakness Detail Screen for one topic. */
export function getWeaknessTopicDetail(chapterId: string) {
  return authRequest<WeaknessTopicDetail>(`/topic/${chapterId}`);
}

/**
 * "Practice N questions targeted" — creates today's practice task for the
 * chapter (or returns the unfinished one) with its questions drawn, ready
 * for /practice?taskId=.
 */
export function startTargetedPractice(chapterId: string) {
  return authRequest<{ success: true; data: { taskId: string; questionCount: number; reused: boolean } }>(
    `/topic/${chapterId}/targeted-practice`,
    { method: "POST" },
  );
}

export type RevisionRotationResult = {
  chapterId: string;
  previousStatus: string;
  status: string;
  previousRevisionCount: number;
  revisionCount: number;
  currentIntervalDays: number | null;
  nextRevisionAt: string | null;
};

/** "Add to revision rotation" — one revision stage back, so the next revision comes sooner. */
export function addToRevisionRotation(chapterId: string) {
  return authRequest<{ success: true; data: RevisionRotationResult }>(`/topic/${chapterId}/revision-rotation`, {
    method: "POST",
  });
}
