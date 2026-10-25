"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { MOODS } from "@/components/check-in/moods";
import { apiValueToMoodId, getCheckInStatus } from "@/lib/api/checkin";
import { ApiError } from "@/lib/api/http";
import { getPlanExplanation, type PlanDay } from "@/lib/api/plannerV2";
import { getTop5WeakTopics } from "@/lib/api/weakness";
import { explainPlan } from "@/lib/planner/taskText";

/** Once the backend answers 404 for the explanation it is not asked again for the rest of the visit. */
let explainMissing = false;

/** Resets the remembered 404. Tests only. */
export function resetExplainMemory(): void {
  explainMissing = false;
}

/**
 * The "why this plan" text: the backend's own explanation when it has one, otherwise a sentence built from the plan,
 * today's check-in and the weakest chapter in the plan. Called once per screen and handed to every PlanExplanation on it.
 */
export function usePlanExplanation(day: PlanDay | null): { text: string | null; loading: boolean } {
  const [server, setServer] = useState<string | null>(null);
  const [energyLabel, setEnergyLabel] = useState<string | null>(null);
  const [weakByChapter, setWeakByChapter] = useState<Map<string, string> | null>(null);
  const planId = day?.plan?.id ?? null;

  useEffect(() => {
    if (!planId) return;
    let live = true;
    if (!explainMissing) {
      getPlanExplanation().then(
        (res) => live && setServer(res.data.text),
        (err: unknown) => {
          if (err instanceof ApiError && err.status === 404) explainMissing = true;
        },
      );
    }
    getCheckInStatus().then(
      (res) => {
        const mood = res.data.checkin?.mood;
        if (live && mood) setEnergyLabel(MOODS.find((m) => m.id === apiValueToMoodId(mood))?.label ?? null);
      },
      () => undefined,
    );
    getTop5WeakTopics().then(
      (res) => live && setWeakByChapter(new Map(res.topics.map((t) => [t.chapterId, t.chapter?.name ?? ""]))),
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [planId]);

  const text = useMemo(() => {
    if (!day) return null;
    if (server) return server;
    const chapterIds = day.tasks.filter((t) => t.status !== "skipped" && t.status !== "rolled_over").map((t) => t.chapterId);
    const weakChapter = weakByChapter ? ([...weakByChapter.entries()].find(([id, name]) => name && chapterIds.includes(id))?.[1] ?? null) : null;
    return explainPlan(day, { energyLabel, weakChapter });
  }, [day, server, energyLabel, weakByChapter]);

  return { text, loading: day === null };
}

/** A compact card above the plan: a bold first line and two lines of why. Read-only. */
export function PlanExplanation({ text, loading, narrow = false }: { text: string | null; loading?: boolean; /** In a narrow column (the side panel) there is room for four lines, so a sentence is never cut mid-way. */ narrow?: boolean }) {
  if (loading || !text) return <div className="h-[72px] animate-pulse rounded-2xl bg-tint-strong dark:bg-[#FAF7F214]" aria-hidden data-testid="plan-explanation-loading" />;
  return (
    <section aria-label="Why this plan" data-testid="plan-explanation" className="flex items-start gap-3 rounded-2xl bg-warning-bg px-4 py-3.5">
      <Sparkles className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
      <div className="min-w-0">
        <p className="text-[14px] font-bold text-ink">Plan for today</p>
        <p data-testid="plan-explanation-text" className={`${narrow ? "line-clamp-4" : "line-clamp-3 sm:line-clamp-2"} max-w-[90ch] text-[13px] leading-snug text-body-text dark:text-ink/85`}>
          {text}
        </p>
      </div>
    </section>
  );
}
