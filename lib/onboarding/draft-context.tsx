"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getStoredUser } from "@/lib/auth/session";
import { getOnboardingProgress } from "@/lib/api/onboarding";
import {
  clearDraft,
  emptyDraft,
  firstIncompleteStep,
  isoToDisplayDate,
  loadDraft,
  saveDraft,
  type OnboardingDraft,
} from "@/lib/onboarding/draft";
import { needsSubjectPick } from "@/lib/onboarding/goal";
import { stepPath } from "@/lib/onboarding/steps";

/** What the closing screen shows once the single save has gone through (kept in memory only). */
export type OnboardingSummary = {
  examName: string | null;
  examDateIso: string | null;
  weeklyStudyMinutes: number;
  coachingLabel: string | null;
  chaptersCompleted: number;
};

type DraftContextValue = {
  draft: OnboardingDraft;
  /** False until the saved draft has been read; screens render nothing student-specific before then. */
  ready: boolean;
  update: (updater: (draft: OnboardingDraft) => OnboardingDraft) => void;
  /** Forgets everything. */
  reset: () => void;
  /** Wipes the saved copy but keeps the screen as it is — for the moment the final save succeeds, while the page is still showing. */
  clearStored: () => void;
  summary: OnboardingSummary | null;
  setSummary: (summary: OnboardingSummary | null) => void;
};

const DraftContext = createContext<DraftContextValue | null>(null);

const SAVE_DELAY_MS = 250;

export function OnboardingDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<OnboardingDraft>(emptyDraft);
  const [ready, setReady] = useState(false);
  const [summary, setSummary] = useState<OnboardingSummary | null>(null);
  const userIdRef = useRef<string | null>(null);
  const latest = useRef(draft);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Read the saved draft once, after mount (localStorage does not exist on the server, so this cannot be initial state).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const user = getStoredUser();
    userIdRef.current = user?.id ?? null;
    const saved = user ? loadDraft(user.id) : null;
    const start = saved ?? { ...emptyDraft(), about: { ...emptyDraft().about, fullName: user?.fullName ?? "" } };
    latest.current = start;
    setDraft(start);
    setReady(true);

    // A student who got partway through the old flow already has some answers on the server: start from those.
    if (!saved) {
      let cancelled = false;
      getOnboardingProgress()
        .then(({ data }) => {
          const profile = data.profile;
          if (cancelled || !profile || dirty.current) return;
          setDraft((current) => {
            const next: OnboardingDraft = {
              ...current,
              goal: profile.exam
                ? { ...current.goal, examId: profile.examId, examCode: profile.exam.code, examName: profile.exam.name }
                : current.goal,
              about: {
                ...current.about,
                city: profile.city ?? current.about.city,
                phoneNumber: profile.phoneNumber ?? current.about.phoneNumber,
                examDate: profile.targetExamDate ? isoToDisplayDate(profile.targetExamDate) : current.about.examDate,
                currentLevel: profile.currentLevel ?? current.about.currentLevel,
              },
              coaching: profile.coachingType
                ? { ...current.coaching, type: profile.coachingType, name: profile.coachingName ?? "", batch: profile.batchName ?? "" }
                : current.coaching,
            };
            latest.current = next;
            return next;
          });
        })
        .catch(() => {
          // Best-effort: a blank start is fine.
        });
      return () => {
        cancelled = true;
      };
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (dirty.current && userIdRef.current) {
      saveDraft(userIdRef.current, latest.current);
      dirty.current = false;
    }
  }, []);

  // Save on every change (debounced a touch so a drag does not rewrite storage on every pixel), and make sure
  // nothing is lost if the tab is closed or backgrounded in that window.
  useEffect(() => {
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flush);
      flush();
    };
  }, [flush]);

  const update = useCallback(
    (updater: (draft: OnboardingDraft) => OnboardingDraft) => {
      const next = updater(latest.current);
      latest.current = next;
      dirty.current = true;
      setDraft(next);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, SAVE_DELAY_MS);
    },
    [flush],
  );

  const clearStored = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    dirty.current = false;
    if (userIdRef.current) clearDraft(userIdRef.current);
  }, []);

  const reset = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    dirty.current = false;
    if (userIdRef.current) clearDraft(userIdRef.current);
    latest.current = emptyDraft();
    setDraft(latest.current);
  }, []);

  const value = useMemo(() => ({ draft, ready, update, reset, clearStored, summary, setSummary }), [draft, ready, update, reset, clearStored, summary]);
  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>;
}

export function useOnboardingDraft(): DraftContextValue {
  const ctx = useContext(DraftContext);
  if (!ctx) throw new Error("useOnboardingDraft must be used within OnboardingDraftProvider");
  return ctx;
}

/**
 * Keeps a screen from being opened before the ones in front of it are answered (a bookmark, a stale tab, a
 * cleared draft): the student is sent to the first step still missing something. Returns true once the screen
 * may render.
 */
export function useStepGuard(step: number): boolean {
  const router = useRouter();
  const { draft, ready } = useOnboardingDraft();
  const needsSubjects = draft.goal.examCode ? needsSubjectPick({ code: draft.goal.examCode, name: draft.goal.examName ?? "" }) : false;
  const missing = ready ? firstIncompleteStep(draft, needsSubjects) : step;
  const blocked = ready && missing < step;

  useEffect(() => {
    if (blocked) router.replace(stepPath(missing));
  }, [blocked, missing, router]);

  return ready && !blocked;
}
