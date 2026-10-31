"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LifetimeCounters } from "@/components/rituals/HomeRituals";
import { StudyingNowStrip } from "@/components/social/social";
import { useSubjects } from "@/components/study/useSubjects";
import { getActiveFocusSession } from "@/lib/api/focus";
import { getProfileOverview } from "@/lib/api/profile";
import { getBoard } from "@/lib/api/social";
import { getStreakInfo } from "@/lib/api/streak";
import { getRewards, getXpSummary, type RewardsSummary, type XpSummary } from "@/lib/api/xp";
import { startFocusSession } from "@/lib/focus/startFocusSession";
import { clockText, daysLeftText, subjectKey } from "@/lib/home/top";

/**
 * The top of Home, modelled on the study-timer apps students already love: today's total as a big number that keeps
 * climbing while a session runs, one tap to start a subject, the days left to the exam, the streak flame, level and
 * rank, and who is studying right now. Everything is the student's real data.
 */
export function HomeTop() {
  const { subjects } = useSubjects();
  const [xp, setXp] = useState<XpSummary | null>(null);
  const [streak, setStreak] = useState<number | null>(null);
  const [rank, setRank] = useState<number | null | undefined>(undefined);
  const [daysLeft, setDaysLeft] = useState<{ days: number | null; exam: string | null } | null>(null);
  const [rewards, setRewards] = useState<RewardsSummary | null>(null);
  // the running session, as the server saw it, and when this device got that answer
  const [live, setLive] = useState<{ elapsed: number; running: boolean; at: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    void getXpSummary().then(setXp).catch(() => undefined);
    void getStreakInfo().then((s) => setStreak(s.currentStreak)).catch(() => undefined);
    void getBoard({ board: "today", filter: "india", limit: 0 }).then((b) => setRank(b.me.rank)).catch(() => setRank(null));
    void getProfileOverview()
      .then((r) => setDaysLeft({ days: r.data.daysUntilExam, exam: r.data.exam?.name ?? null }))
      .catch(() => undefined);
    void getRewards().then(setRewards).catch(() => undefined);
  }, []);

  // sync with the server's timer every 30 s; between syncs the number is computed from the server's elapsed seconds
  useEffect(() => {
    let alive = true;
    const sync = () =>
      void getActiveFocusSession()
        .then((r) => {
          if (!alive) return;
          const s = r.data.session;
          setLive(s ? { elapsed: s.elapsedSeconds, running: s.status === "ACTIVE", at: Date.now() } : null);
        })
        .catch(() => undefined);
    sync();
    const t = setInterval(sync, 30_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);
  useEffect(() => {
    if (!live?.running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [live?.running]);

  const totalSeconds = useMemo(() => {
    const base = (xp?.todayStudyMinutes ?? 0) * 60;
    if (!live) return base;
    return base + live.elapsed + (live.running ? Math.max(0, Math.round((now - live.at) / 1000)) : 0);
  }, [xp, live, now]);

  return (
    <section className="flex flex-col gap-4" aria-label="Today" data-testid="home-top">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4 rounded-2xl border border-border-subtle bg-surface-elevated p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">Studied today</p>
              <p className="mt-1 text-[48px] font-extrabold leading-none tabular-nums text-ink sm:text-[56px]" data-testid="today-total" aria-live="off">
                {xp ? clockText(totalSeconds) : "–:––:––"}
              </p>
              {live?.running && <p className="mt-1 text-[12px] text-muted" data-testid="timer-running">A session is running</p>}
            </div>
            <Link href="/home/leaderboard" className="shrink-0 rounded-xl border border-border-subtle bg-surface px-3 py-2 text-right" data-testid="today-rank">
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">Today</span>
              <span className="text-[20px] font-extrabold text-ink">{rank === undefined ? "…" : rank === null ? "No XP yet" : `#${rank}`}</span>
            </Link>
          </div>

          <div role="group" aria-label="Start studying" className="flex flex-wrap gap-2" data-testid="subject-start">
            {subjects.map((s) => (
              <button
                key={s.subjectId}
                type="button"
                data-testid={`start-${subjectKey(s.subjectName)}`}
                onClick={() => startFocusSession({ originSource: "home_quick_tile", subject: subjectKey(s.subjectName) })}
                className="min-h-12 flex-1 rounded-xl border border-border-subtle bg-surface px-4 text-[15px] font-bold text-ink transition hover:border-brand active:scale-[0.98]"
              >
                {s.subjectName}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link href="/profile" className="rounded-2xl border border-border-subtle bg-surface-elevated p-4" data-testid="days-left" aria-label="Days left to your exam. Edit the date in your profile.">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">{daysLeft?.exam ?? "Your exam"}</p>
            <p className="mt-1 text-[30px] font-extrabold leading-none text-ink">{daysLeft?.days === null || daysLeft === null ? "Set a date" : daysLeftText(daysLeft.days).big}</p>
            <p className="mt-1 text-[12px] text-muted">{daysLeft && daysLeft.days !== null ? daysLeftText(daysLeft.days).small : "Add your exam date"}</p>
          </Link>
          <Link href="/home/streak" className="rounded-2xl border border-border-subtle bg-surface-elevated p-4" data-testid="home-streak">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">Streak</p>
            <p className="mt-1 flex items-center gap-1 text-[30px] font-extrabold leading-none text-ink">
              <svg viewBox="0 0 24 24" className={`size-7 ${streak ? "text-[#FF6B47]" : "text-muted"}`} aria-hidden>
                <path fill="currentColor" d="M12 2c1 3-1 4.5-2.5 6.5C8 10.5 7 12 7 14.5A5 5 0 0 0 12 20a5 5 0 0 0 5-5.5c0-2-1-3.3-2-4.5-.4 1-1 1.7-1.7 2 .4-3-.2-6.5-1.3-10z" />
              </svg>
              {streak ?? "–"}
            </p>
            <p className="mt-1 text-[12px] text-muted">{streak === 1 ? "day" : "days"} in a row</p>
          </Link>
          <div className="col-span-2 rounded-2xl border border-border-subtle bg-surface-elevated p-4" data-testid="home-level">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[16px] font-extrabold text-ink">{xp ? `Level ${xp.level}, ${xp.title}` : "Level"}</p>
              <p className="text-[12px] text-muted">{xp ? `${xp.totalXp} XP${xp.nextThreshold ? ` · ${xp.nextThreshold - xp.totalXp} to level ${xp.level + 1}` : ""}` : ""}</p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/[0.08] dark:bg-white/[0.08]" role="progressbar" aria-valuenow={xp?.progressPct ?? 0} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to the next level">
              <div className="h-full rounded-full bg-[#3B6BFF] transition-[width] duration-500" style={{ width: `${xp?.progressPct ?? 0}%` }} />
            </div>
            <p className="mt-2 text-[12px] text-muted">{xp ? `${xp.todayXp} XP today · ${xp.monthXp} this month` : ""}</p>
          </div>
        </div>
      </div>

      <StudyingNowStrip />
      <LifetimeCounters lifetime={rewards?.lifetime ?? null} />
    </section>
  );
}
