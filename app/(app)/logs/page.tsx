"use client";

import { useEffect, useState } from "react";
import { HubCard, type HubStat } from "@/components/logs/HubCard";
import { ProfileSubpageHeader } from "@/components/profile/ProfileSubpageHeader";
import { StudyTabs } from "@/components/study/StudyTabs";
import { getBacklogAnalytics } from "@/lib/api/backlogItems";
import { getMockAnalytics } from "@/lib/api/mocks";
import { getPracticeAnalytics } from "@/lib/api/practiceLogs";
import { listRevisions } from "@/lib/api/revisionLogs";
import { startOfTodayIso } from "@/lib/logs/dates";
import { percentLabel } from "@/lib/logs/labels";

type HubStats = { revision: HubStat; backlog: HubStat; practice: HubStat; mocks: HubStat };

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export default function LogsHubPage() {
  const [stats, setStats] = useState<HubStats>({ revision: null, backlog: null, practice: null, mocks: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    // each card fails on its own: one slow or broken request never blanks the hub
    Promise.allSettled([listRevisions({ from: startOfTodayIso(), limit: 50 }), getBacklogAnalytics(), getPracticeAnalytics({ period: "week" }), getMockAnalytics({ period: "all" })]).then(([rev, bl, pr, mk]) => {
      if (!alive) return;
      setStats({
        revision: rev.status === "fulfilled" ? { value: String(rev.value.data.items.length), caption: rev.value.data.items.length === 1 ? "revision today" : "revisions today" } : null,
        backlog: bl.status === "fulfilled" ? { value: String(bl.value.data.totals.open + bl.value.data.totals.scheduled), caption: bl.value.data.totals.open + bl.value.data.totals.scheduled === 1 ? "item to clear" : "items to clear" } : null,
        practice:
          pr.status === "fulfilled"
            ? { value: percentLabel(pr.value.data.totals.accuracy), caption: pr.value.data.totals.attempted > 0 ? `accuracy this week · ${plural(pr.value.data.totals.attempted, "question", "questions")}` : "no practice this week" }
            : null,
        mocks:
          mk.status === "fulfilled"
            ? { value: String(mk.value.data.totals.mocks), caption: mk.value.data.score ? `${mk.value.data.totals.mocks === 1 ? "mock" : "mocks"} · latest ${mk.value.data.score.latestPercent}%` : "no mocks logged yet" }
            : null,
      });
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 lg:mx-auto lg:max-w-3xl lg:p-8" data-testid="logs-hub">
      <ProfileSubpageHeader title="Logs" backHref="/home" />
      <StudyTabs current="/logs" />
      <p className="text-[14px] text-muted">Keep a record of what you revise, what you are behind on, and the questions you solve. Your planner reads all three.</p>
      <div className="grid grid-cols-1 gap-3">
        <HubCard testId="hub-revision" href="/logs/revision" title="Revision" blurb="What you revised, and what is going stale." stat={stats.revision} loading={loading} />
        <HubCard testId="hub-backlog" href="/logs/backlog" title="Backlog" blurb="What you are behind on, with deadlines." stat={stats.backlog} loading={loading} />
        <HubCard testId="hub-practice" href="/logs/practice" title="Practice" blurb="Questions solved, accuracy and speed." stat={stats.practice} loading={loading} />
        <HubCard testId="hub-mocks" href="/logs/mocks" title="Mock tests" blurb="Scores, percentile, projected rank and the chapters tests keep exposing." stat={stats.mocks} loading={loading} />
      </div>
    </div>
  );
}
