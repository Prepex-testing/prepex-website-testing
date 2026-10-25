"use client";

import { Plus } from "lucide-react";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { NewSuggestion } from "@/components/goals/NewSuggestion";
import { SmartSuggestion } from "@/components/goals/SmartSuggestion";
import { SuggestPanel } from "@/components/goals/SuggestPanel";
import { ProfileSubpageHeader } from "@/components/profile/ProfileSubpageHeader";
import { CoralButton } from "@/components/ui/CoralButton";
import { GhostButton } from "@/components/ui/GhostButton";
import { PageLoader } from "@/components/ui/PageLoader";
import { AddGoalPanel } from "@/components/weekly-goals/AddGoalPanel";
import { SubjectSection } from "@/components/weekly-goals/SubjectSection";
import { WeeklyCapacityHeader } from "@/components/weekly-goals/WeeklyCapacityHeader";
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
import { getGoalDefaults, getWeekSummary, type GoalDefaults, type WeekSummary } from "@/lib/api/plannerV2";
import { groupGoals } from "@/lib/goals/display";
import { daysLeftText, describeGoal, formatWeekRange } from "@/lib/goals/format";
import { WEEKS_AHEAD, parsePrefill } from "@/lib/goals/prefill";
import { MOCK_TYPES, forSave, goalMinutes, labelOf } from "@/lib/goals/v2";
import { mondayAfterWeeks, weekLabel } from "@/lib/diagnosis/format";
import { readTargetRank } from "@/lib/insights/targetRank";
import { trackPlanner } from "@/lib/telemetry/planner";

function messageOf(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

function GoalsScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const welcome = params.get("welcome") === "1";

  const [data, setData] = useState<CurrentGoals | null>(null);
  const [subjects, setSubjects] = useState<SubjectChapters[]>([]);
  const [hasTimetable, setHasTimetable] = useState<boolean | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // the goal whose Suggest panel is open
  const [suggestingId, setSuggestingId] = useState<string | null>(null);
  // the hours the week holds (from the timetable) and the student's own typical minutes per lecture, practice and revision
  const [summary, setSummary] = useState<WeekSummary | null>(null);
  const [defaults, setDefaults] = useState<GoalDefaults | null>(null);
  const [version, setVersion] = useState(0);
  // The add-a-goal panel is shut until asked for (open straight away when the student is setting goals for the first time).
  const [panelOpen, setPanelOpen] = useState(welcome);
  const [seed, setSeed] = useState<NewGoal | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  // A chapter handed over by a link (a diagnosis chip) may be from another class than the student's own (a class-12
  // student revising a class-11 chapter), so a link that names one loads every class's chapters.
  const wantsAllClasses = params.get("chapter") !== null;

  const load = useCallback(async () => {
    const [goals, chapters, timetable, defs] = await Promise.allSettled([getCurrentGoals(), getStudentChapters(wantsAllClasses ? { allClasses: true } : {}), getCurrentTimetable(), getGoalDefaults()]);
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

  const subjectNames = new Map(subjects.map((s) => [s.subjectId, s.subjectName]));
  const chapterNames = new Map(subjects.flatMap((s) => s.chapters.map((c) => [c.id, c.name] as const)));

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

  // A goal handed over from elsewhere (a diagnosis chip): `?week=next&type=HOURS&unit=MINUTES&target=90&chapter=<id>`
  const prefill = parsePrefill(params, (chapterId) => subjects.find((s) => s.chapters.some((c) => c.id === chapterId))?.subjectId ?? null);
  const hasPrefill = prefill !== null;
  const weeksAhead = prefill ? WEEKS_AHEAD[prefill.week] : 0;
  const targetWeekStart = weeksAhead > 0 && data ? mondayAfterWeeks(data.weekStart, weeksAhead) : undefined;
  const targetWeekName = weeksAhead === 1 ? "next week" : "the week of";
  const viewWeekStart = targetWeekStart ?? data?.weekStart;

  // a link that hands over a goal opens the panel on it
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- open once the handed-over goal is known
    if (hasPrefill) setPanelOpen(true);
  }, [hasPrefill]);

  // The week's free hours for the week being planned.
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

  useEffect(() => {
    if (panelOpen) panelRef.current?.scrollIntoView?.({ behavior: "smooth", block: "center" });
  }, [panelOpen, seed]);

  function openPanel(initial: NewGoal | null = null) {
    setSeed(initial);
    setPanelOpen(true);
  }

  async function handleSave(goals: NewGoal[]) {
    setSaving(true);
    setSaveError(null);
    try {
      await createGoals(goals.map(forSave), targetWeekStart);
      trackPlanner("weekly_goal_save", { count: goals.length, nextWeek: !!targetWeekStart });
      if (welcome) {
        router.push("/check-in");
        return;
      }
      setPanelOpen(false);
      setSeed(null);
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

  // goals accepted from "Suggest this week's goals": saved straight away, skipping any the student already has
  async function handleWeekSuggestions(goals: NewGoal[]) {
    const fresh = goals.filter((g) => !data?.goals.some((x) => x.status !== "ABANDONED" && x.type === g.type && (x.subjectId ?? null) === (g.subjectId ?? null) && (x.chapterId ?? null) === (g.chapterId ?? null) && (x.topic ?? null) === (g.topic ?? null) && (x.backlogItemId ?? null) === (g.backlogItemId ?? null)));
    if (fresh.length === 0) {
      setNotice("Those goals are already on your list.");
      return;
    }
    setSaveError(null);
    try {
      await createGoals(fresh.map(forSave), targetWeekStart);
      trackPlanner("weekly_goal_save", { count: fresh.length, via: "suggestion", nextWeek: !!targetWeekStart });
      await load();
      setNotice(`${fresh.length === 1 ? "A suggested goal was" : `${fresh.length} suggested goals were`} added. Today's plan has been updated to match.`);
    } catch (err) {
      setSaveError(messageOf(err, "Couldn't add those goals. Please try again."));
    }
  }

  // a goal was created from a suggestion: refresh the list and say so
  async function handleSuggestionAdded(message: string) {
    setSaveError(null);
    await load();
    setNotice(`${message} Today's plan has been updated to match.`);
  }

  function jumpToIncomplete() {
    pageRef.current?.querySelector('[data-testid="goal-card"][data-complete="false"]')?.scrollIntoView?.({ behavior: "smooth", block: "center" });
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
  const sections = groupGoals(live, subjects);
  const allocatedMinutes = live.reduce((sum, g) => sum + goalMinutes(g, defaults ?? undefined), 0);

  /** A goal's card title: its chapter, else "<Subject> general", else what kind of goal it is. */
  const titleOf = (g: Goal): string => {
    if (g.chapterId && chapterNames.get(g.chapterId)) return chapterNames.get(g.chapterId)!;
    if (g.topic) return g.topic;
    if (g.subjectId !== null) return `${subjectNames.get(g.subjectId) ?? "Subject"} general`;
    if (g.type === "MOCKS") return labelOf(MOCK_TYPES, g.mockType) ?? "Mock test";
    return describeGoal(g);
  };

  const suggestingGoal = suggestingId ? live.find((g) => g.id === suggestingId) : undefined;

  return (
    <div ref={pageRef} className="min-h-full bg-surface-base">
      <div className="flex flex-col gap-5 p-4 sm:p-6 lg:p-8" data-testid="goals-page">
        <ProfileSubpageHeader title={welcome ? "Set your goals for this week" : "This week's goals"} backHref="/home" />

        {welcome && (
          <p className="rounded-2xl border border-border-subtle bg-surface-elevated px-4 py-3 text-[14px] leading-snug text-body-text dark:text-ink" data-testid="goals-welcome">
            Tell Prepex what you want to get done this week. It turns your goals and your timetable into a plan for each day.
            You can change them any time.
          </p>
        )}

        <WeeklyCapacityHeader
          weekRange={formatWeekRange(data.weekStart, data.weekEnd)}
          daysLeftLabel={daysLeftText(data.daysLeft)}
          weekWord={targetWeekStart ? "that week" : "this week"}
          availableMinutes={summary ? summary.availableMinutes : null}
          allocatedMinutes={allocatedMinutes}
          done={data.summary.done}
          total={live.length > 0 ? data.summary.total : 0}
          percent={data.summary.percent}
          onJumpToIncomplete={jumpToIncomplete}
          action={<SmartSuggestion weekStart={viewWeekStart ?? data.weekStart} subjectNames={subjectNames} chapterNames={chapterNames} onAccept={handleWeekSuggestions} />}
        />

        {notice && (
          <p role="status" className="flex flex-wrap items-center gap-x-3 rounded-[10px] bg-[var(--success-bg)] px-3 py-2 text-[13px] font-semibold text-[var(--success)]">
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
              <p className="mt-0.5 text-[12px] text-body-text dark:text-ink/80">Carry them into this week. You&apos;ll only need to do what&apos;s left.</p>
            </div>
            <ul className="flex flex-col gap-1.5">
              {candidates.map((g) => (
                <li key={g.id} className="text-[14px] font-semibold text-ink">
                  {describeGoal(g)} <span className="font-normal text-muted">· {g.progress.current} of {g.target} done</span>
                </li>
              ))}
            </ul>
            <GhostButton data-testid="carry-over-all" className="self-start" disabled={busyId === "carry"} onClick={() => run("carry", () => carryOverGoals(), "Couldn't carry those over.")}>
              {busyId === "carry" ? "Carrying over…" : `Carry over ${candidates.length} goal${candidates.length === 1 ? "" : "s"}`}
            </GhostButton>
          </section>
        )}

        {targetWeekStart && (
          <p role="status" className="rounded-2xl border border-border-subtle bg-surface-elevated px-4 py-3 text-[14px] font-semibold leading-snug text-ink" data-testid="goals-next-week">
            Setting a goal for {weeksAhead === 1 ? `next week (${weekLabel(targetWeekStart)})` : `${targetWeekName} ${weekLabel(targetWeekStart)}`}. It&apos;s ready below. Change it if you like, then save.
          </p>
        )}

        {saveError && !saving && !panelOpen && (
          <p role="alert" className="rounded-[10px] bg-danger-bg px-3 py-2 text-xs font-medium text-danger">
            {saveError}
          </p>
        )}

        {panelOpen ? (
          <div ref={panelRef} className="flex flex-col gap-4">
            <AddGoalPanel
              key={seed ? `seed-${seed.subjectId ?? 0}` : prefill ? `prefill-${subjects.length}` : "plain"}
              subjects={subjects}
              existing={data.goals}
              saving={saving}
              error={saving ? null : saveError}
              onSave={handleSave}
              onCancel={() => {
                setPanelOpen(false);
                setSeed(null);
              }}
              defaults={defaults}
              {...(viewWeekStart ? { weekStart: viewWeekStart } : {})}
              {...(seed ? { initial: seed } : prefill ? { initial: prefill.goal, initialIsDraft: true } : {})}
            />
          </div>
        ) : (
          <div className="flex flex-wrap items-start gap-3" data-testid="add-row">
            <NewSuggestion subjects={subjects} weekStartDate={targetWeekStart} targetRank={readTargetRank()} onAdded={handleSuggestionAdded} />
            <CoralButton data-testid="open-add-goal" className="ml-auto" onClick={() => openPanel()}>
              <Plus className="size-4" aria-hidden />
              Add a goal
            </CoralButton>
          </div>
        )}

        {sections.length > 0 ? (
          <div className="flex flex-col gap-8" data-testid="goal-sections">
            {sections.map((section) => (
              <SubjectSection
                key={section.key}
                section={section}
                titleOf={titleOf}
                busyId={busyId}
                onWatched={(g, n) => run(g.id, () => reportGoalProgress(g.id, Math.max(0, n)), "Couldn't update that.")}
                onToggleDone={(g) => run(g.id, () => updateGoal(g.id, { status: g.status === "DONE" ? "ACTIVE" : "DONE" }), "Couldn't update that.")}
                onDelete={(g) => run(g.id, () => deleteGoal(g.id), "Couldn't remove that goal.")}
                onEdit={(g, patch) => run(g.id, () => updateGoal(g.id, patch), "Couldn't change that goal.")}
                onSuggest={(g) => (g.chapterId && g.type !== "HOURS" && g.source !== "PARTNER" ? () => setSuggestingId(suggestingId === g.id ? null : g.id) : undefined)}
                onAddFor={(subjectId) => openPanel({ type: "QUESTIONS", unit: "COUNT", target: 100, subjectId })}
                {...(suggestingGoal && suggestingGoal.chapterId && section.goals.some((g) => g.id === suggestingGoal.id)
                  ? {
                      suggestSlot: (
                        <SuggestPanel
                          chapterId={suggestingGoal.chapterId}
                          chapterName={chapterNames.get(suggestingGoal.chapterId) ?? "this chapter"}
                          weekStartDate={targetWeekStart}
                          targetRank={readTargetRank()}
                          onAdded={handleSuggestionAdded}
                          onClose={() => setSuggestingId(null)}
                        />
                      ),
                    }
                  : {})}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border-strong p-6 text-center" data-testid="goals-empty">
            <p className="text-[16px] font-bold text-ink">No goals yet this week</p>
            <p className="mt-1 text-[13px] text-muted">Add a few above. Until then Prepex suggests a plan from your chapter progress.</p>
          </div>
        )}

        {hasTimetable === false && (
          <section className="flex flex-col gap-2 rounded-2xl border border-border-subtle bg-surface-elevated p-4" data-testid="timetable-nudge">
            <p className="text-[15px] font-bold text-ink">Tell Prepex when you&apos;re free</p>
            <p className="text-[13px] text-muted">Add your weekly timetable and your tasks are placed in your real free slots, not guessed.</p>
            <Link href="/timetable" className="inline-flex min-h-11 items-center justify-center self-start rounded-[10px] border border-border-strong px-[18px] py-2.5 text-[14px] font-medium text-ink hover:bg-surface-elevated-2">
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
