"use client";

import { useCallback, useEffect, useState } from "react";
import { BacklogAnalyticsPanel } from "@/components/logs/BacklogAnalyticsPanel";
import { BacklogForm } from "@/components/logs/BacklogForm";
import { BacklogHistory, BacklogOpenList, daysToClear, itemTitle } from "@/components/logs/BacklogLists";
import { PlannerPickerModal, type PickedPlacement } from "@/components/logs/PlannerPickerModal";
import { SectionTabs, TabPanel, type TabDef } from "@/components/logs/SectionTabs";
import { ProfileSubpageHeader } from "@/components/profile/ProfileSubpageHeader";
import { SubjectsError } from "@/components/study/SubjectsError";
import { useSubjects } from "@/components/study/useSubjects";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Modal } from "@/components/ui/Modal";
import { PageLoader } from "@/components/ui/PageLoader";
import { Toast, useToast } from "@/components/ui/Toast";
import {
  clearBacklogItem,
  createBacklogItem,
  getBacklogAnalytics,
  getBacklogSuggestions,
  listBacklogItems,
  scheduleBacklogItem,
  sweepBacklog,
  updateBacklogItem,
  type BacklogAnalytics,
  type BacklogItem,
  type NewBacklogItem,
} from "@/lib/api/backlogItems";
import { ApiError } from "@/lib/api/http";

type Tab = "open" | "add" | "analytics" | "history";
const TABS: TabDef<Tab>[] = [
  { id: "open", label: "Open" },
  { id: "add", label: "Add" },
  { id: "analytics", label: "Analytics" },
  { id: "history", label: "History" },
];

const msg = (err: unknown, fallback: string) => (err instanceof ApiError ? err.message : fallback);

export default function BacklogPage() {
  const subjects = useSubjects();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("open");

  const [open, setOpen] = useState<BacklogItem[]>([]);
  const [openMore, setOpenMore] = useState<string | null>(null);
  const [scheduled, setScheduled] = useState<BacklogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  const [analytics, setAnalytics] = useState<BacklogAnalytics | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  const [historyStatus, setHistoryStatus] = useState<"cleared" | "dropped">("cleared");
  const [history, setHistory] = useState<BacklogItem[]>([]);
  const [historyMore, setHistoryMore] = useState<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const [editing, setEditing] = useState<BacklogItem | null>(null);
  const [dropping, setDropping] = useState<BacklogItem | null>(null);
  const [scheduling, setScheduling] = useState<BacklogItem | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);

  const loadOpen = useCallback(async () => {
    try {
      const [o, s] = await Promise.all([listBacklogItems({ status: "open", limit: 50 }), listBacklogItems({ status: "scheduled", limit: 50 })]);
      setOpen(o.data.items);
      setOpenMore(o.data.nextCursor);
      setScheduled(s.data.items);
      setLoadError(null);
    } catch (err) {
      setLoadError(msg(err, "We couldn't load your backlog. Please refresh."));
    }
  }, []);

  useEffect(() => {
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load (state is set after the await)
    loadOpen().finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [loadOpen]);

  const loadAnalytics = useCallback(async () => {
    setAnalyticsError(null);
    try {
      setAnalytics((await getBacklogAnalytics()).data);
    } catch (err) {
      setAnalyticsError(msg(err, "We couldn't load your analytics. Please try again."));
    }
  }, []);

  const loadHistory = useCallback(async (status: "cleared" | "dropped", cursor: string | null, append: boolean) => {
    try {
      const res = await listBacklogItems({ status, cursor, limit: 20 });
      setHistory((prev) => (append ? [...prev, ...res.data.items] : res.data.items));
      setHistoryMore(res.data.nextCursor);
    } catch (err) {
      toast.show(msg(err, "We couldn't load your history."));
    } finally {
      setHistoryLoaded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toast.show is stable
  }, []);

  function changeTab(next: Tab) {
    setTab(next);
    if (next === "open") void loadOpen();
    if (next === "analytics") void loadAnalytics();
    if (next === "history") void loadHistory(historyStatus, null, false);
  }

  async function run(item: BacklogItem | null, action: () => Promise<string>) {
    setBusyId(item?.id ?? null);
    try {
      toast.show(await action());
      await loadOpen();
    } catch (err) {
      toast.show(msg(err, "Something went wrong. Please try again."));
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreate(input: NewBacklogItem) {
    setBusy(true);
    setFormError(null);
    try {
      await createBacklogItem(input);
      toast.show("Added to your backlog.");
      setFormKey((k) => k + 1);
      await loadOpen();
      setTab("open");
    } catch (err) {
      setFormError(msg(err, "Couldn't save that. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  async function handleEdit(input: NewBacklogItem) {
    if (!editing) return;
    setBusy(true);
    setFormError(null);
    try {
      await updateBacklogItem(editing.id, input);
      setEditing(null);
      toast.show("Saved.");
      await loadOpen();
    } catch (err) {
      setFormError(msg(err, "Couldn't save that. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  async function handleDrop() {
    if (!dropping) return;
    setBusy(true);
    setFormError(null);
    try {
      await updateBacklogItem(dropping.id, { status: "dropped" });
      setDropping(null);
      toast.show("Dropped.");
      await loadOpen();
    } catch (err) {
      setFormError(msg(err, "Couldn't drop that. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  async function handleSchedule(p: PickedPlacement) {
    if (!scheduling) return;
    setBusy(true);
    setPlanError(null);
    try {
      const res = await scheduleBacklogItem(scheduling.id, { date: p.date, timeSlot: p.timeSlot, ...(p.estimatedMinutes ? { estimatedMinutes: p.estimatedMinutes } : {}) });
      setScheduling(null);
      toast.show(res.data.planner.mode === "added_to_plan" ? "Added to today's plan." : "Scheduled. It will appear when that day's plan is built.");
      await loadOpen();
    } catch (err) {
      setPlanError(msg(err, "Couldn't schedule that. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  async function handleSweep() {
    setBusy(true);
    try {
      const res = await sweepBacklog();
      toast.show(res.data.created > 0 ? `Added ${res.data.created} missed item${res.data.created === 1 ? "" : "s"} from your goals.` : "Nothing new to add. You're caught up.");
      await loadOpen();
    } catch (err) {
      toast.show(msg(err, "Couldn't check for missed work. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  if (loading || subjects.status === "loading") return <PageLoader label="Loading your backlog…" />;

  const cleared = history.filter((h) => h.status === "cleared");
  const days = cleared.map(daysToClear).filter((d): d is number => d !== null);
  const avg = days.length > 0 ? Math.round((days.reduce((a, b) => a + b, 0) / days.length) * 10) / 10 : null;

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 lg:mx-auto lg:max-w-3xl lg:p-8" data-testid="backlog-page">
      <ProfileSubpageHeader title="Backlog" backHref="/logs" />
      {subjects.status === "error" && <SubjectsError />}
      <SectionTabs name="backlog" tabs={TABS} current={tab} onChange={changeTab} />

      <TabPanel name="backlog" tab={tab}>
        {loadError && (
          <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
            {loadError}
          </p>
        )}

        {tab === "open" && (
          <>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[18px] font-extrabold text-ink">
                Open <span className="text-muted" data-testid="open-count">({open.length})</span>
              </h2>
              <button type="button" data-testid="backlog-sweep" disabled={busy} onClick={() => void handleSweep()} className="min-h-11 rounded-lg border-[1.5px] border-secondary-button-border bg-surface px-3 text-[13px] font-bold text-body-text hover:bg-tint-strong disabled:opacity-60 dark:text-ink">
                Find missed work
              </button>
            </div>
            <BacklogOpenList
              items={open}
              lookup={subjects.lookup}
              hasMore={openMore !== null}
              busyId={busyId}
              onLoadMore={async () => {
                if (!openMore) return;
                const res = await listBacklogItems({ status: "open", cursor: openMore, limit: 50 });
                setOpen((prev) => [...prev, ...res.data.items]);
                setOpenMore(res.data.nextCursor);
              }}
              onClear={(item) => void run(item, async () => (await clearBacklogItem(item.id), "Cleared. Nice work."))}
              onSchedule={(item) => {
                setPlanError(null);
                setScheduling(item);
              }}
              onUnschedule={(item) => void run(item, async () => (await updateBacklogItem(item.id, { status: "open" }), "Back on your open list."))}
              onEdit={(item) => {
                setFormError(null);
                setEditing(item);
              }}
              onDrop={(item) => {
                setFormError(null);
                setDropping(item);
              }}
            />
            {scheduled.length > 0 && (
              <section aria-label="Scheduled" className="flex flex-col gap-3">
                <h2 className="text-[18px] font-extrabold text-ink">
                  Scheduled <span className="text-muted">({scheduled.length})</span>
                </h2>
                <BacklogOpenList
                  items={scheduled}
                  lookup={subjects.lookup}
                  hasMore={false}
                  busyId={busyId}
                  onLoadMore={() => undefined}
                  onClear={(item) => void run(item, async () => (await clearBacklogItem(item.id), "Cleared. Nice work."))}
                  onSchedule={() => undefined}
                  onUnschedule={(item) => void run(item, async () => (await updateBacklogItem(item.id, { status: "open" }), "Back on your open list."))}
                  onEdit={(item) => {
                    setFormError(null);
                    setEditing(item);
                  }}
                  onDrop={(item) => {
                    setFormError(null);
                    setDropping(item);
                  }}
                />
              </section>
            )}
          </>
        )}

        {tab === "add" && (
          <section aria-label="Add to backlog" className="rounded-2xl border border-brand/10 bg-surface p-4 sm:p-6">
            <h2 className="mb-3 text-[18px] font-extrabold text-ink">Add to your backlog</h2>
            <BacklogForm key={formKey} subjects={subjects.subjects} busy={busy} error={editing ? null : formError} onSubmit={(input) => void handleCreate(input)} />
          </section>
        )}

        {tab === "analytics" && <BacklogAnalyticsPanel analytics={analytics} error={analyticsError} />}

        {tab === "history" && (
          <>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[18px] font-extrabold text-ink">History</h2>
              <div className="flex rounded-xl bg-tint-strong p-1 dark:bg-[#FAF7F214]" role="group" aria-label="Show">
                {(["cleared", "dropped"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={historyStatus === s}
                    data-testid={`history-${s}`}
                    onClick={() => {
                      setHistoryStatus(s);
                      setHistoryLoaded(false);
                      void loadHistory(s, null, false);
                    }}
                    className={`min-h-10 rounded-lg px-3 text-[13px] font-bold ${historyStatus === s ? "bg-surface text-ink shadow-sm" : "text-muted"}`}
                  >
                    {s === "cleared" ? "Cleared" : "Dropped"}
                  </button>
                ))}
              </div>
            </div>
            {historyStatus === "cleared" && avg !== null && (
              <p className="text-[14px] font-semibold text-muted" data-testid="history-avg">
                {cleared.length} cleared · on average {avg} {avg === 1 ? "day" : "days"} to clear
              </p>
            )}
            {!historyLoaded ? (
              <div className="h-32 animate-pulse rounded-xl bg-tint-strong" aria-hidden />
            ) : (
              <BacklogHistory
                items={history}
                lookup={subjects.lookup}
                hasMore={historyMore !== null}
                busyId={busyId}
                onLoadMore={() => void loadHistory(historyStatus, historyMore, true)}
                onReopen={(item) =>
                  void run(item, async () => {
                    await updateBacklogItem(item.id, { status: "open" });
                    await loadHistory(historyStatus, null, false);
                    return "Reopened.";
                  })
                }
              />
            )}
          </>
        )}
      </TabPanel>

      <Modal open={editing !== null} onClose={() => (busy ? undefined : setEditing(null))} ariaLabel="Edit backlog item">
        {editing && (
          <div className="flex flex-col gap-4">
            <h2 className="text-[20px] font-extrabold text-ink">Edit item</h2>
            <BacklogForm
              subjects={subjects.subjects}
              busy={busy}
              error={formError}
              submitLabel="Save changes"
              idPrefix="edit-bl"
              initial={{
                subjectId: editing.subjectId,
                chapterId: editing.chapterId,
                topic: editing.topic ?? "",
                estimatedMinutes: editing.estimatedMinutes,
                deadline: editing.deadline,
                priority: editing.priority,
                notes: editing.notes ?? "",
              }}
              onSubmit={(input) => void handleEdit(input)}
              onCancel={() => setEditing(null)}
            />
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={dropping !== null}
        onClose={() => (busy ? undefined : setDropping(null))}
        onConfirm={() => void handleDrop()}
        title="Drop this item?"
        description={dropping ? `"${itemTitle(dropping, subjects.lookup)}" will leave your open list. You can reopen it from History.` : ""}
        confirmLabel="Drop"
        busy={busy}
        error={dropping ? formError : null}
      />

      <PlannerPickerModal
        open={scheduling !== null}
        onClose={() => setScheduling(null)}
        title="Schedule this item"
        subject={scheduling ? itemTitle(scheduling, subjects.lookup) : undefined}
        defaultMinutes={scheduling?.estimatedMinutes ?? 30}
        confirmLabel="Schedule"
        loadSuggestions={scheduling ? async () => (await getBacklogSuggestions(scheduling.id, 3)).data.suggestions : undefined}
        busy={busy}
        error={planError}
        onConfirm={(p) => void handleSchedule(p)}
      />

      <Toast state={toast} />
    </div>
  );
}
