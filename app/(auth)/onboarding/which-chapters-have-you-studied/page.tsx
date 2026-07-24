"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/layout/AuthCard";
import { Accordion } from "@/components/ui/Accordion";
import { Button } from "@/components/ui/Button";
import { ChapterItem } from "@/components/ui/ChapterItem";
import { StepProgress } from "@/components/ui/StepProgress";
import { CheckCircleIcon, XIcon } from "@/components/ui/icons";
import { getStudentChapters, saveChapterProgress } from "@/lib/api/onboarding";
import { ApiError } from "@/lib/api/http";
import type { SubjectChapters } from "@/lib/api/dashboard";

type ChapterState = "none" | "partial" | "done";

function cycleState(state: ChapterState): ChapterState {
  if (state === "none") return "partial";
  if (state === "partial") return "done";
  return "none";
}

export default function WhichChaptersHaveYouStudiedPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<SubjectChapters[]>([]);
  const [chapterState, setChapterState] = useState<Record<string, ChapterState>>({});
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  useEffect(() => {
    getStudentChapters()
      .then(({ data }) => {
        const withChapters = data.filter((subject) => subject.chapters.length > 0);
        setSubjects(withChapters);
        const initial: Record<string, ChapterState> = {};
        for (const subject of withChapters) {
          for (const chapter of subject.chapters) initial[chapter.id] = "none";
        }
        setChapterState(initial);
      })
      .catch(() => setError("Couldn't load chapters. Please refresh and try again."))
      .finally(() => setLoading(false));
  }, []);

  const { markedCount, partialCount } = useMemo(() => {
    const values = Object.values(chapterState);
    return {
      markedCount: values.filter((value) => value !== "none").length,
      partialCount: values.filter((value) => value === "partial").length,
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

  const handleContinue = async () => {
    const chapterProgress = Object.entries(chapterState)
      .filter(([, state]) => state !== "none")
      .map(([chapterId, state]) => ({
        chapterId,
        status: (state === "done" ? "MASTERED" : "IN_REVISION") as "MASTERED" | "IN_REVISION",
      }));

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

  return (
    <AuthCard>
      <StepProgress
        step={5}
        totalSteps={5}
        backHref="/onboarding/time-selection"
        showSkip
        skipHref="/onboarding/analyzing"
      />

      <div className="mt-4 flex flex-col gap-1">
        <h1 className="text-h1 text-ink">Which chapters have you studied?</h1>
        <p className="text-sm text-muted">
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

      <div className="mt-6 rounded-xl border border-brand/10 bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="whitespace-nowrap rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white sm:px-4 sm:text-sm">
              {markedCount - partialCount} chapter
              {markedCount - partialCount !== 1 ? "s" : ""} marked as complete
            </span>

            <span className="whitespace-nowrap rounded-lg border border-brand bg-white px-3 py-2 text-xs font-semibold text-brand sm:px-4 sm:text-sm">
              {partialCount} chapter
              {partialCount !== 1 ? "s" : ""} marked as partial
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-4">
            <button
              type="button"
              onClick={markAll}
              className="flex items-center gap-1.5 whitespace-nowrap text-sm text-ink"
            >
              <CheckCircleIcon />
              Mark all
            </button>

            <button
              type="button"
              onClick={clearAll}
              className="flex items-center gap-1.5 whitespace-nowrap text-sm text-ink"
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

      <div className="mt-4 flex flex-col gap-3">
        {isLoading && <p className="text-sm text-muted">Loading chapters...</p>}
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
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
        disabled={isSubmitting}
        className="mt-6 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Saving..." : "Skip & Continue"}
      </Button>
    </AuthCard>
  );
}
