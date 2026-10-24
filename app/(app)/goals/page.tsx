"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { GoalCard } from "@/components/goals/GoalCard";
import { GoalFormSheet, kindOfGoal, type FormKind, type FormSubject } from "@/components/goals/GoalFormSheet";
import { NewSuggestion } from "@/components/goals/NewSuggestion";
import { SuggestPanel } from "@/components/goals/SuggestPanel";
import { MockGoalCard, SubjectGoalCard, type Draft } from "@/components/goals/SubjectGoalCard";
import { WeekCapacity } from "@/components/goals/WeekCapacity";
import { WeekSuggestSheet } from "@/components/goals/WeekSuggestSheet";
import { ProfileSubpageHeader } from "@/components/profile/ProfileSubpageHeader";
import { PageLoader } from "@/components/ui/PageLoader";
import { ApiError } from "@/lib/api/http";
import type { SubjectChapters } from "@/lib/api/dashboard";
import { getStudentChapters } from "@/lib/api/onboarding";
import { getCurrentTimetable } from "@/lib/api/timetable";
import { getGoalDefaults, getWeekSummary, type GoalDefaults, type WeekSummary } from "@/lib/api/plannerV2";
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
import { forSave, goalMinutes } from "@/lib/goals/v2";
import { mondayAfterWeeks, weekLabel } from "@/lib/diagnosis/format";
import { WEEKS_AHEAD, parsePrefill } from "@/lib/goals/prefill";
import { readTargetRank } from "@/lib/insights/targetRank";
import { trackPlanner } from "@/lib/telemetry/planner";

function messageOf(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

type FormState = { kind: FormKind; subjectId: number | null; editing: Goal | null };

let draftCounter = 0;
const newDraft = (goal: NewGoal): Draft => ({ ...goal, draftId: `draft-${Date.now()}-${draftCounter++}` });

function GoalsScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const welcome = params.get("welcome") === "1";

  const [data, setData] = useState<CurrentGoals | null>(null);
  const [subjects, setSubjects] = useState<SubjectChapters[]>([]);
  const [hasTimetable, setHasTimetable] = useState<boolean | null>(null);
  const [summary, setSummary] = useState<WeekSummary | null>(null);
  const [defaults, setDefaults] = useState<GoalDefaults | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [suggestOpen, setSuggestOpen] = useState(false);
  // the goal whose ✨ Suggest panel is open
  const [suggestingId, setSuggestingId] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  // A chapter handed over by a link (a diagnosis chip) may be from another class than the student's own (a class-12
  // student revising a class-11 chapter), so a link that names one loads every class's chapters.
  const wantsAllClasses = params.get("chapter") !== null;

  const load = useCallback(async () => {
    const [goals, chapters, timetable, defs] = await Promise.allSettled([
      getCurrentGoals(),
      getStudentChapters(wantsAllClasses ? { allClasses: true } : {}),
      getCurrentTimetable(),
      getGoalDefaults(),
    ]);
    if (goals.status === "rejected") {
      setLoadError(messageOf(goals.reason, "We couldn't load your goals. Please refresh."));
      return;
    }
    setData(goals.value.data);
    if (chapters.status === "fulfilled") setSubjects(chapters.value.data);
    setHasTimetable(timetable.status === "fulfilled" ? timetable.value.data.timetable !== null : null);
    if (defs.status === "fulfilled") setDefaults(defs.value.data);
    setVersion((v) => v + 1);
  }, [wantsAllClasses]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load
    void load();
  }, [load]);

  const subjectList: FormSubject[] = useMemo(() => subjects.map((s) => ({ subjectId: s.subjectId, name: s.subjectName, chapters: s.chapters })), [subjects]);
  const subjectNames = useMemo(() => new Map(subjects.map((s) => [s.subjectId, s.subjectName])), [subjects]);
  const chapterNames = useMemo(() => new Map(subjects.flatMap((s) => s.chapters.map((c) => [c.id, c.name] as const))), [subjects]);
  const scopeOf = (g: Goal) => scopeText(g, subjectNames, chapterNames);

  // A goal handed over from elsewhere (a diagnosis chip): `?week=next&type=HOURS&unit=MINUTES&target=90&chapter=<id>`
  const prefill = parsePrefill(params, (chapterId) => subjects.find((s) => s.chapters.some((c) => c.id === chapterId))?.subjectId ?? null);
  const weeksAhead = prefill ? WEEKS_AHEAD[prefill.week] : 0;
  const targetWeekStart = weeksAhead > 0 && data ? mondayAfterWeeks(data.weekStart, weeksAhead) : undefined;
  const targetWeekName = weeksAhead === 1 ? "next week" : "the week of";
  const viewWeekStart = targetWeekStart ?? data?.weekStart;

  // The prefilled goal starts as a not-yet-saved chip.
  const prefilled = useRef(false);
  useEffect(() => {
    if (!prefill || prefilled.current || subjects.length === 0) return;
    prefilled.current = true;
    setDrafts((d) => [...d, newDraft(prefill.goal)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill?.goal.type, subjects.length]);

  // The hours the week holds, and what is already allocated, for the week being edited.
  useEffect(() => {
    if (!viewWeekStart) return;
    let live = true;
    getWeekSummary(viewWeekStart).then(
      (res) => live && setSummary(res.data),
      () => live && setSummary(null),
    );
    return () => {
      live = false;
    };
  }, [viewWeekStart, version]);

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

  const live = (data?.goals ?? []).filter((g) => g.status !== "ABANDONED" && g.status !== "CARRIED_OVER");
  // Goals of the week being looked at. For a later week the list below belongs to this week, so it is hidden.
  const shown = targetWeekStart ? [] : live;
  const unsavedMinutes = drafts.reduce((sum, g) => sum + goalMinutes(g, defaults ?? undefined), 0);
  // The server counts what is saved; the drafts are added on top so the bar moves as the student adds goals.
  const allocatedMinutes = (summary?.allocatedMinutes ?? 0) + unsavedMinutes;

  const knownSubjectIds = new Set(subjects.map((s) => s.subjectId));
  const mockGoals = shown.filter((g) => g.type === "MOCKS");
  const otherGoals = shown.filter((g) => g.type !== "MOCKS" && (g.subjectId === null || !knownSubjectIds.has(g.subjectId) || g.source === "PARTNER"));
  const mockDrafts = drafts.filter((g) => g.type === "MOCKS");
  const takenBacklogIds = [...shown, ...drafts].map((g) => g.backlogItemId).filter((id): id is string => !!id);

  function openForm(next: FormState) {
    setFormError(null);
    setForm(next);
    // the student's own defaults for this subject (their last week of sessions, their usual practice length)
    getGoalDefaults(next.subjectId).then(
      (res) => setDefaults(res.data),
      () => undefined,
    );
  }

  async function handleFormSubmit(goals: NewGoal[]) {
    if (!form) return;
    if (form.editing) {
      const g = goals[0]!;
      setFormBusy(true);
      setFormError(null);
      try {
        await updateGoal(form.editing.id, {
          chapterId: g.chapterId ?? null,
          topic: g.topic ?? null,
          target: g.target,
          unit: g.unit,
          minutesPerUnit: g.minutesPerUnit ?? null,
          ...(g.type === "QUESTIONS" ? { practiceSource: g.practiceSource ?? null } : {}),
          ...(g.type === "REVISIONS" ? { revisionType: g.revisionType ?? null, targetAccuracy: g.targetAccuracy ?? null } : {}),
          ...(g.type === "MOCKS" ? { mockType: g.mockType ?? null, examPattern: g.examPattern ?? null, fixedDate: g.fixedDate ?? null, fixedStartTime: g.fixedStartTime ?? null, fixedEndTime: null } : {}),
        });
        setForm(null);
        await load();
        setNotice("Goal updated. Today's plan has been adjusted to match.");
      } catch (err) {
        setFormError(messageOf(err, "Couldn't update that goal. Please try again."));
      } finally {
        setFormBusy(false);
      }
      return;
    }
    const clash = goals.find((g) => [...drafts, ...live].some((x) => sameGoal(g, x)));
    if (clash) {
      setFormError("You already have that goal this week.");
      return;
    }
    setDrafts((d) => [...d, ...goals.map(newDraft)]);
    setForm(null);
  }

  async function handleFormDelete() {
    if (!form?.editing) return;
    setFormBusy(true);
    try {
      await deleteGoal(form.editing.id);
      setForm(null);
      await load();
    } catch (err) {
      setFormError(messageOf(err, "Couldn't remove that goal."));
    } finally {
      setFormBusy(false);
    }
  }

  async function handleSave() {
    if (drafts.length === 0) return;
    setSaving(true);
    setSaveError(null);
    try {
      await createGoals(drafts.map(forSave), targetWeekStart);
      trackPlanner("weekly_goal_save", { count: drafts.length, minutes: unsavedMinutes, nextWeek: !!targetWeekStart });
      setDrafts([]);
      if (welcome) {
        router.push("/check-in");
        return;
      }
      if (targetWeekStart) {
        router.replace("/goals");
        await load();
        setNotice(`Saved for ${weeksAhead === 1 ? "next week" : "a later week"} (${weekLabel(targetWeekStart)}). They show up here when the week starts.`);
        return;
      }
      await load();
      setNotice("Goals saved. Today's plan has been updated to match.");
    } catch (err) {
      setSaveError(messageOf(err, "Couldn't save your goals. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  // a goal was created from a ✨ suggestion: refresh the list and say so
  async function handleSuggestionAdded(message: string) {
    setSaveError(null);
    await load();
    setNotice(`${message} Today's plan has been updated to match.`);
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

  const candidates = data.carryOverCandidates;
  const formSubject = form && form.kind !== "MOCKS" ? (subjectList.find((s) => s.subjectId === form.subjectId) ?? null) : null;

  return (
    <div className="flex flex-col gap-5 p-4 pb-28 sm:p-6 lg:p-8" data-testid="goals-page">
      <ProfileSubpageHeader title={welcome ? "Set your goals for this week" : "This week's goals"} backHref="/home" />

      {welcome && (
        <p className="rounded-xl bg-tint-strong px-4 py-3 text-[14px] leading-snug text-body-text dark:bg-[#FAF7F214] dark:text-ink" data-testid="goals-welcome">
          Tell Prepex what you want to get done this week. It turns your goals and your timetable into a plan for each day. You can change them any time.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-ink">
        <span className="rounded-full bg-tint-strong px-3 py-1.5 dark:bg-[#FAF7F214]" data-testid="week-range">
          {targetWeekStart ? weekLabel(targetWeekStart) : formatWeekRange(data.weekStart, data.weekEnd)}
        </span>
        {!targetWeekStart && (
          <span className="rounded-full bg-tint-strong px-3 py-1.5 dark:bg-[#FAF7F214]" data-testid="days-left">
            {daysLeftText(data.daysLeft)}
          </span>
        )}
        {!targetWeekStart && live.length > 0 && (
          <span className="rounded-full bg-tint-strong px-3 py-1.5 dark:bg-[#FAF7F214]" data-testid="week-summary">
            {data.summary.done} of {data.summary.total} done · {data.summary.percent}%
          </span>
        )}
      </div>

      <WeekCapacity summary={summary} allocatedMinutes={allocatedMinutes} unsavedMinutes={unsavedMinutes} />

      {notice && (
        <p role="status" className="flex flex-wrap items-center gap-x-3 rounded-lg bg-[var(--success-bg)] px-3 py-2 text-[13px] font-semibold text-[var(--success)]">
          {notice}
          <Link href="/planner" className="underline underline-offset-2">
            See today&apos;s plan
          </Link>
        </p>
      )}

      {targetWeekStart && (
        <p role="status" className="rounded-xl bg-tint-strong px-4 py-3 text-[14px] font-semibold leading-snug text-ink dark:bg-[#FAF7F214]" data-testid="goals-next-week">
          Setting goals for {weeksAhead === 1 ? `next week (${weekLabel(targetWeekStart)})` : `${targetWeekName} ${weekLabel(targetWeekStart)}`}. Change them if you like, then save.
        </p>
      )}

      {candidates.length > 0 && (
        <section aria-label="Carry over" className="flex flex-col gap-3 rounded-2xl border border-[var(--warning)]/40 bg-[var(--warning-bg)] p-4" data-testid="carry-over">
          <div>
            <p className="text-[15px] font-bold text-ink">Last week&apos;s unfinished goals</p>
            <p className="mt-0.5 text-[12px] text-body-text dark:text-ink/80">Carry them into this week. You&apos;ll only need to do what&apos;s left.</p>
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

      <button
        type="button"
        data-testid="suggest-week"
        onClick={() => setSuggestOpen(true)}
        className="flex min-h-14 items-center justify-center gap-2 rounded-lg border-[1.5px] border-secondary-button-border bg-surface px-4 text-[15px] font-semibold text-body-text hover:bg-tint-strong dark:text-ink"
      >
        ✨ Suggest this week&apos;s goals for me
      </button>

      {shown.length + drafts.length === 0 && (
        <div className="rounded-2xl border border-dashed border-brand/25 p-6 text-center" data-testid="goals-empty">
          <p className="text-[16px] font-bold text-ink">No goals yet {targetWeekStart ? "for that week" : "this week"}</p>
          <p className="mt-1 text-[13px] text-muted">Add lectures, practice or revision to a subject below, or let Prepex suggest a week. Until then it plans from your chapter progress.</p>
        </div>
      )}

      <div className="flex flex-col gap-4" data-testid="goal-list">
        {subjectList.map((subject) => (
          <SubjectGoalCard
            key={subject.subjectId}
            subject={subject}
            goals={shown.filter((g) => g.subjectId === subject.subjectId && g.type !== "MOCKS" && g.source !== "PARTNER")}
            drafts={drafts.filter((g) => g.subjectId === subject.subjectId && g.type !== "MOCKS")}
            defaults={defaults}
            busyId={busyId}
            onAdd={(kind) => openForm({ kind, subjectId: subject.subjectId, editing: null })}
            onEdit={(goal) => openForm({ kind: kindOfGoal(goal.type), subjectId: goal.subjectId, editing: goal })}
            onRemoveDraft={(id) => setDrafts((d) => d.filter((x) => x.draftId !== id))}
            onWatched={(goal, next) => run(goal.id, () => reportGoalProgress(goal.id, Math.max(0, next)), "Couldn't update that.")}
            // TODO(planner-v2): owner = goal-assistant (5C) window. The ✨ Suggest panel for a chapter goal stays theirs; it is only mounted here.
            onSuggest={(goal) => setSuggestingId(suggestingId === goal.id ? null : goal.id)}
            suggestingId={suggestingId}
            renderSuggest={(goal) =>
              goal.chapterId ? (
                <SuggestPanel
                  chapterId={goal.chapterId}
                  chapterName={chapterNames.get(goal.chapterId) ?? "this chapter"}
                  weekStartDate={targetWeekStart}
                  targetRank={readTargetRank()}
                  onAdded={handleSuggestionAdded}
                  onClose={() => setSuggestingId(null)}
                />
              ) : null
            }
          />
        ))}

        <MockGoalCard
          goals={mockGoals}
          drafts={mockDrafts}
          defaults={defaults}
          onAdd={() => openForm({ kind: "MOCKS", subjectId: null, editing: null })}
          onEdit={(goal) => openForm({ kind: "MOCKS", subjectId: goal.subjectId, editing: goal })}
          onRemoveDraft={(id) => setDrafts((d) => d.filter((x) => x.draftId !== id))}
        />

        {(otherGoals.length > 0 || drafts.some((g) => g.type !== "MOCKS" && (g.subjectId == null || !knownSubjectIds.has(g.subjectId)))) && (
          <section aria-label="Other goals" className="flex flex-col gap-3" data-testid="other-goals">
            <h2 className="text-[16px] font-extrabold text-ink">Other goals</h2>
            <ul className="flex flex-col gap-3">
              {otherGoals.map((g) => (
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
              {drafts
                .filter((g) => g.type !== "MOCKS" && (g.subjectId == null || !knownSubjectIds.has(g.subjectId)))
                .map((g) => (
                  <li key={g.draftId} className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-brand/40 bg-tint-strong px-3 py-2 text-[14px] font-semibold text-ink dark:bg-[#FAF7F214]" data-testid="draft-chip">
                    <span>
                      {describeGoal(g)} <span className="text-[11px] font-bold text-muted">Not saved</span>
                    </span>
                    <button type="button" aria-label={`Remove: ${describeGoal(g)}`} onClick={() => setDrafts((d) => d.filter((x) => x.draftId !== g.draftId))} className="flex size-11 items-center justify-center rounded-lg text-[20px] text-muted hover:bg-surface">
                      ×
                    </button>
                  </li>
                ))}
            </ul>
          </section>
        )}
      </div>

      {saveError && !saving && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">
          {saveError}
        </p>
      )}

      <NewSuggestion subjects={subjects} weekStartDate={targetWeekStart} targetRank={readTargetRank()} onAdded={handleSuggestionAdded} />

      {hasTimetable === false && (
        <section className="flex flex-col gap-2 rounded-2xl border border-brand/10 bg-surface p-4" data-testid="timetable-nudge">
          <p className="text-[15px] font-bold text-ink">Tell Prepex when you&apos;re free</p>
          <p className="text-[13px] text-muted">Add your weekly timetable and your tasks are placed in your real free slots, not guessed.</p>
          <Link href="/timetable" className="flex min-h-12 items-center justify-center rounded-lg border-[1.5px] border-secondary-button-border bg-surface px-4 text-[15px] font-semibold text-body-text hover:bg-tint-strong">
            Build my timetable
          </Link>
        </section>
      )}

      {welcome && (
        <button type="button" data-testid="skip-goals" onClick={() => router.push("/check-in")} className="min-h-12 rounded-lg px-4 text-[14px] font-semibold text-muted underline-offset-2 hover:underline">
          Skip for now
        </button>
      )}

      {drafts.length > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom))] z-30 border-t border-brand/10 bg-background/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:left-[var(--sidebar-width,16rem)]" data-testid="save-bar">
          <button
            type="button"
            data-testid="save-goals"
            disabled={saving}
            onClick={() => void handleSave()}
            className="mx-auto flex min-h-14 w-full max-w-2xl items-center justify-center rounded-lg border border-primary-button-border bg-cta px-4 text-base font-semibold text-white transition-colors hover:bg-[#E8623F] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving…" : `Save ${drafts.length} goal${drafts.length === 1 ? "" : "s"}`}
          </button>
        </div>
      )}

      {form && (
        <GoalFormSheet
          open
          onClose={() => setForm(null)}
          kind={form.kind}
          subject={formSubject}
          subjects={subjectList}
          weekStart={viewWeekStart ?? data.weekStart}
          defaults={defaults}
          editing={form.editing}
          takenBacklogIds={takenBacklogIds}
          busy={formBusy}
          error={formError}
          onSubmit={handleFormSubmit}
          {...(form.editing ? { onDelete: () => void handleFormDelete() } : {})}
        />
      )}

      <WeekSuggestSheet
        open={suggestOpen}
        onClose={() => setSuggestOpen(false)}
        weekStart={viewWeekStart ?? data.weekStart}
        subjectNames={subjectNames}
        chapterNames={chapterNames}
        onAccept={(goals) => {
          setDrafts((d) => {
            const fresh = goals.filter((g) => ![...d, ...live].some((x) => sameGoal(g, x)));
            return [...d, ...fresh.map(newDraft)];
          });
          setNotice("Suggested goals added. Check them, then save.");
        }}
      />
    </div>
  );
}

function sameGoal(a: NewGoal, b: NewGoal | Goal): boolean {
  return (
    a.type === b.type &&
    a.unit === b.unit &&
    (a.subjectId ?? null) === (b.subjectId ?? null) &&
    (a.chapterId ?? null) === (b.chapterId ?? null) &&
    (a.topic ?? null) === (b.topic ?? null) &&
    (a.backlogItemId ?? null) === (b.backlogItemId ?? null) &&
    (a.type !== "MOCKS" || ((a.fixedDate ?? null) === (b.fixedDate ?? null) && (a.fixedStartTime ?? null) === (b.fixedStartTime ?? null))) &&
    (a.type !== "QUESTIONS" || (a.practiceSource ?? null) === (b.practiceSource ?? null)) &&
    (a.type !== "REVISIONS" || (a.revisionType ?? null) === (b.revisionType ?? null))
  );
}

export default function GoalsPage() {
  return (
    <Suspense fallback={<PageLoader label="Loading your goals…" />}>
      <GoalsScreen />
    </Suspense>
  );
}
