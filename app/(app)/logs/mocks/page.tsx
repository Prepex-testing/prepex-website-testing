"use client";

import { useCallback, useRef, useState } from "react";
import { DatesPickerModal, type PickedDates } from "@/components/insights/DatesPickerModal";
import { MockAnalyticsPanel } from "@/components/mocks/MockAnalyticsPanel";
import { MockForm } from "@/components/mocks/MockForm";
import { MockList } from "@/components/mocks/MockList";
import { MockSharePanel } from "@/components/mocks/MockSharePanel";
import { SectionTabs, TabPanel, type TabDef } from "@/components/logs/SectionTabs";
import { ProfileSubpageHeader } from "@/components/profile/ProfileSubpageHeader";
import { SubjectsError } from "@/components/study/SubjectsError";
import { useSubjects } from "@/components/study/useSubjects";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Modal } from "@/components/ui/Modal";
import { PageLoader } from "@/components/ui/PageLoader";
import { Toast, useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api/http";
import {
  addWeakChaptersToPlanner,
  createMock,
  deleteMock,
  getMockAnalytics,
  listMocks,
  updateMock,
  type MockAnalytics,
  type MockPeriod,
  type MockTest,
  type NewMock,
} from "@/lib/api/mocks";
import { approxRank } from "@/lib/insights/mockMath";
import { readTargetRank, writeTargetRank } from "@/lib/insights/targetRank";

type Tab = "log" | "all" | "analytics" | "share";
const TABS: TabDef<Tab>[] = [
  { id: "log", label: "Log Mock" },
  { id: "all", label: "All Mocks" },
  { id: "analytics", label: "Analytics" },
  { id: "share", label: "Share" },
];

const msg = (err: unknown, fallback: string) => (err instanceof ApiError ? err.message : fallback);

export default function MocksPage() {
  const subjects = useSubjects();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("log");

  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  const [rows, setRows] = useState<MockTest[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [rowsLoaded, setRowsLoaded] = useState(false);
  const [rowsError, setRowsError] = useState<string | null>(null);

  const [period, setPeriod] = useState<MockPeriod>("month");
  const [targetRank, setTargetRankState] = useState<number | null>(() => readTargetRank());
  const [analytics, setAnalytics] = useState<MockAnalytics | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const analyticsSeq = useRef(0);

  const [editing, setEditing] = useState<MockTest | null>(null);
  const [deleting, setDeleting] = useState<MockTest | null>(null);
  const [planning, setPlanning] = useState<MockTest | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [sharing, setSharing] = useState<string | null>(null);

  const loadRows = useCallback(async (cursor: string | null, append: boolean) => {
    try {
      const res = await listMocks({ cursor, limit: 20 });
      setRows((prev) => (append ? [...prev, ...res.data.items] : res.data.items));
      setNextCursor(res.data.nextCursor);
      setRowsError(null);
    } catch (err) {
      setRowsError(msg(err, "We couldn't load your mocks. Please try again."));
    } finally {
      setRowsLoaded(true);
    }
  }, []);

  const loadAnalytics = useCallback(async (p: MockPeriod, target: number | null) => {
    const seq = ++analyticsSeq.current;
    setAnalyticsError(null);
    try {
      const res = await getMockAnalytics({ period: p, targetRank: target });
      if (seq === analyticsSeq.current) setAnalytics(res.data);
    } catch (err) {
      if (seq === analyticsSeq.current) setAnalyticsError(msg(err, "We couldn't load your analytics. Please try again."));
    }
  }, []);

  function changeTab(next: Tab) {
    setTab(next);
    if (next === "all" || next === "share") void loadRows(null, false);
    if (next === "analytics") void loadAnalytics(period, targetRank);
  }

  function setTargetRank(rank: number | null) {
    setTargetRankState(rank);
    writeTargetRank(rank);
    void loadAnalytics(period, rank);
  }

  async function handleCreate(input: NewMock) {
    setBusy(true);
    setFormError(null);
    try {
      const res = await createMock(input);
      const m = res.data;
      toast.show(m.projectedRank !== null ? `Logged: ${m.totalMarks}/${m.maxMarks}. Projected rank ${approxRank(m.projectedRank)}.` : `Logged: ${m.totalMarks}/${m.maxMarks}.`);
      setFormKey((k) => k + 1);
    } catch (err) {
      setFormError(msg(err, "Couldn't save that. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  async function handleEdit(input: NewMock) {
    if (!editing) return;
    setBusy(true);
    setFormError(null);
    try {
      await updateMock(editing.id, input);
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
      await deleteMock(deleting.id);
      setDeleting(null);
      toast.show("Deleted.");
      await loadRows(null, false);
    } catch (err) {
      setFormError(msg(err, "Couldn't delete that. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  async function handlePlan(p: PickedDates) {
    if (!planning) return;
    setBusy(true);
    setPlanError(null);
    try {
      const res = await addWeakChaptersToPlanner(planning.id, p);
      setPlanning(null);
      toast.show(`Planned ${res.data.assignments.length} chapter${res.data.assignments.length === 1 ? "" : "s"}. They appear when each day's plan is built.`);
    } catch (err) {
      setPlanError(msg(err, "Couldn't add those to your planner. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  if (subjects.status === "loading") return <PageLoader label="Loading mocks…" />;

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 lg:mx-auto lg:max-w-3xl lg:p-8" data-testid="mocks-page">
      <ProfileSubpageHeader title="Mock tests" backHref="/logs" />
      {subjects.status === "error" && <SubjectsError />}
      <SectionTabs name="mocks" tabs={TABS} current={tab} onChange={changeTab} />

      <TabPanel name="mocks" tab={tab}>
        {tab === "log" && (
          <section aria-label="Log a mock" className="rounded-2xl border border-brand/10 bg-surface p-4 sm:p-6">
            <h2 className="mb-3 text-[18px] font-extrabold text-ink">Log a mock test</h2>
            <MockForm key={formKey} subjects={subjects.subjects} busy={busy} error={editing ? null : formError} onSubmit={(input) => void handleCreate(input)} />
          </section>
        )}

        {tab === "all" && (
          <>
            <h2 className="text-[18px] font-extrabold text-ink">All mocks</h2>
            {rowsError && (
              <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
                {rowsError}
              </p>
            )}
            {!rowsLoaded ? (
              <div className="h-32 animate-pulse rounded-xl bg-tint-strong" aria-hidden />
            ) : (
              <MockList
                rows={rows}
                hasMore={nextCursor !== null}
                onLoadMore={() => void loadRows(nextCursor, true)}
                onEdit={(m) => {
                  setFormError(null);
                  setEditing(m);
                }}
                onDelete={(m) => {
                  setFormError(null);
                  setDeleting(m);
                }}
                onPlanWeak={(m) => {
                  setPlanError(null);
                  setPlanning(m);
                }}
                onShare={(m) => {
                  setSharing(m.id);
                  setTab("share");
                  void loadRows(null, false);
                }}
              />
            )}
          </>
        )}

        {tab === "analytics" && (
          <MockAnalyticsPanel
            analytics={analytics}
            period={period}
            error={analyticsError}
            targetRank={targetRank}
            onTargetRank={setTargetRank}
            onPeriod={(p) => {
              setPeriod(p);
              void loadAnalytics(p, targetRank);
            }}
          />
        )}

        {tab === "share" && <MockSharePanel key={sharing ?? "first"} mocks={rows} loaded={rowsLoaded} initialMockId={sharing} onNotice={(m) => toast.show(m)} />}
      </TabPanel>

      <Modal open={editing !== null} onClose={() => (busy ? undefined : setEditing(null))} ariaLabel="Edit mock test" size="lg">
        {editing && (
          <div className="flex flex-col gap-4">
            <h2 className="text-[20px] font-extrabold text-ink">Edit mock test</h2>
            <MockForm
              subjects={subjects.subjects}
              busy={busy}
              error={formError}
              submitLabel="Save changes"
              idPrefix="edit-mock"
              initial={{
                testType: editing.testType,
                examPattern: editing.examPattern,
                testName: editing.testName ?? "",
                dateTaken: editing.dateTaken,
                totalMarks: editing.totalMarks,
                maxMarks: editing.maxMarks,
                subjectMarks: editing.subjectMarks,
                timeMinutes: editing.timeMinutes,
                questionsCorrect: editing.questionsCorrect,
                questionsWrong: editing.questionsWrong,
                questionsSkipped: editing.questionsSkipped,
                weakChapterIds: editing.weakChapters.map((w) => w.chapterId),
                percentile: editing.percentile,
                notes: editing.notes ?? "",
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
        title="Delete this mock?"
        description="It will be removed from your log, trends and projected rank."
        confirmLabel="Delete"
        busy={busy}
        error={deleting ? formError : null}
      />

      <DatesPickerModal
        open={planning !== null}
        onClose={() => setPlanning(null)}
        title="Plan your weak chapters"
        subject={planning ? planning.weakChapters.map((w) => w.name ?? "Chapter").join(", ") : undefined}
        hint="The chapters are spread across the days you pick, in the order you listed them."
        defaultMinutes={45}
        busy={busy}
        error={planError}
        onConfirm={(p) => void handlePlan(p)}
      />

      <Toast state={toast} />
    </div>
  );
}
