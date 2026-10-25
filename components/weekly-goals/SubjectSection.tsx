"use client";

import { Plus } from "lucide-react";
import type { ReactNode } from "react";
import { GoalCard } from "@/components/weekly-goals/GoalCard";
import type { Goal } from "@/lib/api/goals";
import type { GoalSection } from "@/lib/goals/display";

type Props = {
  section: GoalSection;
  /** The title a goal card shows: its chapter, or "<Subject> general". */
  titleOf: (goal: Goal) => string;
  busyId: string | null;
  onWatched: (goal: Goal, next: number) => void;
  onToggleDone: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
  onEdit: (goal: Goal, patch: { target: number; minutesPerUnit?: number }) => void;
  /** Set when the goal has a chapter the assistant can look at. */
  onSuggest: (goal: Goal) => (() => void) | undefined;
  /** Opens the add-a-goal panel for this subject (the empty-state tile). */
  onAddFor: (subjectId: number) => void;
  /** The open Suggest panel, shown under the grid when it belongs to this section. */
  suggestSlot?: ReactNode;
};

/** One subject's goals: a coloured heading with its count, then a two-column grid of cards (one column on a phone). */
export function SubjectSection({ section, titleOf, busyId, onWatched, onToggleDone, onDelete, onEdit, onSuggest, onAddFor, suggestSlot }: Props) {
  const done = section.goals.filter((g) => g.status === "DONE" || g.progress.complete).length;
  return (
    <section aria-label={section.label} className="flex flex-col gap-3" data-testid="subject-section" data-section={section.key}>
      <div className="flex items-center gap-3">
        <span aria-hidden className="h-6 w-1 shrink-0 rounded-full" style={{ background: section.color }} />
        <h3 className="min-w-0 flex-1 truncate text-[20px] font-bold text-ink">{section.label}</h3>
        {section.goals.length > 0 && (
          <span className="rounded-full border border-border-subtle bg-surface-elevated-2 px-2.5 py-1 text-[12px] font-medium text-muted" data-testid="section-count">
            {done}/{section.goals.length} goals
          </span>
        )}
      </div>

      {section.goals.length > 0 ? (
        <ul className="grid auto-rows-fr grid-cols-1 gap-4 lg:grid-cols-2" data-testid="goal-list">
          {section.goals.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              title={titleOf(g)}
              busy={busyId === g.id}
              onWatched={(n) => onWatched(g, n)}
              onToggleDone={() => onToggleDone(g)}
              onDelete={() => onDelete(g)}
              onEdit={(patch) => onEdit(g, patch)}
              {...(onSuggest(g) ? { onSuggest: onSuggest(g)! } : {})}
            />
          ))}
        </ul>
      ) : (
        section.subjectId !== null && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2" data-testid="section-empty">
            <button
              type="button"
              data-testid="section-add"
              onClick={() => onAddFor(section.subjectId!)}
              className="flex min-h-[96px] items-center justify-center gap-2 rounded-2xl border border-dashed border-border-strong bg-transparent px-4 text-[14px] font-medium text-ink transition-colors hover:bg-surface-elevated"
            >
              <Plus className="size-4" aria-hidden />
              Add a goal for {section.label}
            </button>
          </div>
        )
      )}
      {suggestSlot}
    </section>
  );
}
