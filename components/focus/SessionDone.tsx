"use client";

import Link from "next/link";
import { SessionWrap } from "@/components/focus/SessionWrap";
import { StreakChip } from "@/components/focus/StreakChip";
import type { StopFocusResult } from "@/lib/api/focus";
import { TASK_TYPE_LABELS, originBackHref, type OriginSource } from "@/lib/focus/intent";
import { formatMinutes } from "@/lib/study/format";

/** The plain-English lines for what the session wrote. Pure, so the wording is tested without rendering. */
export function loggedLines(result: StopFocusResult): string[] {
  const { completion, focusSession } = result;
  const lines: string[] = [];
  const o = completion.origin;

  if (o.updated === "plan_task") lines.push(o.status === "COMPLETED" ? "Marked your planner task as done." : "Added your time to your planner task.");
  if (o.updated === "backlog_item") lines.push(o.status === "cleared" ? "Cleared that backlog item." : `That backlog item is ${o.progressPercent ?? 0}% done.`);
  if (o.updated === "backlog_task") lines.push(o.status === "COMPLETED" ? "Marked that backlog task as done." : "Kept that backlog task open.");
  if (o.updated === "weekly_goal") lines.push("Counted towards your weekly goal.");

  if (completion.practiceLogId) lines.push("Saved your practice log.");
  if (completion.mistakesCreated > 0) {
    lines.push(`${completion.mistakesCreated} ${completion.mistakesCreated === 1 ? "question was" : "questions were"} added to your mistake notebook.`);
  }
  if (completion.mistakesSkipped > 0) lines.push(`Your mistake notebook is full, so ${completion.mistakesSkipped} could not be added.`);

  if (completion.revision) {
    const days = completion.revision.intervalDays;
    lines.push(completion.revision.lapsed ? "Your next revision of this chapter is tomorrow." : `Your next revision of this chapter is in ${days} ${days === 1 ? "day" : "days"}.`);
  }
  if (completion.mockReviewLogId) lines.push("Saved your mock review time.");

  if (completion.chapter) {
    if (focusSession.taskType === "lecture") lines.push(`Lecture time on this chapter: ${formatMinutes(completion.chapter.lectureMinutes)}.`);
    if (completion.chapter.theoryStatus === "studied" && (focusSession.taskType === "lecture" || focusSession.taskType === "self_study")) lines.push("This chapter's theory is marked as done.");
  }
  return [...lines, ...completion.notes];
}

type Props = {
  result: StopFocusResult | null;
  /** The save has not landed yet and is being retried in the background. */
  saving: boolean;
  subjectName: string;
  chapterName: string | null;
  originSource: OriginSource;
  shareMessage: string | null;
  sharing: boolean;
  onAnother: () => void;
  onShare: () => void;
  onCheckIn: () => void;
};

export function SessionDone({ result, saving, subjectName, chapterName, originSource, shareMessage, sharing, onAnother, onShare, onCheckIn }: Props) {
  if (!result) {
    return (
      <section className="flex flex-col items-center gap-3 rounded-2xl border border-brand/10 bg-surface p-6 text-center" data-testid="focus-saving" role="status">
        <p className="text-[20px] font-extrabold text-ink">{saving ? "Saving your session…" : "Session saved."}</p>
        <p className="text-[14px] text-body-text dark:text-ink">
          {saving ? "Session not fully saved. Retrying…" : "Your session has been saved."} Your answers are kept on this device until it goes through.
        </p>
        {!saving && (
          <button type="button" data-testid="focus-again" onClick={onAnother} className="min-h-12 rounded-lg border border-primary-button-border bg-cta px-6 text-[15px] font-semibold text-white hover:bg-[#E8623F]">
            Start another
          </button>
        )}
      </section>
    );
  }

  const { focusSession, studySession, extras } = result;
  const lines = loggedLines(result);

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-brand/10 bg-surface p-5 text-center" data-testid="focus-done">
      <p className="text-[22px] font-extrabold text-ink">{focusSession.wasCompleted ? "Nice work." : "Session saved."}</p>
      <p className="text-[14px] text-body-text dark:text-ink" data-testid="focus-done-text">
        {studySession ? `${formatMinutes(studySession.durationMinutes)} added to your study log.` : "That was under a minute, so nothing was added to your study log."}
      </p>

      {extras.goalHits.length > 0 && (
        <div role="status" data-testid="goal-hit" className="rounded-xl bg-success-bg px-3 py-3 text-[14px] font-bold text-success">
          {extras.goalHits.length === 1 ? "Goal hit! You reached one of your weekly goals." : `Goal hit! You reached ${extras.goalHits.length} weekly goals.`}
        </div>
      )}

      {lines.length > 0 && (
        <ul className="flex flex-col gap-1.5 rounded-xl bg-tint-strong px-4 py-3 text-left text-[14px] text-body-text dark:bg-[#FAF7F214] dark:text-ink" data-testid="logged-list" aria-label="What was saved">
          {lines.map((line) => (
            <li key={line} className="flex gap-2">
              <span aria-hidden className="text-success">
                ✓
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      )}

      <SessionWrap focusSessionId={focusSession.id} subjectId={focusSession.subjectId} chapterId={focusSession.chapterId} topic={focusSession.topic} taskType={focusSession.taskType} />

      <div className="flex flex-col items-center gap-1.5">
        <StreakChip streak={extras.streak} />
        <p className="text-[12px] text-muted" data-testid="streak-note">
          {extras.streak.todayCounts ? "Today counts towards your streak." : `${extras.streak.minutesToCount} more ${extras.streak.minutesToCount === 1 ? "minute" : "minutes"} of focus and today counts towards your streak.`}
        </p>
      </div>

      {extras.needsCheckIn && (
        <div className="flex flex-col gap-2 rounded-xl border border-brand/15 px-4 py-3" data-testid="checkin-prompt">
          <p className="text-[14px] font-bold text-ink">You haven&apos;t checked in today.</p>
          <p className="text-[12px] text-muted">It takes about ten seconds and helps your plan fit how you feel.</p>
          <button type="button" onClick={onCheckIn} className="min-h-11 rounded-lg border-[1.5px] border-secondary-button-border bg-surface px-4 text-[14px] font-semibold text-body-text hover:bg-tint-strong dark:text-ink">
            Check in now
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button type="button" data-testid="focus-again" onClick={onAnother} className="min-h-12 rounded-lg border border-primary-button-border bg-cta px-4 text-[15px] font-semibold text-white hover:bg-[#E8623F]">
          Start another
        </button>
        <button
          type="button"
          data-testid="share-session"
          disabled={sharing || !studySession}
          onClick={onShare}
          className="min-h-12 rounded-lg border-[1.5px] border-secondary-button-border bg-surface px-4 text-[15px] font-semibold text-body-text hover:bg-tint-strong disabled:opacity-60 dark:text-ink"
        >
          {sharing ? "Making your card…" : "Share this session"}
        </button>
        <Link href={originBackHref(originSource)} data-testid="focus-back" className="flex min-h-12 items-center justify-center rounded-lg border-[1.5px] border-secondary-button-border bg-surface px-4 text-[15px] font-semibold text-body-text hover:bg-tint-strong dark:text-ink">
          {originSource === "standalone" || originSource === "home_quick_tile" ? "Back to Home" : "Back to where you started"}
        </Link>
        <Link href="/sessions" className="flex min-h-12 items-center justify-center rounded-lg border-[1.5px] border-secondary-button-border bg-surface px-4 text-[15px] font-semibold text-body-text hover:bg-tint-strong dark:text-ink">
          See study log
        </Link>
      </div>
      {shareMessage && (
        <p role="status" className="text-[12px] text-muted" data-testid="share-message">
          {shareMessage}
        </p>
      )}
      <p className="sr-only">
        {subjectName}
        {chapterName ? `, ${chapterName}` : ""}, {TASK_TYPE_LABELS[focusSession.taskType]}
      </p>
    </section>
  );
}
