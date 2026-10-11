import Link from "next/link";
import type { MasterAnalytics } from "@/lib/api/masterAnalytics";
import { STRENGTH_STYLE } from "@/lib/insights/labels";

type Props = {
  grid: MasterAnalytics["chapterStrengthGrid"];
  subjectName: (id: number) => string;
};

const KEYS = ["strong", "medium", "weak", "unrated"] as const;

/** Every chapter as one coloured square, grouped by subject; tap one to open it. */
export function StrengthGrid({ grid, subjectName }: Props) {
  const bySubject = new Map<number, MasterAnalytics["chapterStrengthGrid"]["chapters"]>();
  for (const c of grid.chapters) bySubject.set(c.subjectId, [...(bySubject.get(c.subjectId) ?? []), c]);

  return (
    <div className="flex flex-col gap-4" data-testid="strength-grid">
      {[...bySubject.entries()].map(([subjectId, chapters]) => (
        <section key={subjectId} aria-label={subjectName(subjectId)}>
          <h3 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-muted">{subjectName(subjectId)}</h3>
          <ul className="flex flex-wrap gap-1.5">
            {chapters.map((c) => (
              <li key={c.chapterId}>
                <Link
                  href={`/syllabus/${c.chapterId}`}
                  data-testid={`grid-cell-${c.chapterId}`}
                  data-strength={c.label}
                  aria-label={`${c.name}: ${STRENGTH_STYLE[c.label].label}${c.accuracy !== null ? `, ${Math.round(c.accuracy)}% accuracy` : ""}`}
                  title={`${c.name} · ${STRENGTH_STYLE[c.label].label}`}
                  className="block size-8 rounded-md border border-black/5"
                  style={{ background: STRENGTH_STYLE[c.label].dot, opacity: c.label === "unrated" ? 0.45 : 1 }}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
      {grid.chapters.length === 0 && <p className="text-[13px] text-muted">No chapters yet.</p>}
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted" data-testid="strength-legend">
        {KEYS.map((k) => (
          <li key={k} className="flex items-center gap-1.5">
            <span aria-hidden className="size-3 rounded" style={{ background: STRENGTH_STYLE[k].dot }} />
            {STRENGTH_STYLE[k].label}: <span className="font-bold text-ink" data-testid={`strength-count-${k}`}>{grid.counts[k]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
