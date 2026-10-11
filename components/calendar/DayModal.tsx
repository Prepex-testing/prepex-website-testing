"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ApiError } from "@/lib/api/http";
import { getDayView, type DayTask, type DayView } from "@/lib/api/calendarView";
import { dayHeadingOf, MOOD_LABEL } from "@/lib/insights/heatmap";
import { labelOfType } from "@/lib/insights/mockMath";
import { formatMinutes } from "@/lib/study/format";

const STATUS_LABEL: Record<DayTask["status"], string> = { PENDING: "To do", IN_PROGRESS: "In progress", COMPLETED: "Done", SKIPPED: "Skipped" };

function time(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

function Section({ title, count, children, testId }: { title: string; count: number; children: React.ReactNode; testId: string }) {
  if (count === 0) return null;
  return (
    <section className="flex flex-col gap-1.5" data-testid={testId}>
      <h3 className="text-[13px] font-bold uppercase tracking-wide text-muted">
        {title} <span className="font-semibold">· {count}</span>
      </h3>
      <ul className="flex flex-col gap-1.5">{children}</ul>
    </section>
  );
}

const ROW = "flex items-center justify-between gap-3 rounded-lg bg-tint-strong px-3 py-2 text-[14px]";

type Props = { date: string | null; onClose: () => void };

/** Everything about one day: what was planned and done, every log, the mood. */
export function DayModal({ date, onClose }: Props) {
  const [view, setView] = useState<DayView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!date) return;
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load the day when it is picked
    setView(null);
    setError(null);
    getDayView(date)
      .then((res) => alive && setView(res.data))
      .catch((err) => alive && setError(err instanceof ApiError ? err.message : "We couldn't load that day. Please try again."));
    return () => {
      alive = false;
    };
  }, [date]);

  const empty =
    view !== null &&
    view.planned.length === 0 &&
    view.logs.studySessions.length === 0 &&
    view.logs.focusSessions.length === 0 &&
    view.logs.practice.length === 0 &&
    view.logs.revisions.length === 0 &&
    view.logs.mistakes.length === 0 &&
    view.logs.mocks.length === 0;

  return (
    <Modal open={date !== null} onClose={onClose} ariaLabel={date ? dayHeadingOf(date) : "Day"} size="lg">
      <div className="flex flex-col gap-4" data-testid="day-modal">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[20px] font-extrabold text-ink">{date ? dayHeadingOf(date) : ""}</h2>
            {view && (
              <p className="mt-1 text-[13px] font-semibold text-muted">
                {view.isToday ? "Today" : view.isFuture ? "Coming up" : "Past"}
                {view.mood?.score ? ` · mood ${MOOD_LABEL[view.mood.score]}` : ""}
                {view.dayType === "NO_STUDY" ? " · rest day" : ""}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" data-testid="day-close" className="flex size-11 shrink-0 items-center justify-center rounded-full text-[22px] text-muted hover:bg-tint-strong">
            ×
          </button>
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
            {error}
          </p>
        )}
        {!view && !error && <div className="h-32 animate-pulse rounded-xl bg-tint-strong" aria-hidden />}

        {view && (
          <>
            <div className="grid grid-cols-3 gap-2 text-center" data-testid="day-totals">
              <div className="rounded-xl border border-brand/10 p-3">
                <p className="text-[20px] font-extrabold text-ink" data-testid="day-studied">
                  {formatMinutes(view.totals.studiedMinutes)}
                </p>
                <p className="text-[12px] font-semibold text-muted">studied</p>
              </div>
              <div className="rounded-xl border border-brand/10 p-3">
                <p className="text-[20px] font-extrabold text-ink" data-testid="day-focused">
                  {formatMinutes(view.totals.focusedMinutes)}
                </p>
                <p className="text-[12px] font-semibold text-muted">focused</p>
              </div>
              <div className="rounded-xl border border-brand/10 p-3">
                <p className="text-[20px] font-extrabold text-ink" data-testid="day-tasks">
                  {view.totals.tasksCompleted}/{view.totals.tasksPlanned}
                </p>
                <p className="text-[12px] font-semibold text-muted">tasks done</p>
              </div>
            </div>

            {view.weeklyReview && (
              <p className="rounded-lg bg-tint-strong px-3 py-2 text-[14px] font-semibold text-ink" data-testid="day-weekly-review">
                Weekly review ready{view.weeklyReview.title ? `: ${view.weeklyReview.title}` : ""}.
              </p>
            )}

            {empty && (
              <p className="rounded-xl border border-dashed border-brand/20 p-4 text-center text-[14px] text-muted" data-testid="day-empty">
                {view.isFuture ? "Nothing planned for this day yet." : "Nothing logged on this day."}
              </p>
            )}

            <Section title="Planned" count={view.planned.length} testId="day-planned">
              {view.planned.map((t) => (
                <li key={t.id} className={ROW}>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-body-text dark:text-ink">{t.title}</span>
                    <span className="block text-[12px] text-muted">
                      {t.estimatedMinutes > 0 ? formatMinutes(t.estimatedMinutes) : "—"}
                      {t.source === "pinned" ? " · pinned" : ""}
                    </span>
                  </span>
                  <span className={`shrink-0 text-[12px] font-bold ${t.status === "COMPLETED" ? "text-[#047857]" : "text-muted"}`}>{STATUS_LABEL[t.status]}</span>
                </li>
              ))}
            </Section>

            <Section title="Study" count={view.logs.studySessions.length} testId="day-study">
              {view.logs.studySessions.map((s) => (
                <li key={s.id} className={ROW}>
                  <span className="min-w-0 truncate font-semibold text-body-text dark:text-ink">{s.chapterName ?? s.topic ?? "Study"}</span>
                  <span className="shrink-0 text-muted">
                    {formatMinutes(s.minutes)} · {s.source === "focus_mode" ? "Focus" : "Logged"} · {time(s.loggedAt)}
                  </span>
                </li>
              ))}
            </Section>

            <Section title="Practice" count={view.logs.practice.length} testId="day-practice">
              {view.logs.practice.map((p) => (
                <li key={p.id} className={ROW}>
                  <span className="min-w-0 truncate font-semibold text-body-text dark:text-ink">{p.chapterName ?? "Practice"}</span>
                  <span className="shrink-0 text-muted">
                    {p.correct}/{p.attempted}
                    {p.accuracy !== null ? ` · ${p.accuracy}%` : ""}
                  </span>
                </li>
              ))}
            </Section>

            <Section title="Revision" count={view.logs.revisions.length} testId="day-revision">
              {view.logs.revisions.map((r) => (
                <li key={r.id} className={ROW}>
                  <span className="min-w-0 truncate font-semibold text-body-text dark:text-ink">{r.chapterName ?? "Revision"}</span>
                  <span className="shrink-0 text-muted">{formatMinutes(r.minutes)}</span>
                </li>
              ))}
            </Section>

            <Section title="Mistakes added" count={view.logs.mistakes.length} testId="day-mistakes">
              {view.logs.mistakes.map((m) => (
                <li key={m.id} className={ROW}>
                  <span className="min-w-0 truncate font-semibold text-body-text dark:text-ink">{m.chapterName ?? m.topic ?? "Mistake"}</span>
                </li>
              ))}
            </Section>

            <Section title="Mock tests" count={view.logs.mocks.length} testId="day-mocks">
              {view.logs.mocks.map((m) => (
                <li key={m.id} className={ROW}>
                  <span className="min-w-0 truncate font-semibold text-body-text dark:text-ink">{m.name ?? labelOfType(m.testType as never)}</span>
                  <span className="shrink-0 text-muted">
                    {m.totalMarks}/{m.maxMarks} · {m.scorePercent}%
                  </span>
                </li>
              ))}
            </Section>
          </>
        )}
      </div>
    </Modal>
  );
}
