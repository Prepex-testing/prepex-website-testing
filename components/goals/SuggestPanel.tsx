"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api/http";
import { createGoalSuggestion, respondToGoalSuggestion, type GoalSuggestion } from "@/lib/api/goalSuggestions";
import { hoursText, problemOf, type SuggestionProblem } from "@/lib/goals/suggestion";
import { SuggestionCard, SuggestionError, SuggestionSkeleton } from "@/components/goals/SuggestionCard";

type Props = {
  chapterId: string;
  chapterName: string;
  /** Monday of the week the goal is for (next week's goals page); omit for this week. */
  weekStartDate?: string | undefined;
  /** The device's target rank (the auth service owns it; the AI gets it from here). */
  targetRank?: number | null | undefined;
  /** A goal was created from the suggestion: reload the list. */
  onAdded: (message: string) => void;
  /** The student is done with the panel (dismissed, closed, or finished). */
  onClose: () => void;
};

type Phase = { name: "loading" } | { name: "ready"; suggestion: GoalSuggestion } | { name: "problem"; problem: SuggestionProblem };

/**
 * The whole ✨ Suggest flow for one chapter, inline: it asks as soon as it appears (skeleton while the Brain thinks),
 * then shows the suggestion with Accept / Modify / Dismiss. Nothing is made up when the Brain is away: "AI is resting".
 */
export function SuggestPanel({ chapterId, chapterName, weekStartDate, targetRank, onAdded, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>({ name: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [respondError, setRespondError] = useState<string | null>(null);

  // One request per attempt, even when React runs this effect twice (StrictMode in development, or a quick remount):
  // every request spends one of the student's ten an hour, so the second run re-uses the first one's promise.
  const request = useRef<{ attempt: number; promise: ReturnType<typeof createGoalSuggestion> } | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (request.current?.attempt !== attempt) {
      request.current = {
        attempt,
        promise: createGoalSuggestion({
          chapterId,
          ...(weekStartDate ? { weekStartDate } : {}),
          ...(targetRank ? { targetRank } : {}),
        }),
      };
    }
    request.current.promise.then(
      (res) => {
        if (!cancelled) setPhase({ name: "ready", suggestion: res.data.suggestion });
      },
      (err: unknown) => {
        if (!cancelled) setPhase({ name: "problem", problem: problemOf(err) });
      },
    );
    return () => {
      cancelled = true;
    };
    // `attempt` re-asks after "Try again"; the other inputs are fixed for the life of the panel
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  function retry() {
    setPhase({ name: "loading" });
    setAttempt((n) => n + 1);
  }

  async function respond(suggestion: GoalSuggestion, response: Parameters<typeof respondToGoalSuggestion>[1], done: string) {
    setBusy(true);
    setRespondError(null);
    try {
      await respondToGoalSuggestion(suggestion.id, response);
      onAdded(done);
      onClose();
    } catch (err) {
      setRespondError(err instanceof ApiError ? err.message : "Couldn't save that. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (phase.name === "loading") return <SuggestionSkeleton chapterName={chapterName} />;
  if (phase.name === "problem") return <SuggestionError problem={phase.problem} onRetry={retry} onClose={onClose} />;

  const { suggestion } = phase;
  return (
    <SuggestionCard
      suggestion={suggestion}
      busy={busy}
      error={respondError}
      onAccept={() => respond(suggestion, { status: "accepted" }, `Added: ${hoursText(suggestion.suggestedHours)} on ${suggestion.chapterName} this week.`)}
      onModify={(hours) => respond(suggestion, { status: "modified", modifiedPayload: { hours } }, `Added: ${hoursText(hours)} on ${suggestion.chapterName} this week.`)}
      onDismiss={() => {
        // a dismissal is recorded, but never holds the student up: close at once and let the request finish on its own
        void respondToGoalSuggestion(suggestion.id, { status: "dismissed" }).catch(() => undefined);
        onClose();
      }}
    />
  );
}
