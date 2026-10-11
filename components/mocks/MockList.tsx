"use client";

import type { MockTest } from "@/lib/api/mocks";
import { approxRank, labelOfPattern, labelOfType, SUBJECT_LABEL } from "@/lib/insights/mockMath";

type Props = {
  rows: MockTest[];
  hasMore: boolean;
  onLoadMore: () => void;
  onEdit: (m: MockTest) => void;
  onDelete: (m: MockTest) => void;
  onPlanWeak: (m: MockTest) => void;
  onShare: (m: MockTest) => void;
};

function prettyDate(key: string): string {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

const BTN = "min-h-11 rounded-lg border border-brand/15 bg-surface px-3 text-[13px] font-bold text-body-text hover:bg-tint-strong dark:text-ink";

/** Every mock the student has logged, newest first. */
export function MockList({ rows, hasMore, onLoadMore, onEdit, onDelete, onPlanWeak, onShare }: Props) {
  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-brand/20 p-6 text-center text-[14px] text-muted" data-testid="mocks-empty">
        No mock tests yet. Log one and your trend, projected rank and weak chapters start building.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-3" data-testid="mock-list">
      {rows.map((m) => {
        const subjects = (Object.keys(SUBJECT_LABEL) as (keyof typeof SUBJECT_LABEL)[]).filter((s) => m.subjectMarks[s] !== null);
        return (
          <article key={m.id} data-testid={`mock-row-${m.id}`} className="flex flex-col gap-3 rounded-2xl border border-brand/10 bg-surface p-4">
            <header className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="break-words text-[16px] font-extrabold text-ink">{m.testName ?? labelOfType(m.testType)}</h3>
                <p className="text-[13px] text-muted">
                  {prettyDate(m.dateTaken)} · {labelOfType(m.testType)} · {labelOfPattern(m.examPattern)}
                </p>
              </div>
              <p className="shrink-0 text-right" data-testid={`mock-score-${m.id}`}>
                <span className="block text-[22px] font-extrabold leading-none text-ink">
                  {m.totalMarks}
                  <span className="text-[14px] font-bold text-muted">/{m.maxMarks}</span>
                </span>
                <span className="text-[13px] font-semibold text-muted">{m.scorePercent}%</span>
              </p>
            </header>

            {(subjects.length > 0 || m.percentile !== null) && (
              <p className="text-[13px] font-semibold text-body-text dark:text-ink">
                {subjects.map((s) => `${SUBJECT_LABEL[s]} ${m.subjectMarks[s]}`).join(" · ")}
                {m.percentile !== null && (
                  <span data-testid={`mock-rank-${m.id}`}>
                    {subjects.length > 0 ? " · " : ""}
                    {m.percentile} percentile · rank {approxRank(m.projectedRank)}
                  </span>
                )}
              </p>
            )}

            {m.weakChapters.length > 0 && (
              <p className="text-[13px] text-muted">
                <span className="font-bold text-ink">Weak: </span>
                {m.weakChapters.map((w) => w.name ?? "Chapter").join(", ")}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <button type="button" className={BTN} data-testid={`mock-share-${m.id}`} onClick={() => onShare(m)}>
                Share
              </button>
              {m.weakChapters.length > 0 && (
                <button type="button" className={BTN} data-testid={`mock-plan-${m.id}`} onClick={() => onPlanWeak(m)}>
                  Plan weak chapters
                </button>
              )}
              <button type="button" className={BTN} data-testid={`mock-edit-${m.id}`} onClick={() => onEdit(m)}>
                Edit
              </button>
              <button type="button" className={`${BTN} text-danger`} data-testid={`mock-delete-${m.id}`} onClick={() => onDelete(m)}>
                Delete
              </button>
            </div>
          </article>
        );
      })}
      {hasMore && (
        <button type="button" data-testid="mocks-load-more" onClick={onLoadMore} className="min-h-12 rounded-xl border border-brand/15 bg-surface px-4 text-[14px] font-bold text-ink hover:bg-tint-strong">
          Load more
        </button>
      )}
    </div>
  );
}
