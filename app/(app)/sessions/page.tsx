"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { QuickLogForm } from "@/components/sessions/QuickLogForm";
import { StudyLogList } from "@/components/sessions/StudyLogList";
import { CountUp } from "@/components/study/CountUp";
import { StudyShell } from "@/components/study/StudyShell";
import { FIELD } from "@/components/study/SubjectChapterFields";
import { useSubjects } from "@/components/study/useSubjects";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Modal } from "@/components/ui/Modal";
import { PageLoader } from "@/components/ui/PageLoader";
import { Toast, useToast } from "@/components/ui/Toast";
import type { StudyLogRow } from "@/lib/api/focus";
import { ApiError } from "@/lib/api/http";
import {
  createStudySession,
  deleteStudySession,
  getStudySummary,
  listStudySessions,
  updateStudySession,
  type NewStudySession,
  type StudyPeriod,
  type StudySummary,
} from "@/lib/api/studyLog";
import { dayKey } from "@/lib/logs/dates";
import { formatMinutes } from "@/lib/study/format";
import { sessionStats } from "@/lib/study/sessionStats";

const WeekChart = dynamic(() => import("@/components/sessions/WeekChart"), {
  ssr: false,
  loading: () => <div className="h-56 animate-pulse rounded-xl bg-tint-strong" aria-hidden />,
});

const msg = (err: unknown, fallback: string) => (err instanceof ApiError ? err.message : fallback);

export default function SessionsPage() {
  const subjects = useSubjects();

  const [period, setPeriod] = useState<StudyPeriod>("week");
  const [summary, setSummary] = useState<StudySummary | null>(null);
  const [rows, setRows] = useState<StudyLogRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [filterSubject, setFilterSubject] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const toast = useToast();
  const [editing, setEditing] = useState<StudyLogRow | null>(null);
  const [deleting, setDeleting] = useState<StudyLogRow | null>(null);
  const [formVersion, setFormVersion] = useState(0);

  const loadSummary = useCallback(async (p: StudyPeriod) => {
    try {
      setSummary((await getStudySummary(p)).data);
    } catch {
      /* the chart is secondary; the list below still works */
    }
  }, []);

  const loadRows = useCallback(async (subjectId: number | null, cursor: string | null, append: boolean) => {
    const res = await listStudySessions({ subjectId: subjectId ?? undefined, cursor, limit: 20 });
    setRows((prev) => (append ? [...prev, ...res.data.items] : res.data.items));
    setNextCursor(res.data.nextCursor);
  }, []);

  useEffect(() => {
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load (state is set after the awaits)
    Promise.all([loadRows(filterSubject, null, false), loadSummary(period)])
      .catch((err) => alive && setLoadError(msg(err, "We couldn't load your study log. Please refresh.")))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // the first load only; changing the filter / period is handled by their own handlers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh() {
    await Promise.all([loadRows(filterSubject, null, false), loadSummary(period)]);
  }

  async function handleCreate(input: NewStudySession) {
    setBusy(true);
    setFormError(null);
    try {
      await createStudySession(input);
      await refresh();
      setFormVersion((v) => v + 1); // clears the form
      toast.show("Logged. Nice work.");
    } catch (err) {
      setFormError(msg(err, "Couldn't save that. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  async function handleEdit(input: NewStudySession) {
    if (!editing) return;
    setBusy(true);
    setFormError(null);
    try {
      await updateStudySession(editing.id, input);
      setEditing(null);
      await refresh();
    } catch (err) {
      setFormError(msg(err, "Couldn't save that. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    setFormError(null);
    try {
      await deleteStudySession(deleting.id);
      setDeleting(null);
      await refresh();
    } catch (err) {
      setFormError(msg(err, "Couldn't delete that. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  async function changeFilter(subjectId: number | null) {
    setFilterSubject(subjectId);
    try {
      await loadRows(subjectId, null, false);
    } catch (err) {
      setLoadError(msg(err, "Couldn't load that filter."));
    }
  }

  async function changePeriod(next: StudyPeriod) {
    setPeriod(next);
    await loadSummary(next);
  }

  async function loadMore() {
    if (!nextCursor) return;
    try {
      await loadRows(filterSubject, nextCursor, true);
    } catch (err) {
      setLoadError(msg(err, "Couldn't load more."));
    }
  }

  if (loading || subjects.status === "loading") return <PageLoader label="Loading your study log…" />;

  const stats = summary ? sessionStats(summary, dayKey(new Date())) : null;

  return (
    <StudyShell current="/sessions" testId="sessions-page">

      {loadError && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
          {loadError}
        </p>
      )}

      {/* One column below 1024px (chart, form, history). From 1024px: chart and stats on top, history and the sticky
          form below. The DOM order is the phone order; the desktop cells are placed explicitly. */}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)] lg:gap-6">
      <section aria-label="Study time chart" className="study-fade-in rounded-2xl border border-brand/10 bg-surface p-4 lg:col-start-1 lg:row-start-1 lg:p-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-extrabold text-ink">{period === "week" ? "This week" : "This month"}</h2>
            <p className="text-[13px] font-semibold text-muted" data-testid="chart-total">
              {summary ? `${formatMinutes(summary.totalMinutes)} across ${summary.sessionCount} session${summary.sessionCount === 1 ? "" : "s"}` : "—"}
            </p>
          </div>
          <div className="flex rounded-xl bg-tint-strong p-1 dark:bg-[#FAF7F214]" role="group" aria-label="Chart period">
            {(["week", "month"] as const).map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={period === p}
                onClick={() => void changePeriod(p)}
                className={`min-h-10 rounded-lg px-3 text-[13px] font-bold ${period === p ? "bg-surface text-ink shadow-sm" : "text-muted"}`}
              >
                {p === "week" ? "Week" : "Month"}
              </button>
            ))}
          </div>
        </div>
        {summary && summary.totalMinutes > 0 ? (
          <WeekChart summary={summary} lookup={subjects.lookup} />
        ) : (
          <p className="rounded-xl bg-tint-strong px-4 py-8 text-center text-[14px] text-muted dark:bg-[#FAF7F214]">No study time logged {period === "week" ? "this week" : "this month"} yet.</p>
        )}
      </section>

      {stats && (
        <section aria-label="Study time numbers" className="study-fade-in hidden flex-col gap-3 lg:col-start-2 lg:row-start-1 lg:flex" data-testid="session-stats">
          {[
            stats.today !== null && { id: "today", label: "Today", minutes: stats.today },
            { id: "total", label: period === "week" ? "This week" : "This month", minutes: stats.total },
            { id: "average", label: "Daily average", minutes: stats.dailyAverage },
          ]
            .filter((t): t is { id: string; label: string; minutes: number } => t !== false)
            .map((t) => (
              <div key={t.id} className="flex items-baseline justify-between gap-3 rounded-2xl border border-border-subtle bg-surface-elevated px-5 py-4">
                <p className="text-[13px] font-semibold uppercase tracking-wide text-muted">{t.label}</p>
                <p className="text-[24px] font-extrabold leading-none text-ink">
                  <CountUp value={t.minutes} format={formatMinutes} testId={`session-stat-${t.id}`} />
                </p>
              </div>
            ))}
          {stats.best && (
            <div className="flex items-baseline justify-between gap-3 rounded-2xl border border-border-subtle bg-surface-elevated px-5 py-4" data-testid="session-stat-best">
              <p className="text-[13px] font-semibold uppercase tracking-wide text-muted">Best day</p>
              <p className="text-right text-[15px] font-bold text-ink">
                {stats.best.label} <span className="font-semibold text-muted">· {formatMinutes(stats.best.minutes)}</span>
              </p>
            </div>
          )}
        </section>
      )}

      <section aria-label="Log study time" className="study-fade-in rounded-2xl border border-brand/10 bg-surface p-4 sm:p-6 lg:col-start-2 lg:row-start-2 lg:sticky lg:top-6 lg:self-start">
        <h2 className="mb-3 text-[18px] font-extrabold text-ink">Log study time</h2>
        <QuickLogForm key={formVersion} subjects={subjects.subjects} busy={busy} error={editing ? null : formError} onSubmit={(input) => void handleCreate(input)} />
      </section>

      <section aria-label="History" className="flex flex-col gap-3 lg:col-start-1 lg:row-start-2 lg:min-w-0">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[18px] font-extrabold text-ink">History</h2>
          <select
            aria-label="Filter by subject"
            data-testid="filter-subject"
            className={`${FIELD} w-44`}
            value={filterSubject ?? ""}
            onChange={(e) => void changeFilter(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">All subjects</option>
            {subjects.subjects.map((s) => (
              <option key={s.subjectId} value={s.subjectId}>
                {s.subjectName}
              </option>
            ))}
          </select>
        </div>
        <StudyLogList rows={rows} lookup={subjects.lookup} onEdit={(row) => { setFormError(null); setEditing(row); }} onDelete={(row) => { setFormError(null); setDeleting(row); }} />
        {nextCursor && (
          <button type="button" data-testid="load-more" onClick={() => void loadMore()} className="min-h-12 rounded-lg border-[1.5px] border-secondary-button-border bg-surface px-4 text-[15px] font-semibold text-body-text hover:bg-tint-strong dark:text-ink">
            Load more
          </button>
        )}
      </section>
      </div>

      <Modal open={editing !== null} onClose={() => (busy ? undefined : setEditing(null))} ariaLabel="Edit study entry">
        {editing && (
          <div className="flex flex-col gap-4">
            <h2 className="text-[20px] font-extrabold text-ink">Edit entry</h2>
            <QuickLogForm
              subjects={subjects.subjects}
              busy={busy}
              error={formError}
              submitLabel="Save changes"
              alwaysSendWhen
              idPrefix="edit"
              initial={{ subjectId: editing.subjectId, chapterId: editing.chapterId, topic: editing.topic ?? "", minutes: editing.durationMinutes, loggedAt: editing.loggedAt, notes: editing.notes ?? "" }}
              onSubmit={(input) => void handleEdit(input)}
              onCancel={() => setEditing(null)}
            />
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={deleting !== null}
        onClose={() => (busy ? undefined : setDeleting(null))}
        onConfirm={() => void handleDelete()}
        title="Delete this entry?"
        description={deleting ? `${formatMinutes(deleting.durationMinutes)} of study time will be removed from your log.` : ""}
        confirmLabel="Delete"
        busy={busy}
        error={deleting ? formError : null}
      />
      <Toast state={toast} />
    </StudyShell>
  );
}

