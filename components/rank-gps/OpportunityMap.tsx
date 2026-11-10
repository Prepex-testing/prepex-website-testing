"use client";

import { useMemo, useState } from "react";
import { StatCard } from "@/components/stats/StatCard";
import { ProLocked } from "@/components/rank-gps/ProLocked";
import { subjectColor } from "@/lib/study/subjects";
import { squarify } from "@/lib/rankGps/treemap";
import { fmtMarks } from "@/lib/rankGps/format";
import { COPY } from "@/lib/rankGps/labels";
import type { OpportunityChapter } from "@/lib/rankGps/types";

const W = 100;
const H = 62;

/** A treemap of the marks still on the table: each square is a chapter, its area the marks you can still win there. */
export function OpportunityMap({ chapters, locked }: { chapters: OpportunityChapter[]; locked: boolean }) {
  const [selected, setSelected] = useState<string | null>(chapters[0]?.chapterId ?? null);
  const cells = useMemo(() => squarify(chapters.map((c) => ({ ...c, value: Math.max(0.1, c.potential) })), W, H), [chapters]);
  const current = chapters.find((c) => c.chapterId === selected) ?? null;

  return (
    <StatCard title={COPY.map} subtitle={COPY.mapSub.toUpperCase()}>
      {chapters.length === 0 ? (
        <p className="text-[14px] text-muted" data-testid="map-empty">Nothing to map yet. Start a chapter and it shows up here.</p>
      ) : (
        <div className="flex flex-col gap-4" data-testid="opportunity-map">
          <div className="relative w-full overflow-hidden rounded-xl" style={{ aspectRatio: `${W} / ${H}` }}>
            {cells.map((c) => {
              const colour = subjectColor(c.subjectId);
              const big = c.w > 22 && c.h > 16;
              return (
                <button
                  key={c.chapterId}
                  type="button"
                  onClick={() => setSelected(c.chapterId)}
                  aria-pressed={selected === c.chapterId}
                  aria-label={`${c.name}, up to ${fmtMarks(c.potential)} marks`}
                  data-testid={`map-cell-${c.chapterId}`}
                  className="absolute flex flex-col items-start justify-start overflow-hidden p-1.5 text-left transition-[filter] hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand"
                  style={{
                    left: `${(c.x / W) * 100}%`,
                    top: `${(c.y / H) * 100}%`,
                    width: `${(c.w / W) * 100}%`,
                    height: `${(c.h / H) * 100}%`,
                    background: `color-mix(in srgb, ${colour} ${selected === c.chapterId ? 38 : 24}%, var(--surface))`,
                    boxShadow: `inset 0 0 0 ${selected === c.chapterId ? 2 : 1}px color-mix(in srgb, ${colour} 70%, var(--surface))`,
                  }}
                >
                  {big && <span className="line-clamp-2 text-[11px] font-bold leading-tight text-ink sm:text-[12px]">{c.name}</span>}
                  {c.w > 11 && c.h > 9 && <span className="text-[11px] font-semibold text-body-text dark:text-ink">+{fmtMarks(c.potential)}</span>}
                </button>
              );
            })}
          </div>

          {current && (
            <div className="rounded-xl border border-border-subtle p-3 text-[13px]" data-testid="map-detail">
              <p className="text-[15px] font-bold text-ink">{current.name} <span className="font-normal text-muted">· {current.subjectName}</span></p>
              <p className="mt-1 text-body-text dark:text-ink">{current.action}</p>
              <p className="mt-2 text-muted">
                Worth up to {fmtMarks(current.potential)} marks of {fmtMarks(current.availableMarks)} · about {fmtMarks(current.hours)} h of work
                {current.accuracy !== null ? ` · ${Math.round(current.accuracy * 100)}% accuracy` : ""}
                {current.mistakesOpen > 0 ? ` · ${current.mistakesOpen} open mistake${current.mistakesOpen === 1 ? "" : "s"}` : ""}
              </p>
            </div>
          )}
          {locked && <ProLocked section="fullOpportunityMap" hint="You see your top 5 chapters." />}
        </div>
      )}
    </StatCard>
  );
}
