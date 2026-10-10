"use client";

import type { Mistake } from "@/lib/api/mistakes";
import { describeNextReview } from "@/lib/study/mistakeRating";
import { subjectColor, type SubjectLookup } from "@/lib/study/subjects";

type Props = {
  items: Mistake[];
  lookup: SubjectLookup;
  now?: Date;
  busyId?: string | null;
  onReview: (m: Mistake) => void;
  onEdit: (m: Mistake) => void;
  onDelete: (m: Mistake) => void;
  onMaster: (m: Mistake) => void;
  onReopen: (m: Mistake) => void;
};

const BTN = "flex min-h-11 items-center justify-center rounded-lg px-3 text-[13px] font-semibold disabled:opacity-50";

function snippet(text: string, max = 140): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

/** All saved mistakes: the question in short, when it is next due, and what you can do with it. */
export function MistakeList({ items, lookup, now, busyId, onReview, onEdit, onDelete, onMaster, onReopen }: Props) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-brand/25 p-6 text-center" data-testid="mistakes-empty">
        <p className="text-[16px] font-bold text-ink">No mistakes here</p>
        <p className="mt-1 text-[13px] text-muted">Add the questions you got wrong in tests and books, and Prepex brings them back just before you would forget.</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3" data-testid="mistake-list">
      {items.map((m) => {
        const chapter = lookup.chapterName(m.chapterId);
        const busy = busyId === m.id;
        return (
          <li key={m.id} className="flex flex-col gap-2 rounded-2xl border border-brand/10 bg-surface p-4" data-testid="mistake-row" data-mastered={m.isMastered}>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-semibold text-muted">
              <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: subjectColor(m.subjectId) }} />
              <span className="text-ink">{lookup.subjectName(m.subjectId)}</span>
              {chapter && <span>· {chapter}</span>}
              {m.topic && <span>· {m.topic}</span>}
            </div>
            <p className="break-words text-[15px] font-semibold leading-snug text-ink">{snippet(m.questionText)}</p>
            {m.tags.length > 0 && (
              <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
                {m.tags.map((tag) => (
                  <li key={tag} className="rounded-full bg-tint-strong px-2 py-0.5 text-[11px] font-semibold text-muted dark:bg-[#FAF7F214]">
                    {tag}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[12px] font-semibold text-muted" data-testid="next-review">
              {m.isMastered ? "Mastered" : `Next review ${describeNextReview(m.nextReviewAt, now)}`} · reviewed {m.reviewCount} time{m.reviewCount === 1 ? "" : "s"}
            </p>
            <div className="-mx-1 flex flex-wrap">
              {!m.isMastered && (
                <button type="button" data-testid="review-now" disabled={busy} onClick={() => onReview(m)} className={`${BTN} text-ink hover:bg-tint-strong`}>
                  Review now
                </button>
              )}
              <button type="button" disabled={busy} onClick={() => onEdit(m)} className={`${BTN} text-muted hover:bg-tint-strong`}>
                Edit
              </button>
              {m.isMastered ? (
                <button type="button" data-testid="reopen" disabled={busy} onClick={() => onReopen(m)} className={`${BTN} text-muted hover:bg-tint-strong`}>
                  Reopen
                </button>
              ) : (
                <button type="button" data-testid="master" disabled={busy} onClick={() => onMaster(m)} className={`${BTN} text-muted hover:bg-tint-strong`}>
                  Mark mastered
                </button>
              )}
              <button type="button" disabled={busy} onClick={() => onDelete(m)} className={`${BTN} text-danger hover:bg-danger-bg`}>
                Delete
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
