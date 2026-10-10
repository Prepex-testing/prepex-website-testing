"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { MistakeForm } from "@/components/mistakes/MistakeForm";
import { MistakeList } from "@/components/mistakes/MistakeList";
import { MistakeStatsPanel } from "@/components/mistakes/MistakeStatsPanel";
import { ReviewCard } from "@/components/mistakes/ReviewCard";
import { ProfileSubpageHeader } from "@/components/profile/ProfileSubpageHeader";
import { StudyTabs } from "@/components/study/StudyTabs";
import { FIELD } from "@/components/study/SubjectChapterFields";
import { useSubjects } from "@/components/study/useSubjects";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Modal } from "@/components/ui/Modal";
import { PageLoader } from "@/components/ui/PageLoader";
import { ApiError } from "@/lib/api/http";
import {
  createMistake,
  deleteMistake,
  getMistakeQueue,
  getMistakeStats,
  listMistakes,
  masterMistake,
  reopenMistake,
  reviewMistake,
  updateMistake,
  type Mistake,
  type MistakeStats,
  type MistakeStatusFilter,
  type NewMistake,
} from "@/lib/api/mistakes";
import { describeNextReview, type Rating } from "@/lib/study/mistakeRating";

type Tab = "due" | "all" | "stats";
const TABS: { key: Tab; label: string }[] = [
  { key: "due", label: "Due Today" },
  { key: "all", label: "All Mistakes" },
  { key: "stats", label: "Stats" },
];

const msg = (err: unknown, fallback: string) => (err instanceof ApiError ? err.message : fallback);

export default function MistakesPage() {
  const subjects = useSubjects();
  const [tab, setTab] = useState<Tab>("due");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Due Today
  const [queue, setQueue] = useState<Mistake[]>([]);
  const [totalDue, setTotalDue] = useState(0);
  const [queueReady, setQueueReady] = useState(false);

  // All Mistakes
  const [items, setItems] = useState<Mistake[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [allReady, setAllReady] = useState(false);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<MistakeStatusFilter>("all");
  const [tagFilter, setTagFilter] = useState("");

  // Stats
  const [stats, setStats] = useState<MistakeStats | null>(null);

  // Dialogs
  const [formFor, setFormFor] = useState<{ mode: "add" } | { mode: "edit"; mistake: Mistake } | null>(null);
  const [reviewing, setReviewing] = useState<Mistake | null>(null);
  const [deleting, setDeleting] = useState<Mistake | null>(null);

  const loadQueue = useCallback(async () => {
    try {
      const res = await getMistakeQueue();
      setQueue(res.data.items);
      setTotalDue(res.data.totalDue);
    } catch (err) {
      setError(msg(err, "We couldn't load today's reviews. Please refresh."));
    } finally {
      setQueueReady(true);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      setStats((await getMistakeStats()).data);
    } catch {
      /* stats are secondary */
    }
  }, []);

  const loadAll = useCallback(
    async (cursor: string | null) => {
      try {
        const res = await listMistakes({
          q: appliedSearch || undefined,
          subjectId: subjectFilter ?? undefined,
          status: statusFilter,
          tag: tagFilter.trim().toLowerCase() || undefined,
          cursor,
          limit: 20,
        });
        setItems((prev) => (cursor ? [...prev, ...res.data.items] : res.data.items));
        setNextCursor(res.data.nextCursor);
      } catch (err) {
        setError(msg(err, "We couldn't load your mistakes. Please refresh."));
      } finally {
        setAllReady(true);
      }
    },
    [appliedSearch, subjectFilter, statusFilter, tagFilter],
  );

  // First load: today's queue and the stats.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load (state is set after the awaits)
    void loadQueue();
    void loadStats();
  }, [loadQueue, loadStats]);

  // Debounce the search box.
  useEffect(() => {
    const id = window.setTimeout(() => setAppliedSearch(search.trim()), 300);
    return () => window.clearTimeout(id);
  }, [search]);

  // The "All" list reloads when its filters change (only once the tab has been opened).
  useEffect(() => {
    if (tab !== "all") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data load (state is set after the awaits)
    void loadAll(null);
  }, [tab, loadAll]);

  const refreshAfterChange = useCallback(async () => {
    await Promise.all([loadQueue(), loadStats(), tab === "all" ? loadAll(null) : Promise.resolve()]);
  }, [loadQueue, loadStats, loadAll, tab]);

  async function run(action: () => Promise<void>, failure: string) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(msg(err, failure));
    } finally {
      setBusy(false);
    }
  }

  const rate = (mistake: Mistake, rating: Rating, fromQueue: boolean) =>
    run(async () => {
      const res = await reviewMistake(mistake.id, { difficulty: rating.difficulty, remembered: rating.remembered });
      setNotice(`Saved. You'll see this again ${describeNextReview(res.data.nextReviewAt)}.`);
      if (fromQueue) {
        setQueue((q) => q.filter((m) => m.id !== mistake.id));
        setTotalDue((n) => Math.max(0, n - 1));
      } else {
        setReviewing(null);
        setItems((list) => list.map((m) => (m.id === mistake.id ? res.data : m)));
      }
      void loadStats();
    }, "Couldn't save that review. Please try again.");

  const master = (mistake: Mistake, fromQueue: boolean) =>
    run(async () => {
      const res = await masterMistake(mistake.id);
      setNotice("Marked as mastered. It won't come back unless you reopen it.");
      if (fromQueue) {
        setQueue((q) => q.filter((m) => m.id !== mistake.id));
        setTotalDue((n) => Math.max(0, n - 1));
      } else {
        void loadQueue(); // it may have been due: re-sync today's queue
      }
      setReviewing(null);
      setItems((list) => list.map((m) => (m.id === mistake.id ? res.data : m)));
      void loadStats();
    }, "Couldn't mark that as mastered.");

  const reopen = (mistake: Mistake) =>
    run(async () => {
      const res = await reopenMistake(mistake.id);
      setItems((list) => list.map((m) => (m.id === mistake.id ? res.data : m)));
      setNotice("Reopened. It's back in your reviews from tomorrow.");
      void loadQueue();
      void loadStats();
    }, "Couldn't reopen that.");

  const save = (input: NewMistake) =>
    run(async () => {
      if (formFor?.mode === "edit") {
        const res = await updateMistake(formFor.mistake.id, input);
        setItems((list) => list.map((m) => (m.id === res.data.id ? res.data : m)));
        setNotice("Changes saved.");
      } else {
        await createMistake(input);
        setNotice("Saved. It comes up for review tomorrow.");
      }
      setFormFor(null);
      await refreshAfterChange();
    }, "Couldn't save that. Please try again.");

  const remove = () =>
    run(async () => {
      if (!deleting) return;
      await deleteMistake(deleting.id);
      setDeleting(null);
      setNotice("Deleted.");
      await refreshAfterChange();
    }, "Couldn't delete that.");

  if (subjects.status === "loading" || !queueReady) return <PageLoader label="Opening your notebook…" />;

  const current = queue[0];

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 lg:mx-auto lg:max-w-3xl lg:p-8" data-testid="mistakes-page">
      <ProfileSubpageHeader title="Mistakes" backHref="/home" />
      <StudyTabs current="/mistakes" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 border-b border-brand/10" role="tablist" aria-label="Mistake notebook views">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              id={`tab-${t.key}`}
              aria-selected={tab === t.key}
              aria-controls={`panel-${t.key}`}
              data-testid={`tab-${t.key}`}
              onClick={() => {
                setTab(t.key);
                setNotice(null);
                setError(null);
              }}
              className={`-mb-px min-h-11 border-b-2 px-3 text-[14px] font-bold ${tab === t.key ? "border-ink text-ink dark:border-[#FAF7F2]" : "border-transparent text-muted"}`}
            >
              {t.label}
              {t.key === "due" && totalDue > 0 ? ` (${totalDue})` : ""}
            </button>
          ))}
        </div>
        <button
          type="button"
          data-testid="add-mistake"
          onClick={() => {
            setError(null);
            setFormFor({ mode: "add" });
          }}
          className="min-h-12 rounded-lg border border-primary-button-border bg-cta px-4 text-[15px] font-semibold text-white hover:bg-[#E8623F]"
        >
          + Add mistake
        </button>
      </div>

      {notice && (
        <p role="status" data-testid="mistakes-notice" className="rounded-lg bg-[var(--success-bg)] px-3 py-2 text-[13px] font-semibold text-[var(--success)]">
          {notice}
        </p>
      )}
      {error && !formFor && !deleting && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
          {error}
        </p>
      )}

      {tab === "due" && (
        <section id="panel-due" role="tabpanel" aria-labelledby="tab-due" className="flex flex-col gap-4">
          {current ? (
            <ReviewCard
              key={current.id}
              mistake={current}
              lookup={subjects.lookup}
              busy={busy}
              position={`${queue.length} left today`}
              onRate={(rating) => void rate(current, rating, true)}
              onMaster={() => void master(current, true)}
              onSkip={queue.length > 1 ? () => setQueue((q) => [...q.slice(1), q[0]!]) : undefined}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-brand/25 p-6 text-center" data-testid="queue-empty">
              <p className="text-[18px] font-extrabold text-ink">You&apos;re all caught up</p>
              <p className="mt-1 text-[13px] text-muted">
                {stats && stats.dueNext7Days > 0
                  ? `${stats.dueNext7Days} more ${stats.dueNext7Days === 1 ? "is" : "are"} due in the next 7 days.`
                  : "Nothing is waiting for review. Add the mistakes you make in tests and books so you don't repeat them."}
              </p>
            </div>
          )}
          <Link href="/home/mistake-notebook" className="text-center text-[13px] font-semibold text-muted underline underline-offset-2">
            Mistakes from Prepex practice are in their own notebook →
          </Link>
        </section>
      )}

      {tab === "all" && (
        <section id="panel-all" role="tabpanel" aria-labelledby="tab-all" className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <input
              type="search"
              aria-label="Search mistakes"
              data-testid="mistake-search"
              placeholder="Search questions"
              className={`${FIELD} col-span-2`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select aria-label="Filter by subject" className={FIELD} value={subjectFilter ?? ""} onChange={(e) => setSubjectFilter(e.target.value ? Number(e.target.value) : null)}>
              <option value="">All subjects</option>
              {subjects.subjects.map((s) => (
                <option key={s.subjectId} value={s.subjectId}>
                  {s.subjectName}
                </option>
              ))}
            </select>
            <select aria-label="Filter by status" data-testid="status-filter" className={FIELD} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as MistakeStatusFilter)}>
              <option value="all">All</option>
              <option value="active">Still learning</option>
              <option value="mastered">Mastered</option>
            </select>
            <input aria-label="Filter by tag" placeholder="Tag" className={`${FIELD} col-span-2`} value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} />
          </div>
          {!allReady ? (
            <PageLoader label="Loading…" />
          ) : (
            <MistakeList
              items={items}
              lookup={subjects.lookup}
              busyId={busy ? "*" : null}
              onReview={(m) => setReviewing(m)}
              onEdit={(m) => {
                setError(null);
                setFormFor({ mode: "edit", mistake: m });
              }}
              onDelete={(m) => {
                setError(null);
                setDeleting(m);
              }}
              onMaster={(m) => void master(m, false)}
              onReopen={(m) => void reopen(m)}
            />
          )}
          {nextCursor && (
            <button type="button" data-testid="load-more" onClick={() => void loadAll(nextCursor)} className="min-h-12 rounded-lg border-[1.5px] border-secondary-button-border bg-surface px-4 text-[15px] font-semibold text-body-text hover:bg-tint-strong dark:text-ink">
              Load more
            </button>
          )}
        </section>
      )}

      {tab === "stats" && (
        <section id="panel-stats" role="tabpanel" aria-labelledby="tab-stats">
          {stats ? <MistakeStatsPanel stats={stats} lookup={subjects.lookup} /> : <PageLoader label="Counting…" />}
        </section>
      )}

      <Modal open={formFor !== null} onClose={() => (busy ? undefined : setFormFor(null))} ariaLabel={formFor?.mode === "edit" ? "Edit mistake" : "Add a mistake"} size="wide">
        {formFor && (
          <div className="flex flex-col gap-4">
            <h2 className="text-[20px] font-extrabold text-ink">{formFor.mode === "edit" ? "Edit mistake" : "Add a mistake"}</h2>
            <MistakeForm
              subjects={subjects.subjects}
              busy={busy}
              error={error}
              initial={formFor.mode === "edit" ? formFor.mistake : undefined}
              submitLabel={formFor.mode === "edit" ? "Save changes" : "Save mistake"}
              onSubmit={(input) => void save(input)}
              onCancel={() => setFormFor(null)}
            />
          </div>
        )}
      </Modal>

      <Modal open={reviewing !== null} onClose={() => (busy ? undefined : setReviewing(null))} ariaLabel="Review this mistake" size="wide">
        {reviewing && (
          <ReviewCard
            key={reviewing.id}
            mistake={reviewing}
            lookup={subjects.lookup}
            busy={busy}
            error={error}
            onRate={(rating) => void rate(reviewing, rating, false)}
            onMaster={() => void master(reviewing, false)}
          />
        )}
      </Modal>

      <ConfirmModal
        open={deleting !== null}
        onClose={() => (busy ? undefined : setDeleting(null))}
        onConfirm={() => void remove()}
        title="Delete this mistake?"
        description="It will be removed from your notebook along with its review history."
        confirmLabel="Delete"
        busy={busy}
        error={deleting ? error : null}
      />
    </div>
  );
}
