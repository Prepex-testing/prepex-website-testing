"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { PlanExplanation } from "@/components/planner/PlanExplanation";
import { suggestionSections } from "@/components/planner/PlanSuggestions";
import { WeeklyProgressStrip } from "@/components/planner/WeeklyProgressStrip";
import type { AddTaskInput, PlanDay } from "@/lib/api/plannerV2";

const DESKTOP = "(min-width: 1024px)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(DESKTOP);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/** True from 1024px up. Rendered on the client only (the screen is behind a login), so the first paint is the phone layout. */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DESKTOP).matches,
    () => false,
  );
}

type Props = {
  day: PlanDay;
  explanation: { text: string | null; loading: boolean };
  onAdd: (input: AddTaskInput) => void;
};

function Block({ title, children, testId }: { title: string; children: ReactNode; testId: string }) {
  return (
    <section aria-label={title} data-testid={testId} className="flex flex-col gap-3 rounded-2xl border border-brand/10 bg-surface p-4">
      <h2 className="text-[14px] font-bold text-ink">{title}</h2>
      {children}
    </section>
  );
}

/**
 * Beside the plan on a wide screen: the why-this-plan note (kept in view), this week's progress, revisions due today and
 * the backlog. On a phone the same content sits below the plan as sections that open and close, and the note stays at
 * the top of the page, so nothing is shown twice.
 */
export function PlanSidePanel({ day, explanation, onAdd }: Props) {
  const desktop = useIsDesktop();
  const sections = suggestionSections(day, onAdd);

  if (desktop) {
    return (
      <aside aria-label="Beside your plan" data-testid="side-panel" className="sticky top-6 flex flex-col gap-4 self-start">
        <PlanExplanation text={explanation.text} loading={explanation.loading} />
        <WeeklyProgressStrip />
        {sections.map((s) => (
          <Block key={s.id} title={s.title} testId={`side-${s.id}`}>
            {s.body}
          </Block>
        ))}
      </aside>
    );
  }

  return (
    <div className="flex flex-col gap-3" data-testid="side-collapsibles">
      <details className="group rounded-2xl border border-brand/10 bg-surface" data-testid="collapsible-week">
        <summary className="flex min-h-12 cursor-pointer items-center px-4 text-[14px] font-bold text-ink">This week</summary>
        <div className="px-3 pb-3">
          <WeeklyProgressStrip />
        </div>
      </details>
      {sections.map((s) => (
        <details key={s.id} className="group rounded-2xl border border-brand/10 bg-surface" data-testid={`collapsible-${s.id}`}>
          <summary className="flex min-h-12 cursor-pointer items-center px-4 text-[14px] font-bold text-ink">{s.title}</summary>
          <div className="px-4 pb-4">{s.body}</div>
        </details>
      ))}
    </div>
  );
}
