"use client";

import { useCallback, useEffect, useState } from "react";
import { getOnboardingChapters, type OnboardingSyllabus } from "@/lib/api/onboarding";
import { useOnboardingDraft } from "@/lib/onboarding/draft-context";

// The syllabus for a goal does not depend on the student, so it is kept for the life of the page: the timetable
// step needs the subject names and the chapter step needs the chapters, and both ask for the same thing.
const cache = new Map<string, OnboardingSyllabus>();

const keyFor = (examId: string, subjectIds: number[]) => `${examId}|${[...subjectIds].sort((a, b) => a - b).join(",")}`;

/** The Class 11 + 12 chapters (and subjects) for the goal in the draft, fetched once. */
export function useOnboardingSyllabus() {
  const { draft, ready } = useOnboardingDraft();
  const { examId, subjectIds } = draft.goal;
  const key = examId ? keyFor(examId, subjectIds) : null;
  const [loaded, setLoaded] = useState<{ key: string; data: OnboardingSyllabus } | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!ready || !key || !examId || cache.has(key)) return;
    let cancelled = false;
    getOnboardingChapters({ examId, subjectIds })
      .then(({ data }) => {
        cache.set(key, data);
        if (!cancelled) setLoaded({ key, data });
      })
      .catch(() => {
        if (!cancelled) setFailedKey(key);
      });
    return () => {
      cancelled = true;
    };
    // subjectIds is folded into `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, key, examId, attempt]);

  const retry = useCallback(() => {
    setFailedKey(null);
    setAttempt((n) => n + 1);
  }, []);

  const data = key ? (cache.get(key) ?? (loaded?.key === key ? loaded.data : null)) : null;
  return { data, loading: ready && Boolean(key) && !data && failedKey !== key, error: Boolean(key) && !data && failedKey === key, retry };
}
