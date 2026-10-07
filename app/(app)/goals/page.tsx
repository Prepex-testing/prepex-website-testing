"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { GoalCard } from "@/components/goals/GoalCard";
import { GoalComposer } from "@/components/goals/GoalComposer";
import { ProfileSubpageHeader } from "@/components/profile/ProfileSubpageHeader";
import { PageLoader } from "@/components/ui/PageLoader";
import { ApiError } from "@/lib/api/http";
import type { SubjectChapters } from "@/lib/api/dashboard";
import { getStudentChapters } from "@/lib/api/onboarding";
import { getCurrentTimetable } from "@/lib/api/timetable";
import {
  carryOverGoals,
  createGoals,
  deleteGoal,
  getCurrentGoals,
  reportGoalProgress,
  updateGoal,
  type CurrentGoals,
  type Goal,
  type NewGoal,
} from "@/lib/api/goals";
import { daysLeftText, describeGoal, formatWeekRange, scopeText } from "@/lib/goals/format";

function messageOf(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

function GoalsScreen() {
  const router = useRouter();
  const welcome = useSearchParams().get("welcome") === "1";

  const [data, setData] = useState<CurrentGoals | null>(null);
  const [subjects, setSubjects] = useState<SubjectChapters[]>([]);
  const [hasTimetable, setHasTimetable] = useState<boolean | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [goals, chapters, timetable] = await Promise.allSettled([getCurrentGoals(), getStudentChapters(), getCurrentTimetable()]);
    if (goals.status === "rejected") {
      setLoadError(messageOf(goals.reason, "We couldn't load your goals. Please refresh."));
      return;
    }
    setData(goals.value.data);
    if (chapters.status === "fulfilled") setSubjects(chapters.value.data);
    setHasTimetable(timetable.status === "fulfilled" ? timetable.value.data.timetable !== null : null);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load
    void load();
  }, [load]);

  const subjectNames = new Map(subjects.map((s) => [s.subjectId, s.subjectName]));
  const chapterNames = new Map(subjects.flatMap((s) => s.chapters.map((c) => [c.id, c.name] as const)));
  const scopeOf = (g: Goal) => scopeText(g, subjectNames, chapterNames);

  async function run(id: string | null, action: () => Promise<unknown>, failure: string) {
    setBusyId(id);
    setSaveError(null);
    try {
      await action();
      await load();
    } catch (err) {
      setSaveError(messageOf(err, failure));
    } finally {
      setBusyId(null);
    }
  }

  async function handleSave(goals: NewGoal[]) {
    setSaving(true);
    setSaveError(null);
    try {
      await createGoals(goals);
      if (welcome) {
        router.push("/check-in");
        return;
      }
      await load();
      setNotice("Goals saved — today's plan has been updated to match.");
    } catch (err) {
      setSaveError(messageOf(err, "Couldn't save your goals. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  if (loadError) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
          {loadError}
        </p>
      </div>
    );
  }
  if (!data) return <PageLoader label="Loading your goals…" />;

  const live = data.goals.filter((g) => g.status !== "ABANDONED" && g.status !== "CARRIED_OVER");
  const candidates = data.carryOverCandidates;

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 lg:p-8" data-testid="goals-page">
      <ProfileSubpageHeader title={welcome ? "Set your goals for this week" : "This week's goals"} backHref="/home" />

      {welcome && (
        <p className="rounded-xl bg-tint-strong px-4 py-3 text-[14px] leading-snug text-body-text dark:bg-[#FAF7F214] dark:text-ink" data-testid="goals-welcome">
          Tell Prepex what you want to get done this week. It turns your goals — and your timetable — into a plan for each day.
          You can change them any time.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-ink">
        <span className="rounded-full bg-tint-strong px-3 py-1.5 dark:bg-[#FAF7F214]" data-testid="week-range">
          {formatWeekRange(data.weekStart, data.weekEnd)}
        </span>
        <span className="rounded-full bg-tint-strong px-3 py-1.5 dark:bg-[#FAF7F214]" data-testid="days-left">
          {daysLeftText(data.daysLeft)}
        </span>
        {live.length > 0 && (
          <span className="rounded-full bg-tint-strong px-3 py-1.5 dark:bg-[#FAF7F214]" data-testid="week-summary">
            {data.summary.done} of {data.summary.total} done · {data.summary.percent}%
          </span>
        )}
      </div>

      {notice && (
        <p role="status" className="flex flex-wrap items-center gap-x-3 rounded-lg bg-[var(--success-bg)] px-3 py-2 text-[13px] font-semibold text-[var(--success)]">
          {notice}
          <Link href="/home" className="underline underline-offset-2">
            See today&apos;s plan
          </Link>
        </p>
      )}

      {candidates.length > 0 && (
        <section aria-label="Carry over" className="flex flex-col gap-3 rounded-2xl border border-[var(--warning)]/40 bg-[var(--warning-bg)] p-4" data-testid="carry-over">
          <div>
            <p className="text-[15px] font-bold text-ink">Last week&apos;s unfinished goals</p>
            <p className="mt-0.5 text-[12px] text-body-text dark:text-ink/80">
              Carry them into this week — you&apos;ll only need to do what&apos;s left.
            </p>
          </div>
          <ul className="flex flex-col gap-1.5">
            {candidates.map((g) => (
              <li key={g.id} className="text-[14px] font-semibold text-ink">
                {describeGoal(g)} <span className="font-normal text-muted">· {g.progress.current} of {g.target} done</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            data-testid="carry-over-all"
            disabled={busyId === "carry"}
            onClick={() => run("carry", () => carryOverGoals(), "Couldn't carry those over.")}
            className="min-h-12 rounded-lg bg-cta px-4 text-[15px] font-semibold text-white hover:bg-[#E8623F] disabled:opacity-60"
          >
            {busyId === "carry" ? "Carrying over…" : `Carry over ${candidates.length} goal${candidates.length === 1 ? "" : "s"}`}
          </button>
        </section>
      )}

      {live.length > 0 ? (
        <ul className="flex flex-col gap-3" data-testid="goal-list">
          {live.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              scope={scopeOf(g)}
              busy={busyId === g.id}
              onWatched={(n) => run(g.id, () => reportGoalProgress(g.id, Math.max(0, n)), "Couldn't update that.")}
              onToggleDone={() => run(g.id, () => updateGoal(g.id, { status: g.status === "DONE" ? "ACTIVE" : "DONE" }), "Couldn't update that.")}
              onDelete={() => run(g.id, () => deleteGoal(g.id), "Couldn't remove that goal.")}
            />
          ))}
        </ul>
      ) : (
        <div className="rounded-2xl border border-dashed border-brand/25 p-6 text-center" data-testid="goals-empty">
          <p className="text-[16px] font-bold text-ink">No goals yet this week</p>
          <p className="mt-1 text-[13px] text-muted">
            Add a few below. Until then Prepex suggests a plan from your chapter progress.
          </p>
        </div>
      )}

      {saveError && !saving && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">
          {saveError}
        </p>
      )}

      <GoalComposer subjects={subjects} existing={data.goals} saving={saving} error={saving ? null : saveError} onSave={handleSave} />

      {hasTimetable === false && (
        <section className="flex flex-col gap-2 rounded-2xl border border-brand/10 bg-surface p-4" data-testid="timetable-nudge">
          <p className="text-[15px] font-bold text-ink">Tell Prepex when you&apos;re free</p>
          <p className="text-[13px] text-muted">
            Add your weekly timetable and your tasks are placed in your real free slots, not guessed.
          </p>
          <Link
            href="/timetable"
            className="flex min-h-12 items-center justify-center rounded-lg border-[1.5px] border-secondary-button-border bg-surface px-4 text-[15px] font-semibold text-body-text hover:bg-tint-strong"
          >
            Build my timetable
          </Link>
        </section>
      )}

      {welcome && (
        <button
          type="button"
          data-testid="skip-goals"
          onClick={() => router.push("/check-in")}
          className="min-h-12 rounded-lg px-4 text-[14px] font-semibold text-muted underline-offset-2 hover:underline"
        >
          Skip for now
        </button>
      )}
    </div>
  );
}

export default function GoalsPage() {
  return (
    <Suspense fallback={<PageLoader label="Loading your goals…" />}>
      <GoalsScreen />
    </Suspense>
  );
}
