"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AlertCircle, BookOpen, Compass, FileCheck, Library, ListChecks, NotebookPen, RotateCw, Target, Trophy } from "lucide-react";
import { getRevisionOverview } from "@/lib/api/revision";
import { getBacklogAnalytics } from "@/lib/api/backlogItems";
import { getMistakeStats } from "@/lib/api/mistakes";
import { getPracticeAnalytics } from "@/lib/api/practiceLogs";
import { listMocks } from "@/lib/api/mocks";
import { getStudySummary } from "@/lib/api/studyLog";

/** Home's Quick Access list: the same rows as before, with line icons and a live one-line status on the six main ones. */

export type QuickAccessKey = "focus" | "practice" | "revision" | "backlog" | "mistakes" | "mocks";

export type QuickAccessCounts = {
  sessionsToday: number | null;
  questionsThisWeek: number | null;
  revisionsDue: number | null;
  backlogOpen: number | null;
  mistakesOpen: number | null;
  mocksThisWeek: number | null;
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The grey line under each label. A count that could not be fetched falls back to what the row does. */
export function quickAccessSubtitles(c: QuickAccessCounts): Record<QuickAccessKey, string> {
  return {
    focus: c.sessionsToday === null ? "Start a session" : plural(c.sessionsToday, "session today", "sessions today"),
    practice: c.questionsThisWeek === null ? "Solve questions" : plural(c.questionsThisWeek, "question this week", "questions this week"),
    revision: c.revisionsDue === null ? "Revise chapters" : `${c.revisionsDue} due today`,
    backlog: c.backlogOpen === null ? "Clear what you owe" : `${c.backlogOpen} open`,
    mistakes: c.mistakesOpen === null ? "Review mistakes" : `${c.mistakesOpen} unresolved`,
    mocks: c.mocksThisWeek === null ? "Analyze and improve" : `${c.mocksThisWeek} this week`,
  };
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Monday of the current week and today, as YYYY-MM-DD. */
function thisWeek(now = new Date()): { from: string; to: string } {
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return { from: iso(monday), to: iso(now) };
}

const EMPTY: QuickAccessCounts = { sessionsToday: null, questionsThisWeek: null, revisionsDue: null, backlogOpen: null, mistakesOpen: null, mocksThisWeek: null };

/** Each count loads on its own: one slow or failing source never blanks the others. */
export function useQuickAccessCounts(): QuickAccessCounts {
  const [counts, setCounts] = useState<QuickAccessCounts>(EMPTY);

  useEffect(() => {
    let live = true;
    const week = thisWeek();
    const set = (patch: Partial<QuickAccessCounts>) => live && setCounts((c) => ({ ...c, ...patch }));
    getStudySummary("day").then((r) => set({ sessionsToday: r.data.sessionCount }), () => undefined);
    getPracticeAnalytics({ period: "week" }).then((r) => set({ questionsThisWeek: r.data.totals.attempted }), () => undefined);
    getRevisionOverview().then((r) => set({ revisionsDue: r.data.todaysRevisionTasks.count }), () => undefined);
    getBacklogAnalytics().then((r) => set({ backlogOpen: r.data.totals.open + r.data.totals.scheduled }), () => undefined);
    getMistakeStats().then((r) => set({ mistakesOpen: r.data.active }), () => undefined);
    listMocks({ from: week.from, to: week.to, limit: 100 }).then((r) => set({ mocksThisWeek: r.data.items.length }), () => undefined);
    return () => {
      live = false;
    };
  }, []);

  return counts;
}

export type QuickAccessItem = {
  key: string;
  label: string;
  icon: ReactNode;
  subtitle?: string;
  /** Omitted when the row starts something instead of navigating. */
  href?: string;
  action?: "focus";
  /** data-coach anchor for the Onboarding Coach. */
  coach?: string;
};

const ICON = "h-5 w-5";

export function quickAccessItems(counts: QuickAccessCounts): QuickAccessItem[] {
  const s = quickAccessSubtitles(counts);
  return [
    { key: "focus", label: "Focus", subtitle: s.focus, icon: <Target className={ICON} aria-hidden />, action: "focus" },
    { key: "practice", label: "Practice", subtitle: s.practice, icon: <BookOpen className={ICON} aria-hidden />, href: "/logs/practice", coach: "nav-practice" },
    { key: "revision", label: "Revision", subtitle: s.revision, icon: <RotateCw className={ICON} aria-hidden />, href: "/logs/revision", coach: "quick-revision" },
    { key: "backlog", label: "Backlog", subtitle: s.backlog, icon: <ListChecks className={ICON} aria-hidden />, href: "/logs/backlog", coach: "quick-backlog" },
    { key: "mistakes", label: "Mistakes", subtitle: s.mistakes, icon: <AlertCircle className={ICON} aria-hidden />, href: "/home/mistake-notebook", coach: "quick-mistakes" },
    { key: "mocks", label: "Mocks", subtitle: s.mocks, icon: <FileCheck className={ICON} aria-hidden />, href: "/logs/mocks", coach: "quick-mock" },
    // TODO(tile-wire): Where to focus next, Leader Board and Resource Library have no count yet; add one when their windows expose it.
    { key: "focus-next", label: "Where to focus next", icon: <Compass className={ICON} aria-hidden />, href: "/home/focus-next" },
    { key: "leaderboard", label: "Leader Board", icon: <Trophy className={ICON} aria-hidden />, href: "/home/leaderboard" },
    { key: "library", label: "Resource Library", icon: <Library className={ICON} aria-hidden />, href: "/home/resource-library" },
    // TODO(tile-wire): Weekly Win Journal shows a fixed line; show the latest card's week when the journal API has a cheap summary.
    { key: "journal", label: "Weekly Win Journal", subtitle: "Reflect & celebrate wins", icon: <NotebookPen className={ICON} aria-hidden />, href: "/home/journal", coach: "quick-journal" },
  ];
}
