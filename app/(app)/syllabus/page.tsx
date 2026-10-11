"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { InsightsTabs } from "@/components/insights/InsightsTabs";
import { ProfileSubpageHeader } from "@/components/profile/ProfileSubpageHeader";
import { ChapterListRow } from "@/components/syllabus/ChapterListRow";
import { PageLoader } from "@/components/ui/PageLoader";
import { ApiError } from "@/lib/api/http";
import { getSyllabus, type SyllabusOverview, type Tally } from "@/lib/api/syllabus";
import { hoursLabel, STRENGTH_STYLE } from "@/lib/insights/labels";

type ClassFilter = "all" | 11 | 12;

function SummaryBar({ t }: { t: Tally }) {
  const pct = (n: number) => (t.chapters === 0 ? 0 : (n / t.chapters) * 100);
  return (
    <div className="flex flex-col gap-2" data-testid="syllabus-summary">
      <div className="flex h-3 overflow-hidden rounded-full bg-tint-strong" role="img" aria-label={`${t.studied} of ${t.chapters} chapters' theory done, ${t.learning} in progress`}>
        <span className="bg-[#10B981]" style={{ width: `${pct(t.studied)}%` }} />
        <span className="bg-[#F59E0B]" style={{ width: `${pct(t.learning)}%` }} />
      </div>
      <p className="text-[13px] font-semibold text-body-text dark:text-ink" data-testid="syllabus-summary-text">
        {t.studied} of {t.chapters} theory done · {t.learning} learning · {hoursLabel(t.hours)} studied
      </p>
      <p className="flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-muted" data-testid="syllabus-strength-counts">
        {(["strong", "medium", "weak", "unrated"] as const).map((k) => (
          <span key={k} className="flex items-center gap-1">
            <span aria-hidden className="size-2.5 rounded-full" style={{ background: STRENGTH_STYLE[k].dot }} />
            {t[k]} {STRENGTH_STYLE[k].label.toLowerCase()}
          </span>
        ))}
      </p>
    </div>
  );
}

export default function SyllabusPage() {
  const [data, setData] = useState<SyllabusOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [klass, setKlass] = useState<ClassFilter>("all");

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await getSyllabus();
      setData(res.data);
      setSubjectId((cur) => cur ?? res.data.subjects[0]?.subjectId ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "We couldn't load the syllabus. Please try again.");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load once on arrival
    void load();
  }, [load]);

  const subject = useMemo(() => data?.subjects.find((s) => s.subjectId === subjectId) ?? null, [data, subjectId]);
  const chapters = useMemo(() => (subject ? subject.chapters.filter((c) => klass === "all" || c.class === klass) : []), [subject, klass]);

  if (!data && !error) return <PageLoader label="Loading the syllabus…" />;

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 lg:mx-auto lg:max-w-3xl lg:p-8" data-testid="syllabus-page">
      <ProfileSubpageHeader title="Syllabus" backHref="/home" />
      <InsightsTabs current="/syllabus" />

      {error && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
          {error}{" "}
          <button type="button" className="font-bold underline" onClick={() => void load()}>
            Try again
          </button>
        </p>
      )}

      {data && data.subjects.length === 0 && (
        <p className="rounded-2xl border border-dashed border-brand/20 p-6 text-center text-[14px] text-muted" data-testid="syllabus-empty">
          The syllabus is still being set up. Check back soon.
        </p>
      )}

      {data && data.subjects.length > 0 && (
        <>
          <div role="tablist" aria-label="Subjects" className="flex gap-1 overflow-x-auto rounded-xl bg-tint-strong p-1 dark:bg-[#FAF7F214]" data-testid="syllabus-subjects">
            {data.subjects.map((s) => (
              <button
                key={s.subjectId}
                type="button"
                role="tab"
                aria-selected={s.subjectId === subjectId}
                data-testid={`syllabus-tab-${s.subjectId}`}
                onClick={() => setSubjectId(s.subjectId)}
                className={`min-h-11 flex-1 shrink-0 rounded-lg px-4 text-[14px] font-bold ${s.subjectId === subjectId ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}
              >
                {s.name}
              </button>
            ))}
          </div>

          {subject && <SummaryBar t={subject.summary} />}

          <div role="radiogroup" aria-label="Class" className="flex gap-2">
            {(["all", 11, 12] as ClassFilter[]).map((k) => (
              <button
                key={String(k)}
                type="button"
                role="radio"
                aria-checked={klass === k}
                data-testid={`syllabus-class-${k}`}
                onClick={() => setKlass(k)}
                className={`min-h-11 rounded-xl border px-4 text-[14px] font-bold ${klass === k ? "border-[1.5px] border-brand bg-tint-strong text-ink dark:border-[#FAF7F2]" : "border-brand/15 bg-surface text-body-text dark:text-ink"}`}
              >
                {k === "all" ? "All" : `Class ${k}`}
              </button>
            ))}
          </div>

          <ul className="flex flex-col gap-2" data-testid="syllabus-chapters" role="tabpanel">
            {chapters.map((c) => (
              <ChapterListRow key={c.chapterId} chapter={c} />
            ))}
            {chapters.length === 0 && <li className="rounded-xl border border-dashed border-brand/20 p-4 text-center text-[14px] text-muted">No chapters for this filter.</li>}
          </ul>
        </>
      )}
    </div>
  );
}
