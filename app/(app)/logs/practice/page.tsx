"use client";

import { useCallback, useRef, useState } from "react";
import { PlannerPickerModal, type PickedPlacement } from "@/components/logs/PlannerPickerModal";
import { PracticeAnalyticsPanel } from "@/components/logs/PracticeAnalyticsPanel";
import { PracticeForm } from "@/components/logs/PracticeForm";
import { PracticeSessions } from "@/components/logs/PracticeLists";
import { SectionTabs, TabPanel, type TabDef } from "@/components/logs/SectionTabs";
import { SharePanel } from "@/components/logs/SharePanel";
import { ProfileSubpageHeader } from "@/components/profile/ProfileSubpageHeader";
import { SubjectsError } from "@/components/study/SubjectsError";
import { useSubjects } from "@/components/study/useSubjects";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Modal } from "@/components/ui/Modal";
import { PageLoader } from "@/components/ui/PageLoader";
import { Toast, useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api/http";
import type { Period } from "@/lib/api/logsCommon";
import {
  addPracticeToPlanner,
  createPracticeLog,
  deletePracticeLog,
  getPracticeAnalytics,
  listPracticeLogs,
  updatePracticeLog,
  type NewPractice,
  type PracticeAnalytics,
  type PracticeLog,
} from "@/lib/api/practiceLogs";
import { percentLabel } from "@/lib/logs/labels";

type Tab = "log" | "sessions" | "analytics" | "share";
const TABS: TabDef<Tab>[] = [
  { id: "log", label: "Log" },
  { id: "sessions", label: "Sessions" },
  { id: "analytics", label: "Analytics" },
  { id: "share", label: "Share" },
];

const msg = (err: unknown, fallback: string) => (err instanceof ApiError ? err.message : fallback);

export default function PracticePage() {
  const subjects = useSubjects();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("log");

  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  const [rows, setRows] = useState<PracticeLog[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [rowsLoaded, setRowsLoaded] = useState(false);
  const [rowsError, setRowsError] = useState<string | null>(null);

  const [period, setPeriod] = useState<Period>("week");
  const [analyticsSubject, setAnalyticsSubject] = useState<number | null>(null);
  const [analytics, setAnalytics] = useState<PracticeAnalytics | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const analyticsSeq = useRef(0);

  const [editing, setEditing] = useState<PracticeLog | null>(null);
  const [deleting, setDeleting] = useState<PracticeLog | null>(null);
  const [planning, setPlanning] = useState<PracticeLog | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);

  const loadRows = useCallback(async (cursor: string | null, append: boolean) => {
    try {
      const res = await listPracticeLogs({ cursor, limit: 20 });
      setRows((prev) => (append ? [...prev, ...res.data.items] : res.data.items));
      setNextCursor(res.data.nextCursor);
      setRowsError(null);
    } catch (err) {
      setRowsError(msg(err, "We couldn't load your sessions. Please try again."));
    } finally {
      setRowsLoaded(true);
    }
  }, []);

  const loadAnalytics = useCallback(async (p: Period, subjectId: number | null) => {
    const seq = ++analyticsSeq.current;
    setAnalyticsError(null);
    try {
      const res = await getPracticeAnalytics({ period: p, subjectId });
      if (seq === analyticsSeq.current) setAnalytics(res.data);
    } catch (err) {
      if (seq === analyticsSeq.current) setAnalyticsError(msg(err, "We couldn't load your analytics. Please try again."));
    }
  }, []);

  function changeTab(next: Tab) {
    setTab(next);
    if (next === "sessions") void loadRows(null, false);
    if (next === "analytics") void loadAnalytics(period, analyticsSubject);
  }

  async function handleCreate(input: NewPractice) {
    setBusy(true);
    setFormError(null);
    try {
      const res = await createPracticeLog(input);
      const p = res.data;
      toast.show(`Logged: ${p.questionsCorrect}/${p.questionsAttempted} (${percentLabel(p.accuracy)}).`);
      setFormKey((k) => k + 1); // clears the form
    } catch (err) {
      setFormError(msg(err, "Couldn't save that. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  async function handleEdit(input: NewPractice) {
    if (!editing) return;
    setBusy(true);
    setFormError(null);
    try {
      await updatePracticeLog(editing.id, input);
      setEditing(null);
      toast.show("Saved.");
      await loadRows(null, false);
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
      await deletePracticeLog(deleting.id);
      setDeleting(null);
      toast.show("Deleted.");
      await loadRows(null, false);
    } catch (err) {
      setFormError(msg(err, "Couldn't delete that. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  async function handlePlan(p: PickedPlacement) {
    if (!planning) return;
    setBusy(true);
    setPlanError(null);
    try {
      const res = await addPracticeToPlanner(planning.id, { date: p.date, timeSlot: p.timeSlot, ...(p.estimatedMinutes ? { estimatedMinutes: p.estimatedMinutes } : {}) });
      setPlanning(null);
      toast.show(res.data.mode === "added_to_plan" ? "Added to today's plan." : "Added to your planner. It will appear when that day's plan is built.");
    } catch (err) {
      setPlanError(msg(err, "Couldn't add that to your planner. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  if (subjects.status === "loading") return <PageLoader label="Loading practice…" />;

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 lg:mx-auto lg:max-w-3xl lg:p-8" data-testid="practice-page">
      <ProfileSubpageHeader title="Practice log" backHref="/logs" />
      {subjects.status === "error" && <SubjectsError />}
      <SectionTabs name="practice" tabs={TABS} current={tab} onChange={changeTab} />

      <TabPanel name="practice" tab={tab}>
        {tab === "log" && (
          <section aria-label="Log practice" className="rounded-2xl border border-brand/10 bg-surface p-4 sm:p-6">
            <h2 className="mb-3 text-[18px] font-extrabold text-ink">Log a practice session</h2>
            <PracticeForm key={formKey} subjects={subjects.subjects} busy={busy} error={editing ? null : formError} onSubmit={(input) => void handleCreate(input)} />
          </section>
        )}

        {tab === "sessions" && (
          <>
            <h2 className="text-[18px] font-extrabold text-ink">Sessions</h2>
            {rowsError && (
              <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
                {rowsError}
              </p>
            )}
            {!rowsLoaded ? (
              <div className="h-32 animate-pulse rounded-xl bg-tint-strong" aria-hidden />
            ) : (
              <PracticeSessions
                rows={rows}
                lookup={subjects.lookup}
                hasMore={nextCursor !== null}
                onLoadMore={() => void loadRows(nextCursor, true)}
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
                  setPlanning(r);
                }}
              />
            )}
          </>
        )}

        {tab === "analytics" && (
          <PracticeAnalyticsPanel
            analytics={analytics}
            period={period}
            subjects={subjects.subjects}
            subjectId={analyticsSubject}
            error={analyticsError}
            onPeriod={(p) => {
              setPeriod(p);
              void loadAnalytics(p, analyticsSubject);
            }}
            onSubject={(id) => {
              setAnalyticsSubject(id);
              void loadAnalytics(period, id);
            }}
          />
        )}

        {tab === "share" && <SharePanel subjects={subjects.subjects} onNotice={(m) => toast.show(m)} />}
      </TabPanel>

      <Modal open={editing !== null} onClose={() => (busy ? undefined : setEditing(null))} ariaLabel="Edit practice">
        {editing && (
          <div className="flex flex-col gap-4">
            <h2 className="text-[20px] font-extrabold text-ink">Edit practice</h2>
            <PracticeForm
              subjects={subjects.subjects}
              busy={busy}
              error={formError}
              submitLabel="Save changes"
              alwaysSendWhen
              idPrefix="edit-prac"
              initial={{
                subjectId: editing.subjectId,
                chapterId: editing.chapterId,
                topic: editing.topic ?? "",
                source: editing.source,
                sourceDetail: editing.sourceDetail ?? "",
                attempted: editing.questionsAttempted,
                correct: editing.questionsCorrect,
                wrong: editing.questionsWrong,
                skipped: editing.questionsSkipped,
                minutes: editing.durationMinutes,
                difficulty: editing.difficulty,
                notes: editing.notes ?? "",
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
        title="Delete this session?"
        description={deleting ? `${deleting.questionsAttempted} questions will be removed from your log and analytics.` : ""}
        confirmLabel="Delete"
        busy={busy}
        error={deleting ? formError : null}
      />

      <PlannerPickerModal
        open={planning !== null}
        onClose={() => setPlanning(null)}
        title="Plan a follow-up"
        subject={planning ? `Practice ${subjects.lookup.chapterName(planning.chapterId) ?? subjects.lookup.subjectName(planning.subjectId)}` : undefined}
        defaultMinutes={planning ? Math.max(20, planning.durationMinutes ?? 30) : 30}
        busy={busy}
        error={planError}
        onConfirm={(p) => void handlePlan(p)}
      />

      <Toast state={toast} />
    </div>
  );
}
