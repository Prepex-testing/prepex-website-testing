"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/layout/AuthCard";
import { ChapterPicker } from "@/components/onboarding/ChapterPicker";
import { OnboardingNav } from "@/components/onboarding/OnboardingNav";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { StepProgress } from "@/components/ui/StepProgress";
import { completeOnboarding } from "@/lib/api/onboarding";
import { ApiError } from "@/lib/api/http";
import { markOnboardingComplete } from "@/lib/auth/onboardingGate";
import { countChapters, filterSections, groupByClass, keepKnown } from "@/lib/onboarding/chapters";
import { needsSubjectPick } from "@/lib/onboarding/goal";
import { useOnboardingDraft, useStepGuard } from "@/lib/onboarding/draft-context";
import { defaultExamDateIso, displayDateToIso } from "@/lib/onboarding/draft";
import { buildCompletePayload } from "@/lib/onboarding/payload";
import { ONBOARDING_TOTAL_STEPS, stepPath } from "@/lib/onboarding/steps";
import { useStepTelemetry } from "@/lib/onboarding/useStepTelemetry";
import { useOnboardingSyllabus } from "@/lib/onboarding/useSyllabus";

const COACHING_LABEL = { COACHING: "In coaching", ONLINE_SELF_PREP: "Online courses and self-study", SELF_PREP: "Self-prep" } as const;

/**
 * Onboarding step 5 of 5. A chapter is either complete or not: one tap toggles it. Next is the only place anything
 * is sent to the server, and it sends everything from all five steps in one request.
 */
export default function WhichChaptersHaveYouStudiedPage() {
  const router = useRouter();
  const allowed = useStepGuard(5);
  const { draft, update, clearStored, setSummary } = useOnboardingDraft();
  const completeStep = useStepTelemetry(5, "chapters");
  const { data: syllabus, loading, error: loadError, retry } = useOnboardingSyllabus();
  const [query, setQuery] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sections = useMemo(() => groupByClass(syllabus?.subjects ?? []), [syllabus]);
  const visible = useMemo(() => filterSections(sections, query), [sections, query]);
  const total = useMemo(() => countChapters(sections), [sections]);
  const completed = draft.chapters.completedIds;

  // A goal that changed since the draft was saved can leave ticks for chapters that are no longer in the syllabus.
  useEffect(() => {
    if (!syllabus) return;
    const known = keepKnown(completed, syllabus.subjects);
    if (known.length !== completed.length) update((d) => ({ ...d, chapters: { completedIds: known } }));
  }, [syllabus, completed, update]);

  if (!allowed) return null;

  const setCompleted = (completedIds: string[]) => update((d) => ({ ...d, chapters: { completedIds } }));
  const searching = query.trim().length > 0;
  const noChapters = !loading && !loadError && total === 0;

  async function submit(completedIds: string[]) {
    const final = { ...draft, chapters: { completedIds } };
    const needsSubjects = draft.goal.examCode ? needsSubjectPick({ code: draft.goal.examCode, name: draft.goal.examName ?? "" }) : false;
    setError(null);
    setSubmitting(true);
    try {
      await completeOnboarding(buildCompletePayload(final, needsSubjects));
    } catch (err) {
      // 409 means the save already went through (a double tap, or another tab): carry on to the end.
      if (!(err instanceof ApiError && err.status === 409)) {
        setError(
          err instanceof ApiError && err.status >= 400 && err.status < 500
            ? err.message
            : "We couldn't save your setup. Nothing was changed, so you can try again.",
        );
        setSubmitting(false);
        return;
      }
    }

    completeStep();
    markOnboardingComplete();
    setSummary({
      examName: draft.goal.examName,
      examDateIso: displayDateToIso(draft.about.examDate) ?? defaultExamDateIso(draft.about.currentLevel),
      weeklyStudyMinutes: draft.timetable.blocks
        .filter((b) => ["SELF_STUDY", "PRACTICE", "REVISION"].includes(b.activityType))
        .reduce((sum, b) => sum + (b.endMin - b.startMin), 0),
      coachingLabel: draft.coaching.type === "COACHING" && draft.coaching.name ? draft.coaching.name : COACHING_LABEL[draft.coaching.type],
      chaptersCompleted: completedIds.length,
    });
    // The saved copy is wiped now; the screen keeps its state until the closing screen takes over.
    clearStored();
    router.push("/onboarding/analyzing");
  }

  const handleSkip = () => {
    setCompleted([]);
    void submit([]);
  };

  return (
    <AuthCard>
      <StepProgress step={5} totalSteps={ONBOARDING_TOTAL_STEPS} />

      <div className="mt-4 flex flex-col gap-3 sm:mt-5">
        <h1 className="text-[24px] font-extrabold leading-tight text-ink sm:text-[32px]">Which chapters have you finished?</h1>
        <p className="text-[14px] font-semibold leading-snug text-neutral-text sm:text-[16px]">
          Tap a chapter to mark it complete. Leave out anything you have not finished. Finished chapters go straight into your
          revision plan instead of being taught again.
        </p>
      </div>

      {error && (
        <p role="alert" data-testid="submit-error" className="mt-4 rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-col gap-3 rounded-xl border border-brand/10 bg-surface p-4 dark:border-white/10">
        <p aria-live="polite" data-testid="chapter-counter" className="text-[15px] font-bold text-ink">
          You&apos;ve marked {completed.length} of {total} chapters complete
        </p>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="chapter-search" className="text-[13px] font-bold text-body-text dark:text-ink">
            Search chapters
          </label>
          <input
            id="chapter-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try “kinematics” or “organic”"
            autoComplete="off"
            className="min-h-11 w-full rounded-lg border border-brand/20 bg-surface px-3 text-[15px] text-ink placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] dark:border-white/20"
          />
        </div>
      </div>

      <div className="mt-5">
        {loading && (
          <div className="flex items-center justify-center py-10">
            <LoadingIndicator size={40} />
          </div>
        )}
        {loadError && (
          <div role="alert" className="flex flex-col items-start gap-2 rounded-lg bg-danger-bg px-3 py-3 text-sm font-medium text-danger">
            We couldn&apos;t load your chapters.
            <button type="button" onClick={retry} className="min-h-11 rounded-lg border border-danger px-4 font-semibold">
              Try again
            </button>
          </div>
        )}
        {noChapters && (
          <p className="rounded-lg bg-tint-strong px-3 py-3 text-sm font-medium text-ink dark:bg-[#FAF7F214]">
            No chapters are set up for your exam yet. You can carry on, and add your progress later from the syllabus screen.
          </p>
        )}
        {!loading && !loadError && total > 0 && (
          <>
            {searching && visible.length === 0 ? (
              <p role="status" className="rounded-lg bg-tint-strong px-3 py-3 text-sm font-medium text-ink dark:bg-[#FAF7F214]">
                No chapter matches “{query.trim()}”.
              </p>
            ) : (
              <ChapterPicker sections={visible} completed={completed} onChange={setCompleted} expandAll={searching} />
            )}
          </>
        )}
      </div>

      <button
        type="button"
        onClick={handleSkip}
        disabled={isSubmitting}
        data-testid="skip-chapters"
        className="mt-6 min-h-12 w-full rounded-lg border-[1.5px] border-dashed border-brand/30 px-4 text-[15px] font-semibold text-ink hover:bg-tint-strong disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/30"
      >
        Skip for now — I haven&apos;t started yet
      </button>

      <OnboardingNav
        backHref={stepPath(4)}
        onNext={() => void submit(completed)}
        nextDisabled={loading}
        busy={isSubmitting}
        sticky
      />
    </AuthCard>
  );
}
