"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PlannerPickerModal, type PickedPlacement } from "@/components/logs/PlannerPickerModal";
import { RevisionAnalyticsPanel } from "@/components/logs/RevisionAnalyticsPanel";
import { RevisionForm, type RevisionFormInitial } from "@/components/logs/RevisionForm";
import { RevisionHistory, RevisionToday } from "@/components/logs/RevisionLists";
import { SectionTabs, TabPanel, type TabDef } from "@/components/logs/SectionTabs";
import { ProfileSubpageHeader } from "@/components/profile/ProfileSubpageHeader";
import { FIELD } from "@/components/study/SubjectChapterFields";
import { SubjectsError } from "@/components/study/SubjectsError";
import { useSubjects } from "@/components/study/useSubjects";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Modal } from "@/components/ui/Modal";
import { PageLoader } from "@/components/ui/PageLoader";
import { Toast, useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api/http";
import type { Period } from "@/lib/api/logsCommon";
import { getTodayPlan, type PlannerTask } from "@/lib/api/planner";
import {
  addRevisionToPlanner,
  createRevision,
  deleteRevision,
  getRevisionAnalytics,
  listRevisions,
  planChapterRevision,
  updateRevision,
  type NewRevision,
  type RevisionAnalytics,
  type RevisionLog,
  type StaleChapter,
} from "@/lib/api/revisionLogs";
import { formatMinutes } from "@/lib/study/format";

type Tab = "today" | "log" | "analytics" | "history";
const TABS: TabDef<Tab>[] = [
  { id: "today", label: "Today" },
  { id: "log", label: "Log" },
  { id: "analytics", label: "Analytics" },
  { id: "history", label: "History" },
];

type PlanTarget = { kind: "log"; row: RevisionLog } | { kind: "chapter"; chapter: StaleChapter };

const msg = (err: unknown, fallback: string) => (err instanceof ApiError ? err.message : fallback);

export default function RevisionPage() {
  const subjects = useSubjects();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("today");

  // today's planned revisions
  const [todayTasks, setTodayTasks] = useState<PlannerTask[]>([]);
  const [todayLoading, setTodayLoading] = useState(true);
  const [todayError, setTodayError] = useState<string | null>(null);

  // log form
  const [formKey, setFormKey] = useState(0);
  const [prefill, setPrefill] = useState<RevisionFormInitial | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // analytics
  const [period, setPeriod] = useState<Period>("week");
  const [analytics, setAnalytics] = useState<RevisionAnalytics | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  // history
  const [rows, setRows] = useState<RevisionLog[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [filterSubject, setFilterSubject] = useState<number | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // edit / delete / plan
  const [editing, setEditing] = useState<RevisionLog | null>(null);
  const [deleting, setDeleting] = useState<RevisionLog | null>(null);
  const [planTarget, setPlanTarget] = useState<PlanTarget | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const analyticsSeq = useRef(0);

  useEffect(() => {
    let alive = true;
    getTodayPlan()
      .then((res) => alive && setTodayTasks((res.data.plan?.tasks ?? []).filter((t) => t.taskType === "REVISION" && t.status !== "SKIPPED")))
      .catch((err) => alive && setTodayError(msg(err, "We couldn't load today's plan.")))
      .finally(() => alive && setTodayLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const loadAnalytics = useCallback(async (p: Period) => {
    const seq = ++analyticsSeq.current;
    setAnalyticsError(null);
    try {
      const res = await getRevisionAnalytics(p);
      if (seq === analyticsSeq.current) setAnalytics(res.data);
    } catch (err) {
      if (seq === analyticsSeq.current) setAnalyticsError(msg(err, "We couldn't load your analytics. Please try again."));
    }
  }, []);

  const loadHistory = useCallback(async (subjectId: number | null, cursor: string | null, append: boolean) => {
    try {
      const res = await listRevisions({ subjectId, cursor, limit: 20 });
      setRows((prev) => (append ? [...prev, ...res.data.items] : res.data.items));
      setNextCursor(res.data.nextCursor);
      setHistoryError(null);
    } catch (err) {
      setHistoryError(msg(err, "We couldn't load your history. Please try again."));
    } finally {
      setHistoryLoaded(true);
    }
  }, []);

  function changeTab(next: Tab) {
    setTab(next);
    if (next === "analytics") void loadAnalytics(period);
    if (next === "history") void loadHistory(filterSubject, null, false);
  }

  function startFromTask(task: PlannerTask) {
    setFormError(null);
    setPrefill({
      subjectId: task.subject?.id ?? task.chapter?.subject.id ?? null,
      chapterId: task.chapter?.id ?? null,
      minutes: task.estimatedMinutes,
    });
    setFormKey((k) => k + 1);
    setTab("log");
  }

  async function handleCreate(input: NewRevision) {
    setBusy(true);
    setFormError(null);
    try {
      const res = await createRevision(input);
      toast.show(`Logged: ${formatMinutes(res.data.durationMinutes)} of revision. Nice work.`);
      setPrefill(undefined);
      setFormKey((k) => k + 1); // clears the form
    } catch (err) {
      setFormError(msg(err, "Couldn't save that. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  async function handleEdit(input: NewRevision) {
    if (!editing) return;
    setBusy(true);
    setFormError(null);
    try {
      await updateRevision(editing.id, input);
      setEditing(null);
      toast.show("Saved.");
      await loadHistory(filterSubject, null, false);
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
      await deleteRevision(deleting.id);
      setDeleting(null);
      toast.show("Deleted.");
      await loadHistory(filterSubject, null, false);
    } catch (err) {
      setFormError(msg(err, "Couldn't delete that. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  async function handlePlan(p: PickedPlacement) {
    if (!planTarget) return;
    setBusy(true);
    setPlanError(null);
    try {
      const input = { date: p.date, timeSlot: p.timeSlot, ...(p.estimatedMinutes ? { estimatedMinutes: p.estimatedMinutes } : {}) };
      const res = planTarget.kind === "log" ? await addRevisionToPlanner(planTarget.row.id, input) : await planChapterRevision({ ...input, chapterId: planTarget.chapter.chapterId });
      setPlanTarget(null);
      toast.show(res.data.mode === "added_to_plan" ? "Added to today's plan." : "Added to your planner. It will appear when that day's plan is built.");
    } catch (err) {
      setPlanError(msg(err, "Couldn't add that to your planner. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  if (subjects.status === "loading") return <PageLoader label="Loading revision…" />;

  const planSubject =
    planTarget?.kind === "log"
      ? `Revise ${subjects.lookup.chapterName(planTarget.row.chapterId) ?? subjects.lookup.subjectName(planTarget.row.subjectId)}`
      : planTarget
        ? `Revise ${planTarget.chapter.chapterName ?? "this chapter"}`
        : undefined;

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 lg:mx-auto lg:max-w-3xl lg:p-8" data-testid="revision-page">
      <ProfileSubpageHeader title="Revision" backHref="/logs" />
      {subjects.status === "error" && <SubjectsError />}
      <SectionTabs name="revision" tabs={TABS} current={tab} onChange={changeTab} />

      <TabPanel name="revision" tab={tab}>
        {tab === "today" && <RevisionToday tasks={todayTasks} loading={todayLoading} error={todayError} onLog={startFromTask} />}

        {tab === "log" && (
          <section aria-label="Log a revision" className="rounded-2xl border border-brand/10 bg-surface p-4 sm:p-6">
            <h2 className="mb-3 text-[18px] font-extrabold text-ink">Log a revision</h2>
            <RevisionForm key={formKey} subjects={subjects.subjects} busy={busy} error={editing ? null : formError} initial={prefill} onSubmit={(input) => void handleCreate(input)} />
          </section>
        )}

        {tab === "analytics" && (
          <RevisionAnalyticsPanel
            analytics={analytics}
            period={period}
            error={analyticsError}
            onPeriod={(p) => {
              setPeriod(p);
              void loadAnalytics(p);
            }}
            onPlanChapter={(chapter) => {
              setPlanError(null);
              setPlanTarget({ kind: "chapter", chapter });
            }}
          />
        )}

        {tab === "history" && (
          <>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[18px] font-extrabold text-ink">History</h2>
              <select
                aria-label="Filter by subject"
                data-testid="revision-filter-subject"
                className={`${FIELD} w-44`}
                value={filterSubject ?? ""}
                onChange={(e) => {
                  const id = e.target.value ? Number(e.target.value) : null;
                  setFilterSubject(id);
                  void loadHistory(id, null, false);
                }}
              >
                <option value="">All subjects</option>
                {subjects.subjects.map((s) => (
                  <option key={s.subjectId} value={s.subjectId}>
                    {s.subjectName}
                  </option>
                ))}
              </select>
            </div>
            {historyError && (
              <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
                {historyError}
              </p>
            )}
            {!historyLoaded ? (
              <div className="h-32 animate-pulse rounded-xl bg-tint-strong" aria-hidden />
            ) : (
              <RevisionHistory
                rows={rows}
                lookup={subjects.lookup}
                hasMore={nextCursor !== null}
                onLoadMore={() => void loadHistory(filterSubject, nextCursor, true)}
                onEdit={(r) => {
                  setFormError(null);
                  setEditing(r);
                }}
                onDelete={(r) => {
                  setFormError(null);
                  setDeleting(r);
                }}
                onPlan={(r) => {
                  setPlanError(null);
                  setPlanTarget({ kind: "log", row: r });
                }}
              />
            )}
          </>
        )}
      </TabPanel>

      <Modal open={editing !== null} onClose={() => (busy ? undefined : setEditing(null))} ariaLabel="Edit revision">
        {editing && (
          <div className="flex flex-col gap-4">
            <h2 className="text-[20px] font-extrabold text-ink">Edit revision</h2>
            <RevisionForm
              subjects={subjects.subjects}
              busy={busy}
              error={formError}
              submitLabel="Save changes"
              alwaysSendWhen
              idPrefix="edit-rev"
              initial={{
                subjectId: editing.subjectId,
                chapterId: editing.chapterId,
                topic: editing.topic ?? "",
                revisionType: editing.revisionType,
                minutes: editing.durationMinutes,
                questionsSolved: editing.questionsSolved,
                questionsCorrect: editing.questionsCorrect,
                errors: editing.errors ?? "",
                loggedAt: editing.loggedAt,
              }}
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
        title="Delete this revision?"
        description={deleting ? `${formatMinutes(deleting.durationMinutes)} of revision will be removed from your log and analytics.` : ""}
        confirmLabel="Delete"
        busy={busy}
        error={deleting ? formError : null}
      />

      <PlannerPickerModal
        open={planTarget !== null}
        onClose={() => setPlanTarget(null)}
        title="Add to planner"
        subject={planSubject}
        defaultMinutes={planTarget?.kind === "log" ? planTarget.row.durationMinutes : 30}
        busy={busy}
        error={planError}
        onConfirm={(p) => void handlePlan(p)}
      />

      <Toast state={toast} />
    </div>
  );
}
