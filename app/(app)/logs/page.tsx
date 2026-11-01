"use client";

import { useEffect, useState, type ReactNode } from "react";
import { HubCard, type HubStat } from "@/components/logs/HubCard";
import { HubLink } from "@/components/logs/HubLink";
import { Sparkline } from "@/components/logs/LogScreenScaffold";
import { CountUp } from "@/components/study/CountUp";
import { StudyShell } from "@/components/study/StudyShell";
import { getBacklogAnalytics, listBacklogItems } from "@/lib/api/backlogItems";
import { getMockAnalytics } from "@/lib/api/mocks";
import { getPracticeAnalytics } from "@/lib/api/practiceLogs";
import { getRevisionOverview } from "@/lib/api/revision";
import { getRevisionAnalytics } from "@/lib/api/revisionLogs";
import { getStreakInfo } from "@/lib/api/streak";
import { getStudySummary } from "@/lib/api/studyLog";
import { percentLabel } from "@/lib/logs/labels";
import { backlogHub, mockHub, practiceHub, revisionHub, summaryStrip, type BacklogHub, type MockHub, type PracticeHub, type RevisionHub, type SummaryStrip } from "@/lib/study/hub";

type Hub = { revision: RevisionHub | null; backlog: BacklogHub | null; practice: PracticeHub | null; mocks: MockHub | null; strip: SummaryStrip | null };

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function Line({ label, value }: { label: string; value: ReactNode }) {
  return (
    <p className="flex items-baseline justify-between gap-3 text-[13px]">
      <span className="text-muted">{label}</span>
      <span className="min-w-0 truncate text-right font-semibold text-ink">{value}</span>
    </p>
  );
}

function List({ title, rows }: { title: string; rows: { left: string; right: string }[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="mt-2 flex flex-col gap-1">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">{title}</p>
      {rows.map((r) => (
        <p key={`${r.left}-${r.right}`} className="flex items-baseline justify-between gap-3 text-[13px]">
          <span className="min-w-0 truncate text-ink">{r.left}</span>
          <span className="shrink-0 text-muted">{r.right}</span>
        </p>
      ))}
    </div>
  );
}

type Tile = { id: string; label: string; value: number; format: (n: number) => string };

function Strip({ strip }: { strip: SummaryStrip }) {
  const tiles: Tile[] = [];
  if (strip.hoursThisWeek !== null) tiles.push({ id: "hours", label: "Hours this week", value: strip.hoursThisWeek, format: (n) => `${n}h` });
  if (strip.sessions !== null) tiles.push({ id: "sessions", label: "Sessions", value: strip.sessions, format: (n) => String(n) });
  if (strip.questions !== null) tiles.push({ id: "questions", label: "Questions solved", value: strip.questions, format: (n) => String(n) });
  if (strip.streak !== null) tiles.push({ id: "streak", label: "Current streak", value: strip.streak, format: (n) => `${n} day${n === 1 ? "" : "s"}` });
  if (tiles.length === 0) return null;
  return (
    <section aria-label="This week" className="hidden gap-3 lg:grid" style={{ gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))` }} data-testid="hub-strip">
      {tiles.map((t, i) => (
        <div key={t.id} style={{ animationDelay: `${i * 40}ms` }} className="study-fade-in rounded-2xl border border-border-subtle bg-surface-elevated p-4">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">{t.label}</p>
          <p className="mt-1 text-[28px] font-extrabold leading-none text-ink">
            <CountUp value={t.value} format={t.format} testId={`hub-strip-${t.id}`} />
          </p>
        </div>
      ))}
    </section>
  );
}

export default function LogsHubPage() {
  const [hub, setHub] = useState<Hub>({ revision: null, backlog: null, practice: null, mocks: null, strip: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    // each card fails on its own: one slow or broken request never blanks the hub
    Promise.allSettled([
      getRevisionOverview(),
      getRevisionAnalytics("week"),
      getBacklogAnalytics(),
      listBacklogItems({ status: "open", limit: 50 }),
      getPracticeAnalytics({ period: "week" }),
      getMockAnalytics({ period: "all" }),
      getStudySummary("week"),
      getStreakInfo(),
    ]).then(([ov, ra, ba, bl, pr, mk, ss, st]) => {
      if (!alive) return;
      const practice = pr.status === "fulfilled" ? pr.value.data : null;
      setHub({
        revision: revisionHub(ov.status === "fulfilled" ? ov.value.data : null, ra.status === "fulfilled" ? ra.value.data : null),
        backlog: backlogHub(ba.status === "fulfilled" ? ba.value.data : null, bl.status === "fulfilled" ? bl.value.data.items : null, bl.status === "fulfilled" && bl.value.data.nextCursor !== null),
        practice: practiceHub(practice),
        mocks: mockHub(mk.status === "fulfilled" ? mk.value.data : null),
        strip: summaryStrip({
          weekMinutes: ss.status === "fulfilled" ? ss.value.data.totalMinutes : null,
          sessionCount: ss.status === "fulfilled" ? ss.value.data.sessionCount : null,
          questions: practice ? practice.totals.attempted : null,
          streak: st.status === "fulfilled" ? st.value.currentStreak : null,
        }),
      });
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const { revision, backlog, practice, mocks, strip } = hub;

  const revisionStat: HubStat = revision ? { value: String(revision.dueToday), count: revision.dueToday, caption: revision.dueToday === 1 ? "revision due today" : "revisions due today" } : null;
  const backlogStat: HubStat = backlog ? { value: String(backlog.toClear), count: backlog.toClear, caption: backlog.toClear === 1 ? "item to clear" : "items to clear" } : null;
  const practiceStat: HubStat = practice
    ? { value: percentLabel(practice.accuracy), caption: practice.attempted > 0 ? `accuracy this week · ${plural(practice.attempted, "question", "questions")}` : "no practice this week" }
    : null;
  const mocksStat: HubStat = mocks ? { value: String(mocks.count), count: mocks.count, caption: mocks.last ? `${mocks.count === 1 ? "mock" : "mocks"} · latest ${mocks.last.scorePercent}%` : "no mocks logged yet" } : null;

  return (
    <StudyShell current="/logs" testId="logs-hub">
      <p className="text-[14px] text-muted">Keep a record of what you revise, what you are behind on, the questions you solve and your mock tests. Your planner reads all four.</p>
      {strip && <Strip strip={strip} />}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
        <HubCard
          index={0}
          testId="hub-revision"
          href="/logs/revision"
          title="Revision"
          blurb="What you revised, and what is going stale."
          stat={revisionStat}
          loading={loading}
          extras={
            revision && (
              <>
                <Line label="Overdue" value={revision.overdue} />
                {revision.doneThisWeek !== null && <Line label="Done this week" value={revision.doneThisWeek} />}
                <List title="Stalest chapters" rows={revision.stale.map((s) => ({ left: s.name, right: s.ago }))} />
              </>
            )
          }
        />
        <HubCard
          index={1}
          testId="hub-backlog"
          href="/logs/backlog"
          title="Backlog"
          blurb="What you are behind on, with deadlines."
          stat={backlogStat}
          loading={loading}
          extras={
            backlog && (
              <>
                <Line label="Overdue" value={`${backlog.overdue.count}${backlog.overdue.more ? "+" : ""}`} />
                {backlog.nextDeadline && <Line label="Next deadline" value={backlog.nextDeadline} />}
                <List title="By deadline" rows={backlog.byDeadline.map((b) => ({ left: b.label, right: b.overdue ? `${b.when} · overdue` : b.when }))} />
              </>
            )
          }
        />
        <HubCard
          index={2}
          testId="hub-practice"
          href="/logs/practice"
          title="Practice"
          blurb="Questions solved, accuracy and speed."
          stat={practiceStat}
          loading={loading}
          extras={
            practice && (
              <>
                {practice.series.length >= 2 && <Sparkline fit points={practice.series} label="Accuracy by day this week" />}
                {practice.weakest && <Line label="Weakest chapter" value={`${practice.weakest.name} · ${Math.round(practice.weakest.accuracy)}%`} />}
              </>
            )
          }
        />
        <HubCard
          index={3}
          testId="hub-mocks"
          href="/logs/mocks"
          title="Mock tests"
          blurb="Scores, percentile, projected rank and the chapters tests keep exposing."
          stat={mocksStat}
          loading={loading}
          extras={
            mocks && (
              <>
                {mocks.last && <Line label="Last score" value={`${mocks.last.scorePercent}%${mocks.last.percentile !== null ? ` · ${mocks.last.percentile} percentile` : ""}`} />}
                {mocks.series.length >= 2 && <Sparkline fit points={mocks.series} label="Your last mock scores" />}
                {mocks.exposing && <Line label="Keeps coming up" value={`${mocks.exposing.name} · ${plural(mocks.exposing.mocks, "mock", "mocks")}`} />}
              </>
            )
          }
        />
      </div>
      <h2 className="text-[13px] font-bold uppercase tracking-wide text-muted">Also here</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="hub-links">
        <HubLink testId="hub-sessions" href="/sessions" title="Study sessions" blurb="Everything you've studied, by day." />
        <HubLink testId="hub-mistakes" href="/notebooks" title="My Notebooks" blurb="Review what you got wrong." />
        <HubLink testId="hub-practice-sessions" href="/practice/sessions" title="Practice questions" blurb="Solve questions in Prepex." />
        <HubLink testId="hub-plan" href="/plan" title="Plan" blurb="Your planner and calendar of tasks." />
        <HubLink testId="hub-calendar" href="/calendar" title="Calendar" blurb="Study heatmap, day by day." />
        <HubLink testId="hub-syllabus" href="/syllabus" title="Syllabus" blurb="Every chapter: strength, hours, theory." />
      </div>
    </StudyShell>
  );
}
