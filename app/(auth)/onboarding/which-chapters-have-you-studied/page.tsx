"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/layout/AuthCard";
import { Accordion } from "@/components/ui/Accordion";
import { Button } from "@/components/ui/Button";
import { ChapterItem } from "@/components/ui/ChapterItem";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { StepProgress } from "@/components/ui/StepProgress";
import { CheckIcon, XIcon } from "@/components/ui/icons";
import { getOnboardingProgress, getStudentChapters, saveChapterProgress } from "@/lib/api/onboarding";
import { ApiError } from "@/lib/api/http";
import type { SubjectChapters } from "@/lib/api/dashboard";

type ChapterState = "none" | "partial" | "done";

function cycleState(state: ChapterState): ChapterState {
  if (state === "none") return "partial";
  if (state === "partial") return "done";
  return "none";
}

function stateFromStatus(status: "NOT_STARTED" | "LEARNING" | "IN_REVISION" | "MASTERED"): ChapterState {
  // A fully-studied chapter persists as IN_REVISION (legacy rows may still
  // be MASTERED) — either way it reloads as "done". A partially-studied one
  // persists as LEARNING and reloads as "partial". Everything else is "none".
  if (status === "MASTERED" || status === "IN_REVISION") return "done";
  if (status === "LEARNING") return "partial";
  return "none";
}

// chapterState → the status saved for it in the /step5 payload.
const STATUS_BY_STATE: Record<ChapterState, "NOT_STARTED" | "LEARNING" | "IN_REVISION"> = {
  none: "NOT_STARTED",
  partial: "LEARNING",
  done: "IN_REVISION",
};

export default function WhichChaptersHaveYouStudiedPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<SubjectChapters[]>([]);
  const [chapterState, setChapterState] = useState<Record<string, ChapterState>>({});
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const [isSkipping, setSkipping] = useState(false);

  useEffect(() => {
    Promise.all([getStudentChapters(), getOnboardingProgress().catch(() => null)])
      .then(([{ data }, progress]) => {
        const withChapters = data.filter((subject) => subject.chapters.length > 0);
        setSubjects(withChapters);

        const savedStatusById = new Map<string, "NOT_STARTED" | "LEARNING" | "IN_REVISION" | "MASTERED">();
        for (const subject of progress?.data.subjects ?? []) {
          for (const chapter of subject.chapters) {
            savedStatusById.set(chapter.id, chapter.status);
          }
        }

        const initial: Record<string, ChapterState> = {};
        for (const subject of withChapters) {
          for (const chapter of subject.chapters) {
            const savedStatus = savedStatusById.get(chapter.id);
            initial[chapter.id] = savedStatus ? stateFromStatus(savedStatus) : "none";
          }
        }
        setChapterState(initial);
      })
      .catch(() => setError("Couldn't load chapters. Please refresh and try again."))
      .finally(() => setLoading(false));
  }, []);

  const { markedCount, partialCount, allMarked } = useMemo(() => {
    const values = Object.values(chapterState);
    return {
      markedCount: values.filter((value) => value !== "none").length,
      partialCount: values.filter((value) => value === "partial").length,
      allMarked: values.length > 0 && values.every((value) => value !== "none"),
    };
  }, [chapterState]);

  const toggleChapter = (key: string) => {
    setChapterState((current) => ({ ...current, [key]: cycleState(current[key]) }));
  };

  const markAll = () => {
    setChapterState((current) => {
      const next = { ...current };
      for (const key of Object.keys(next)) next[key] = "done";
      return next;
    });
  };

  const clearAll = () => {
    setChapterState((current) => {
      const next = { ...current };
      for (const key of Object.keys(next)) next[key] = "none";
      return next;
    });
  };

  const toggleMarkAll = () => {
    if (allMarked) {
      clearAll();
    } else {
      markAll();
    }
  };

  const handleContinue = async () => {
    // Every chapter is sent, mapped from its local state: done → IN_REVISION,
    // partial → LEARNING, unmarked → NOT_STARTED.
    const chapterProgress = subjects.flatMap((subject) =>
      subject.chapters.map((chapter) => ({
        chapterId: chapter.id,
        status: STATUS_BY_STATE[chapterState[chapter.id] ?? "none"],
      })),
    );

    if (chapterProgress.length === 0) {
      router.push("/onboarding/analyzing");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await saveChapterProgress({ chapterProgress });
      router.push("/onboarding/analyzing");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Something went wrong. Please try again.",
      );
      setSubmitting(false);
    }
  };

  const handleSkip = async () => {
    setError(null);
    setSkipping(true);
    try {
      const chapterProgress = subjects.flatMap((subject) =>
        subject.chapters.map((chapter) => ({
          chapterId: chapter.id,
          status: "NOT_STARTED" as const,
        })),
      );
      if (chapterProgress.length > 0) {
        await saveChapterProgress({ chapterProgress });
      }
      router.push("/onboarding/analyzing");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Something went wrong. Please try again.",
      );
      setSkipping(false);
    }
  };

  return (
    <AuthCard>
      <StepProgress
        step={5}
        totalSteps={5}
        backHref="/onboarding/time-selection"
        showSkip
        onSkip={handleSkip}
        skipDisabled={isSubmitting || isSkipping || isLoading}
      />

      <div className="mt-4 flex flex-col gap-4 sm:mt-5">
        <h1 className="text-[24px] font-extrabold leading-[100%] text-ink sm:text-[32px]">
          Which chapters have you studied?
        </h1>
        <p className="text-[14px] font-semibold leading-[100%] text-muted sm:text-[16px]">
          Tap to mark studied. Skip what you haven&apos;t touched. Even partial study
          counts
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger"
        >
          {error}
        </p>
      )}

      <div className="mt-6 rounded-xl border border-brand/10 bg-surface p-4 dark:border-white/10">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="whitespace-nowrap rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-surface dark:text-[#111145] sm:px-4 sm:text-sm">
              {markedCount - partialCount} chapter
              {markedCount - partialCount !== 1 ? "s" : ""} marked as complete
            </span>

            <span className="whitespace-nowrap rounded-lg border border-ink bg-surface px-3 py-2 text-xs font-semibold text-ink sm:px-4 sm:text-sm">
              {partialCount} chapter
              {partialCount !== 1 ? "s" : ""} marked as partial
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-4">
            <button
              type="button"
              onClick={toggleMarkAll}
              aria-pressed={allMarked}
              className="flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-ink dark:text-muted"
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${allMarked
                  ? "border-brand bg-brand text-white"
                  : "border-brand/25 text-transparent dark:border-white/25"
                  }`}
              >
                <CheckIcon className="h-2.5 w-2.5" />
              </span>
              Mark all
            </button>

            <button
              type="button"
              onClick={clearAll}
              className="flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-ink dark:text-muted"
            >
              <XIcon />
              Clear
            </button>
          </div>
        </div>

        <p className="mt-4 text-sm text-muted">
          Marked chapters skip new learning and go to revision rotation.
          Unmarked chapters will be taught as new. Tap once to set a
          chapter as Partially Selected; tap again to mark it Done.
        </p>
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:mt-6">
        {isLoading && (
          <div className="flex items-center justify-center py-10">
            <LoadingIndicator size={40} />
          </div>
        )}
        {!isLoading &&
          subjects.map((subject, index) => {
            const selectedCount = subject.chapters.filter(
              (chapter) => chapterState[chapter.id] !== "none",
            ).length;

            return (
              <Accordion
                key={subject.subjectId}
                avatarLabel={subject.subjectName.charAt(0)}
                title={subject.subjectName}
                meta={`${String(selectedCount).padStart(2, "0")}/${subject.chapters.length} CHAPTERS SELECTED`}
                defaultOpen={index === 0}
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {subject.chapters.map((chapter) => (
                    <ChapterItem
                      key={chapter.id}
                      title={chapter.name}
                      state={chapterState[chapter.id] ?? "none"}
                      onCycle={() => toggleChapter(chapter.id)}
                    />
                  ))}
                </div>
              </Accordion>
            );
          })}
      </div>

      <Button
        variant="primary"
        onClick={handleContinue}
        disabled={isSubmitting || isSkipping}
        className="mt-6 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Saving..." : "Skip & Continue"}
      </Button>
    </AuthCard>
  );
}
