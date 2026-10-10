"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { ProfileSubpageHeader } from "@/components/profile/ProfileSubpageHeader";
import { QuickLogForm } from "@/components/sessions/QuickLogForm";
import { StudyLogList } from "@/components/sessions/StudyLogList";
import { StudyTabs } from "@/components/study/StudyTabs";
import { FIELD } from "@/components/study/SubjectChapterFields";
import { useSubjects } from "@/components/study/useSubjects";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Modal } from "@/components/ui/Modal";
import { PageLoader } from "@/components/ui/PageLoader";
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
import { formatMinutes } from "@/lib/study/format";

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
  const [notice, setNotice] = useState<string | null>(null);
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
    setNotice(null);
    try {
      await createStudySession(input);
      await refresh();
      setFormVersion((v) => v + 1); // clears the form
      setNotice("Logged. Nice work.");
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

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 lg:mx-auto lg:max-w-3xl lg:p-8" data-testid="sessions-page">
      <ProfileSubpageHeader title="Study log" backHref="/home" />
      <StudyTabs current="/sessions" />

      {loadError && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
          {loadError}
        </p>
      )}

      <section aria-label="Study time chart" className="rounded-2xl border border-brand/10 bg-surface p-4">
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

      <section aria-label="Log study time" className="rounded-2xl border border-brand/10 bg-surface p-4 sm:p-6">
        <h2 className="mb-3 text-[18px] font-extrabold text-ink">Log study time</h2>
        {notice && (
          <p role="status" className="mb-3 rounded-lg bg-[var(--success-bg)] px-3 py-2 text-[13px] font-semibold text-[var(--success)]">
            {notice}
          </p>
        )}
        <QuickLogForm key={formVersion} subjects={subjects.subjects} busy={busy} error={editing ? null : formError} onSubmit={(input) => void handleCreate(input)} />
      </section>

      <section aria-label="History" className="flex flex-col gap-3">
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
    </div>
  );
}

