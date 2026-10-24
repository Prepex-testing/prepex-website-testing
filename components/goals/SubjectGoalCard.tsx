"use client";

import { Plus, X } from "lucide-react";
import type { Goal, GoalType, NewGoal } from "@/lib/api/goals";
import type { GoalDefaults } from "@/lib/api/plannerV2";
import { progressText } from "@/lib/goals/format";
import { startFocusSession } from "@/lib/focus/startFocusSession";
import { chipLabel, goalFocusIntent, goalMinutes, labelOf, MOCK_TYPES, taskName } from "@/lib/goals/v2";
import { formatDuration, subjectStyle } from "@/lib/planner/format";
import type { FormKind, FormSubject } from "@/components/goals/GoalFormSheet";

export type Draft = NewGoal & { draftId: string };

type Section = { kind: FormKind; title: string; add: string; types: GoalType[] };

const SECTIONS: Section[] = [
  { kind: "LECTURES", title: "Lectures to watch", add: "Add lecture", types: ["LECTURES"] },
  { kind: "SELF_STUDY", title: "Chapters to cover (self-study)", add: "Add study time", types: ["HOURS"] },
  { kind: "QUESTIONS", title: "Questions to solve", add: "Add practice goal", types: ["QUESTIONS"] },
  { kind: "REVISIONS", title: "Revision", add: "Add revision", types: ["REVISIONS"] },
  { kind: "BACKLOG", title: "Backlog to clear", add: "Add backlog clear", types: ["BACKLOG"] },
];

type Props = {
  subject: FormSubject;
  goals: Goal[];
  drafts: Draft[];
  defaults: GoalDefaults | null;
  busyId: string | null;
  onAdd: (kind: FormKind) => void;
  onEdit: (goal: Goal) => void;
  onRemoveDraft: (draftId: string) => void;
  onWatched: (goal: Goal, next: number) => void;
  /** ✨ Suggest on a chapter goal (the goal assistant owns the panel; this only toggles it). */
  onSuggest?: (goal: Goal) => void;
  suggestingId?: string | null;
  renderSuggest?: (goal: Goal) => React.ReactNode;
};

function Chip({ label, saved, goal, onOpen, onRemove, children }: { label: string; saved: boolean; goal?: Goal; onOpen?: () => void; onRemove?: () => void; children?: React.ReactNode }) {
  const done = goal?.status === "DONE";
  return (
    <li className="flex flex-col gap-1.5" data-testid={saved ? "goal-chip" : "draft-chip"} data-goal-type={goal?.type}>
      <div className="flex items-stretch gap-1.5">
        {saved ? (
          <button
            type="button"
            onClick={onOpen}
            aria-label={`Edit: ${label}`}
            className={`min-h-11 min-w-0 flex-1 rounded-xl border px-3 py-2 text-left text-[14px] font-semibold text-ink transition-colors hover:bg-tint-strong ${done ? "border-[var(--success)]/40 bg-[var(--success-bg)]" : "border-brand/20 bg-surface"}`}
          >
            <span className="block break-words">{label}</span>
          </button>
        ) : (
          <>
            <span className="flex min-h-11 min-w-0 flex-1 items-center rounded-xl border border-dashed border-brand/40 bg-tint-strong px-3 py-2 text-[14px] font-semibold text-ink dark:bg-[#FAF7F214]">
              <span className="break-words">{label}</span>
              <span className="ml-2 shrink-0 rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-bold text-muted">Not saved</span>
            </span>
            <button type="button" aria-label={`Remove: ${label}`} onClick={onRemove} className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-brand/20 text-muted hover:bg-tint-strong">
              <X className="size-4" aria-hidden />
            </button>
          </>
        )}
      </div>
      {children}
    </li>
  );
}

/** One subject's goals: five sections you can add to, each goal shown as a "{task} — X min" chip. */
export function SubjectGoalCard({ subject, goals, drafts, defaults, busyId, onAdd, onEdit, onRemoveDraft, onWatched, onSuggest, suggestingId, renderSuggest }: Props) {
  const style = subjectStyle(subject.name.toLowerCase().includes("math") ? "maths" : subject.name.toLowerCase());
  const total = goals.reduce((s, g) => s + goalMinutes(g, defaults ?? undefined), 0) + drafts.reduce((s, g) => s + goalMinutes(g, defaults ?? undefined), 0);

  return (
    <section aria-label={`${subject.name} goals`} data-testid="subject-card" data-subject={subject.name} className="flex flex-col gap-4 rounded-2xl border border-brand/10 bg-surface p-4">
      <header className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[18px] font-extrabold text-ink">
          <span aria-hidden className="size-3 rounded-full" style={{ background: style.color }} />
          {subject.name}
        </h2>
        <span className="text-[13px] font-semibold text-muted" data-testid="subject-total">
          {total > 0 ? formatDuration(total) : "Nothing yet"}
        </span>
      </header>

      {SECTIONS.map((section) => {
        const saved = goals.filter((g) => section.types.includes(g.type));
        const unsaved = drafts.filter((g) => section.types.includes(g.type));
        return (
          <div key={section.kind} className="flex flex-col gap-2" data-testid={`section-${section.kind}`}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[14px] font-bold text-body-text dark:text-ink">{section.title}</h3>
              <button
                type="button"
                data-testid={`add-${section.kind}`}
                onClick={() => onAdd(section.kind)}
                className="flex min-h-11 items-center gap-1 rounded-lg border border-brand/20 px-3 text-[13px] font-semibold text-ink hover:bg-tint-strong"
              >
                <Plus className="size-4" aria-hidden />
                {section.add}
              </button>
            </div>
            {saved.length + unsaved.length > 0 && (
              <ul className="flex flex-col gap-2">
                {saved.map((g) => (
                  <Chip key={g.id} saved goal={g} label={chipLabel(taskName(g) + (g.chapterId ? chapterSuffix(subject, g.chapterId) : ""), goalMinutes(g, defaults ?? undefined))} onOpen={() => onEdit(g)}>
                    <div className="flex flex-wrap items-center gap-2 px-1">
                      <span className="text-[12px] text-muted" data-testid="chip-progress">
                        {g.status === "DONE" ? "Done" : `${progressText(g)} · ${g.progress.percent}%`}
                      </span>
                      {g.type === "LECTURES" && (
                        <button
                          type="button"
                          data-testid="lecture-plus"
                          aria-label={`One more lecture watched: ${taskName(g)}`}
                          disabled={busyId === g.id}
                          onClick={() => onWatched(g, g.progressSelfReport + 1)}
                          className="min-h-9 rounded-lg border border-brand/20 bg-tint-strong px-3 text-[12px] font-bold text-ink disabled:opacity-40 dark:bg-[#FAF7F214]"
                        >
                          + Watched one
                        </button>
                      )}
                      {g.status === "ACTIVE" && (
                        <button
                          type="button"
                          data-testid="goal-start-now"
                          disabled={busyId === g.id}
                          onClick={() => startFocusSession(goalFocusIntent(g))}
                          className="min-h-9 rounded-full border border-primary-button-border bg-cta px-3 text-[12px] font-bold text-white hover:bg-[#E8623F] disabled:opacity-50"
                        >
                          Start now
                        </button>
                      )}
                      {onSuggest && g.chapterId && g.type !== "HOURS" && g.source !== "PARTNER" && (
                        <button
                          type="button"
                          data-testid="goal-suggest"
                          disabled={busyId === g.id}
                          onClick={() => onSuggest(g)}
                          className="min-h-9 rounded-lg border border-brand/20 px-3 text-[12px] font-semibold text-ink hover:bg-tint-strong disabled:opacity-50"
                        >
                          ✨ Suggest
                        </button>
                      )}
                    </div>
                    {suggestingId === g.id && renderSuggest?.(g)}
                  </Chip>
                ))}
                {unsaved.map((g) => (
                  <Chip key={g.draftId} saved={false} label={chipLabel(taskName(g) + (g.chapterId ? chapterSuffix(subject, g.chapterId) : ""), goalMinutes(g, defaults ?? undefined))} onRemove={() => onRemoveDraft(g.draftId)} />
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </section>
  );
}

function chapterSuffix(subject: FormSubject, chapterId: string): string {
  const name = subject.chapters.find((c) => c.id === chapterId)?.name;
  return name ? `, ${name}` : "";
}

/** Mocks and tests are not tied to one subject, so they have a card of their own. */
export function MockGoalCard({ goals, drafts, defaults, onAdd, onEdit, onRemoveDraft }: { goals: Goal[]; drafts: Draft[]; defaults: GoalDefaults | null; onAdd: () => void; onEdit: (goal: Goal) => void; onRemoveDraft: (draftId: string) => void }) {
  const describe = (g: NewGoal | Goal) => {
    const when = g.fixedDate ? ` · ${new Date(`${g.fixedDate}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" })}${g.fixedStartTime ? ` ${g.fixedStartTime}` : ""}` : "";
    return chipLabel(`${labelOf(MOCK_TYPES, g.mockType) ?? "Mock"}${when}`, goalMinutes(g, defaults ?? undefined));
  };
  return (
    <section aria-label="Mocks and tests" data-testid="mock-card" className="flex flex-col gap-3 rounded-2xl border border-brand/10 bg-surface p-4">
      <header className="flex items-center justify-between gap-2">
        <h2 className="text-[18px] font-extrabold text-ink">Mocks and tests</h2>
        <button type="button" data-testid="add-MOCKS" onClick={onAdd} className="flex min-h-11 items-center gap-1 rounded-lg border border-brand/20 px-3 text-[13px] font-semibold text-ink hover:bg-tint-strong">
          <Plus className="size-4" aria-hidden />
          Add mock
        </button>
      </header>
      <p className="text-[12px] text-muted">A mock gets a fixed day and time. The planner never moves it or makes it shorter.</p>
      {goals.length + drafts.length > 0 && (
        <ul className="flex flex-col gap-2">
          {goals.map((g) => (
            <Chip key={g.id} saved goal={g} label={describe(g)} onOpen={() => onEdit(g)}>
              <span className="px-1 text-[12px] text-muted">{g.status === "DONE" ? "Done" : `${progressText(g)}`}</span>
            </Chip>
          ))}
          {drafts.map((g) => (
            <Chip key={g.draftId} saved={false} label={describe(g)} onRemove={() => onRemoveDraft(g.draftId)} />
          ))}
        </ul>
      )}
    </section>
  );
}
