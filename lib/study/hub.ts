import type { BacklogAnalytics, BacklogItem } from "@/lib/api/backlogItems";
import type { MockAnalytics } from "@/lib/api/mocks";
import type { PracticeAnalytics } from "@/lib/api/practiceLogs";
import { openRevisionTasks, type RevisionOverview } from "@/lib/api/revision";
import type { RevisionAnalytics } from "@/lib/api/revisionLogs";
import { agoLabel, dayKey, dayLabel } from "@/lib/logs/dates";

/**
 * What the Logs hub cards show on a desktop beyond the headline number. Every function reads only what the backend
 * already returns; a figure that cannot be computed from it is left out (null or an empty list), never guessed.
 */

export type RevisionHub = {
  /** The same source as the planner and Quick Access: revision tasks on today's plan. */
  dueToday: number;
  /** Chapters in the revision cycle whose next revision date is before today. */
  overdue: number;
  doneThisWeek: number | null;
  stale: { name: string; ago: string }[];
};

export function revisionHub(overview: RevisionOverview | null, analytics: RevisionAnalytics | null, now: Date = new Date()): RevisionHub | null {
  if (!overview) return null;
  const today = dayKey(now);
  // the server stores a due day as that day's midnight in India (18:30 UTC the day before), so compare local days
  const overdue = overview.upcomingRevisions.chapters.filter((c) => c.nextRevisionAt !== null && dayKey(new Date(c.nextRevisionAt)) < today).length;
  return {
    dueToday: openRevisionTasks(overview).length,
    overdue,
    doneThisWeek: analytics ? analytics.totals.revisions : null,
    stale: (analytics?.stale ?? []).slice(0, 3).map((s) => ({ name: s.chapterName ?? "A chapter", ago: agoLabel(s.daysAgo) })),
  };
}

export type BacklogHub = {
  toClear: number;
  /** `more` when the open list was cut off by the page size, so the count is a floor. */
  overdue: { count: number; more: boolean };
  nextDeadline: string | null;
  byDeadline: { label: string; when: string; overdue: boolean }[];
};

export function backlogHub(analytics: BacklogAnalytics | null, items: BacklogItem[] | null, more: boolean, now: Date = new Date()): BacklogHub | null {
  if (!analytics) return null;
  const names = new Map<string, string>();
  for (const f of analytics.redFlags) if (f.chapterId && f.chapterName) names.set(f.chapterId, f.chapterName);
  const dated = (items ?? []).filter((i) => i.deadline).sort((a, b) => (a.deadline! < b.deadline! ? -1 : a.deadline! > b.deadline! ? 1 : 0));
  const upcoming = dated.filter((i) => !i.isOverdue);
  return {
    toClear: analytics.totals.open + analytics.totals.scheduled,
    overdue: { count: (items ?? []).filter((i) => i.isOverdue).length, more },
    nextDeadline: upcoming[0]?.deadline ? dayLabel(upcoming[0].deadline, now) : null,
    byDeadline: dated.slice(0, 3).map((i) => ({
      label: i.topic ?? (i.chapterId ? names.get(i.chapterId) : undefined) ?? "Backlog item",
      when: dayLabel(i.deadline!, now),
      overdue: i.isOverdue,
    })),
  };
}

export type PracticeHub = {
  accuracy: number | null;
  attempted: number;
  /** Accuracy per day this week, oldest first; only days with questions. */
  series: number[];
  weakest: { name: string; accuracy: number } | null;
};

export function practiceHub(a: PracticeAnalytics | null): PracticeHub | null {
  if (!a) return null;
  const weak = a.weakness.filter((w) => w.accuracy !== null && w.attempted > 0).sort((x, y) => (x.accuracy as number) - (y.accuracy as number))[0];
  return {
    accuracy: a.totals.accuracy,
    attempted: a.totals.attempted,
    series: a.byDay.filter((d) => d.accuracy !== null).map((d) => d.accuracy as number),
    weakest: weak ? { name: weak.chapterName ?? "A chapter", accuracy: weak.accuracy as number } : null,
  };
}

export type MockHub = {
  count: number;
  last: { scorePercent: number; percentile: number | null } | null;
  /** The last few scores, oldest first. */
  series: number[];
  exposing: { name: string; mocks: number } | null;
};

export function mockHub(a: MockAnalytics | null): MockHub | null {
  if (!a) return null;
  const trend = [...a.trend].sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : 0));
  const last = trend[trend.length - 1];
  const top = [...a.weakChapters].sort((x, y) => y.mocks - x.mocks)[0];
  const name = top ? a.weakChapterNames[top.chapterId] : null;
  return {
    count: a.totals.mocks,
    last: last ? { scorePercent: last.scorePercent, percentile: last.percentile } : null,
    series: trend.slice(-6).map((t) => t.scorePercent),
    exposing: top && name ? { name, mocks: top.mocks } : null,
  };
}

export type SummaryStrip = { hoursThisWeek: number | null; sessions: number | null; questions: number | null; streak: number | null };

/** The strip's tiles. Each is null when its source did not answer; the strip then leaves that tile out. */
export function summaryStrip(input: { weekMinutes: number | null; sessionCount: number | null; questions: number | null; streak: number | null }): SummaryStrip {
  return {
    hoursThisWeek: input.weekMinutes === null ? null : Math.round((input.weekMinutes / 60) * 10) / 10,
    sessions: input.sessionCount,
    questions: input.questions,
    streak: input.streak,
  };
}
