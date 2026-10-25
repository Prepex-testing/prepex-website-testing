"use client";

import { useCallback, useEffect, useState } from "react";
import { Sheet } from "@/components/planner/Sheet";
import { ApiError } from "@/lib/api/http";
import { suggestWeek, type Proposal, type WeekSuggestion } from "@/lib/api/plannerV2";
import { proposalToGoal } from "@/lib/goals/v2";
import type { NewGoal } from "@/lib/api/goals";
import { formatDuration, subjectStyle } from "@/lib/planner/format";
import { trackPlanner } from "@/lib/telemetry/planner";

type Decision = "pending" | "accepted" | "rejected";

type Props = {
  open: boolean;
  onClose: () => void;
  weekStart: string;
  subjectNames: Map<number, string>;
  chapterNames: Map<string, string>;
  /** Goals the student accepted. They land on the screen as not-yet-saved chips. */
  onAccept: (goals: NewGoal[]) => void;
};

const SOURCE_LABEL: Record<Proposal["source"], string> = {
  mock: "Mock",
  spaced_repetition: "Due for revision",
  weakness: "Weak area",
  backlog: "Backlog",
  pace: "Keeping pace",
  balance: "Balance",
};

/**
 * "Suggest this week's goals for me". The server builds proposals from the last two weeks of logs, weak chapters,
 * the revision queue, the backlog, the student's exams and the timetable's hours. Every proposal can be added or skipped
 * on its own, or all at once.
 */
export function WeekSuggestSheet({ open, onClose, weekStart, subjectNames, chapterNames, onAccept }: Props) {
  const [data, setData] = useState<WeekSuggestion | null>(null);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setData(null);
    setDecisions({});
    try {
      const res = await suggestWeek(weekStart);
      setData(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "We couldn't build suggestions right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- builds the suggestions each time the sheet opens
    if (open) void load();
  }, [open, load]);

  function decide(proposals: Proposal[], decision: "accepted" | "rejected") {
    setDecisions((d) => ({ ...d, ...Object.fromEntries(proposals.map((p) => [p.id, decision])) }));
    for (const p of proposals) {
      trackPlanner(decision === "accepted" ? "weekly_goal_suggest_accept" : "weekly_goal_suggest_reject", { source: p.source, type: p.goal.type, minutes: p.totalMinutes });
    }
    if (decision === "accepted") onAccept(proposals.map(proposalToGoal));
  }

  const pending = (data?.proposals ?? []).filter((p) => (decisions[p.id] ?? "pending") === "pending");
  const accepted = Object.values(decisions).filter((v) => v === "accepted").length;

  const where = (p: Proposal) => {
    const parts = [p.goal.subjectId ? subjectNames.get(p.goal.subjectId) : null, p.goal.chapterId ? chapterNames.get(p.goal.chapterId) : null].filter(Boolean);
    return parts.join(" · ");
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Suggested goals for this week"
      description="Built from your last two weeks, your weak chapters, revisions that are due, your backlog and your free hours."
      data-testid="week-suggest-sheet"
      footer={
        data && data.proposals.length > 0 ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" data-testid="suggest-accept-all" disabled={pending.length === 0} onClick={() => decide(pending, "accepted")} className="min-h-12 flex-1 rounded-[10px] border border-secondary-button-border bg-transparent px-4 text-[14px] font-medium text-ink transition-colors hover:bg-tint-strong disabled:cursor-not-allowed disabled:opacity-50">
              {pending.length === 0 ? (accepted > 0 ? `Added ${accepted}` : "Done") : `Add all ${pending.length}`}
            </button>
            <button type="button" data-testid="suggest-reject-all" disabled={pending.length === 0} onClick={() => decide(pending, "rejected")} className="min-h-14 rounded-lg border-[1.5px] border-secondary-button-border bg-surface px-4 text-base font-semibold text-body-text hover:bg-tint-strong disabled:opacity-50 dark:text-ink">
              Skip all
            </button>
          </div>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-4 pt-1">
        {loading && (
          <div role="status" className="flex flex-col gap-3" data-testid="suggest-week-loading">
            <p className="text-[14px] font-semibold text-ink">Looking at your week…</p>
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-tint-strong dark:bg-[#FAF7F214]" />
            ))}
          </div>
        )}

        {error && (
          <div role="alert" className="flex flex-col gap-3 rounded-xl bg-danger-bg p-4" data-testid="suggest-week-error">
            <p className="text-[14px] font-semibold text-danger">{error}</p>
            <button type="button" onClick={() => void load()} className="min-h-11 self-start rounded-lg border border-danger/40 px-4 text-[14px] font-semibold text-danger">
              Try again
            </button>
          </div>
        )}

        {data && (
          <>
            <div className="rounded-xl bg-tint-strong px-3 py-3 text-[13px] leading-snug text-body-text dark:bg-[#FAF7F214] dark:text-ink" data-testid="suggest-week-basis">
              <p className="font-bold text-ink">
                {formatDuration(data.proposedMinutes)} suggested of {formatDuration(data.budgetMinutes)} still free
              </p>
              <ul className="mt-1.5 list-disc pl-4">
                {data.basis.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              <p className="mt-1.5 text-[12px] text-muted">
                {data.usage.remaining} of {data.usage.limit} suggestions left this week.
              </p>
            </div>

            {data.proposals.length === 0 && (
              <p className="rounded-xl border border-dashed border-brand/25 p-4 text-center text-[14px] text-muted" data-testid="suggest-week-empty">
                Your week already looks full. Nothing to add.
              </p>
            )}

            <ul className="flex flex-col gap-3">
              {data.proposals.map((p) => {
                const state = decisions[p.id] ?? "pending";
                const style = subjectStyle(p.goal.subjectId ? (subjectNames.get(p.goal.subjectId) ?? "").toLowerCase().replace("mathematics", "maths") : null);
                return (
                  <li key={p.id} data-testid="proposal" data-state={state} className={`flex flex-col gap-2 rounded-xl border p-3 ${state === "accepted" ? "border-[var(--success)]/50 bg-[var(--success-bg)]" : state === "rejected" ? "border-brand/10 opacity-60" : "border-brand/15 bg-surface"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-[15px] font-bold leading-snug text-ink">
                          <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: style.color }} />
                          {p.label}
                        </p>
                        {where(p) && <p className="mt-0.5 text-[12px] text-muted">{where(p)}</p>}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[13px] font-bold text-ink">{formatDuration(p.totalMinutes)}</p>
                        <p className="text-[11px] text-muted">{SOURCE_LABEL[p.source]}</p>
                      </div>
                    </div>
                    <p className="text-[13px] leading-snug text-body-text dark:text-ink/80">{p.reason}</p>
                    {state === "pending" ? (
                      <div className="flex gap-2">
                        <button type="button" data-testid="proposal-accept" onClick={() => decide([p], "accepted")} className="min-h-11 flex-1 rounded-[10px] border border-secondary-button-border bg-transparent px-3 text-[14px] font-medium text-ink transition-colors hover:bg-tint-strong">
                          Add
                        </button>
                        <button type="button" data-testid="proposal-reject" onClick={() => decide([p], "rejected")} className="min-h-11 rounded-lg border border-brand/20 px-4 text-[14px] font-semibold text-ink hover:bg-tint-strong">
                          Skip
                        </button>
                      </div>
                    ) : (
                      <p className="text-[12px] font-semibold text-muted">{state === "accepted" ? "Added to your week. Save to keep it." : "Skipped"}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </Sheet>
  );
}
