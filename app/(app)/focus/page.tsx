"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FocusRing } from "@/components/focus/FocusRing";
import { FocusSetup } from "@/components/focus/FocusSetup";
import { FocusSummaryModal } from "@/components/focus/FocusSummaryModal";
import { useFocusSession } from "@/components/focus/useFocusSession";
import { ProfileSubpageHeader } from "@/components/profile/ProfileSubpageHeader";
import { StudyTabs } from "@/components/study/StudyTabs";
import { useSubjects } from "@/components/study/useSubjects";
import { PageLoader } from "@/components/ui/PageLoader";
import { getFocusStats, type FocusStats } from "@/lib/api/focus";
import { formatMinutes } from "@/lib/study/format";
import { subjectColor } from "@/lib/study/subjects";
import { formatClock, ringProgress } from "@/lib/study/timer";

function StatsFooter({ stats }: { stats: FocusStats | null }) {
  return (
    <section aria-label="Today" className="grid grid-cols-3 gap-2 rounded-2xl border border-brand/10 bg-surface p-3" data-testid="focus-stats">
      <div className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Today</p>
        <p className="mt-1 text-[18px] font-extrabold text-ink" data-testid="stat-today">
          {stats ? formatMinutes(stats.todayMinutes) : "—"}
        </p>
      </div>
      <div className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">This week</p>
        <p className="mt-1 text-[18px] font-extrabold text-ink">{stats ? formatMinutes(stats.weekMinutes) : "—"}</p>
      </div>
      <div className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Streak</p>
        <p className="mt-1 text-[18px] font-extrabold text-ink" data-testid="stat-streak">
          {stats ? `${stats.currentStreak} day${stats.currentStreak === 1 ? "" : "s"}` : "—"}
        </p>
      </div>
    </section>
  );
}

export default function FocusPage() {
  const subjects = useSubjects();
  const focus = useFocusSession();
  const [stats, setStats] = useState<FocusStats | null>(null);

  const loadStats = useCallback(() => {
    getFocusStats()
      .then((res) => setStats(res.data))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Refresh the footer when a session has just been saved.
  useEffect(() => {
    if (focus.phase === "done") loadStats();
  }, [focus.phase, loadStats]);

  if (focus.phase === "loading" || subjects.status === "loading") return <PageLoader label="Getting your focus space ready…" />;

  const session = focus.session;
  const running = (focus.phase === "running" || focus.phase === "stopping") && session !== null;
  const planned = session?.plannedMinutes ?? 0;
  const progress = ringProgress(planned, focus.elapsedSeconds);
  const overtime = running && focus.remainingSeconds < 0;
  const subjectName = session ? subjects.lookup.subjectName(session.subjectId) : "";
  const chapterName = session ? subjects.lookup.chapterName(session.chapterId) : null;

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 lg:mx-auto lg:max-w-2xl lg:p-8" data-testid="focus-page">
      <ProfileSubpageHeader title="Focus" backHref="/home" />
      <StudyTabs current="/focus" />

      {subjects.status === "error" && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
          We couldn&apos;t load your subjects. Please refresh the page.
        </p>
      )}

      {focus.phase === "idle" && <FocusSetup subjects={subjects.subjects} busy={focus.busy} error={focus.error} onStart={(input) => void focus.start(input)} />}

      {running && session && (
        <section aria-label="Focus session" className="flex flex-col items-center gap-5 rounded-2xl border border-brand/10 bg-surface p-4 py-6 sm:p-6" data-testid="focus-running">
          <div className="flex flex-wrap items-center justify-center gap-2 text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-tint-strong px-3 py-1.5 text-[13px] font-bold text-ink dark:bg-[#FAF7F214]">
              <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: subjectColor(session.subjectId) }} />
              {subjectName}
              {chapterName ? ` · ${chapterName}` : ""}
            </span>
            {session.topic && <span className="text-[13px] font-semibold text-muted">{session.topic}</span>}
          </div>

          <FocusRing
            progress={progress}
            label={formatClock(focus.remainingSeconds)}
            paused={session.status === "PAUSED"}
            overtime={overtime}
            caption={session.status === "PAUSED" ? "Paused" : overtime ? "Overtime — wrap up when you're ready" : `of ${formatMinutes(planned)}`}
            ariaLabel={`${subjectName} focus timer. ${session.status === "PAUSED" ? "Paused." : ""} ${formatClock(focus.remainingSeconds)} ${overtime ? "over" : "left"}.`}
          />

          <div className="flex flex-wrap items-center justify-center gap-2 text-[12px] font-semibold text-muted">
            <span data-testid="interruptions">Distractions: {session.interruptionCount}</span>
            {session.deepFocusMode && <span className="rounded-full bg-tint-strong px-2 py-0.5 text-ink dark:bg-[#FAF7F214]">Deep Focus</span>}
          </div>

          {focus.error && (
            <p role="alert" className="w-full rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">
              {focus.error}
            </p>
          )}

          <div className="grid w-full max-w-sm grid-cols-2 gap-3">
            {session.status === "PAUSED" ? (
              <button type="button" data-testid="resume-focus" disabled={focus.busy} onClick={() => void focus.resume()} className="min-h-14 rounded-lg border border-primary-button-border bg-cta px-4 text-base font-semibold text-white hover:bg-[#E8623F] disabled:opacity-60">
                Resume
              </button>
            ) : (
              <button type="button" data-testid="pause-focus" disabled={focus.busy} onClick={() => void focus.pause()} className="min-h-14 rounded-lg border-[1.5px] border-secondary-button-border bg-surface px-4 text-base font-semibold text-body-text hover:bg-tint-strong disabled:opacity-60 dark:text-ink">
                Pause
              </button>
            )}
            <button type="button" data-testid="stop-focus" disabled={focus.busy} onClick={focus.requestStop} className="min-h-14 rounded-lg border border-[#1A1A4E] bg-[#1A1A4E] px-4 text-base font-semibold text-white hover:opacity-90 disabled:opacity-60 dark:border-[#FAF7F2] dark:bg-[#FAF7F2] dark:text-[#1A1A4E]">
              Stop
            </button>
          </div>
        </section>
      )}

      {focus.phase === "done" && focus.result && (
        <section className="flex flex-col gap-3 rounded-2xl border border-brand/10 bg-surface p-5 text-center" data-testid="focus-done">
          <p className="text-[20px] font-extrabold text-ink">{focus.result.focusSession.wasCompleted ? "Nice work." : "Session saved."}</p>
          <p className="text-[14px] text-body-text dark:text-ink" data-testid="focus-done-text">
            {focus.result.studySession
              ? `${formatMinutes(focus.result.studySession.durationMinutes)} added to your study log.`
              : "That was under a minute, so nothing was added to your study log."}
          </p>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button type="button" data-testid="focus-again" onClick={focus.reset} className="min-h-12 rounded-lg border border-primary-button-border bg-cta px-4 text-[15px] font-semibold text-white hover:bg-[#E8623F]">
              Start another
            </button>
            <Link href="/sessions" className="flex min-h-12 items-center justify-center rounded-lg border-[1.5px] border-secondary-button-border bg-surface px-4 text-[15px] font-semibold text-body-text hover:bg-tint-strong dark:text-ink">
              See study log
            </Link>
          </div>
        </section>
      )}

      <StatsFooter stats={stats} />

      {focus.phase === "stopping" && session && (
        <FocusSummaryModal
          open
          plannedMinutes={session.plannedMinutes}
          elapsedSeconds={focus.elapsedSeconds}
          interruptions={session.interruptionCount}
          busy={focus.busy}
          error={focus.error}
          onKeepGoing={focus.cancelStop}
          onSave={(win) => void focus.confirmStop(win)}
        />
      )}
    </div>
  );
}
