"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BarRow, PanelSection, Sparkline } from "@/components/logs/LogScreenScaffold";
import { GhostButton } from "@/components/ui/GhostButton";
import { getPracticeAnalytics, type ChapterAccuracy, type PracticeAnalytics } from "@/lib/api/practiceLogs";

/** Accuracy per subject from the per-chapter rows: correct over attempted, weighted by attempts. */
export function accuracyBySubject(chapters: Pick<ChapterAccuracy, "subjectId" | "subjectName" | "attempted" | "correct">[]): { subjectId: number; name: string; accuracy: number; attempted: number }[] {
  const by = new Map<number, { name: string; attempted: number; correct: number }>();
  for (const c of chapters) {
    const cur = by.get(c.subjectId) ?? { name: c.subjectName ?? `Subject ${c.subjectId}`, attempted: 0, correct: 0 };
    cur.attempted += c.attempted;
    cur.correct += c.correct;
    by.set(c.subjectId, cur);
  }
  return [...by.entries()]
    .filter(([, v]) => v.attempted > 0)
    .map(([subjectId, v]) => ({ subjectId, name: v.name, attempted: v.attempted, accuracy: Math.round((v.correct / v.attempted) * 100) }))
    .sort((a, b) => b.attempted - a.attempted);
}

type Props = { onLog: () => void };

/** Practice's right column: accuracy by subject, the weakest chapters (each opens a practice set), the last two weeks' volume, and a way to log. */
export function PracticeSidePanel({ onLog }: Props) {
  const [data, setData] = useState<PracticeAnalytics | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    getPracticeAnalytics({ period: "month" }).then(
      (r) => alive && setData(r.data),
      () => alive && setFailed(true),
    );
    return () => {
      alive = false;
    };
  }, []);

  const subjects = data ? accuracyBySubject(data.byChapter) : [];
  const weakest = (data?.weakness ?? []).slice(0, 3);
  const days = (data?.byDay ?? []).slice(-14).map((d) => d.attempted);

  return (
    <>
      <PanelSection title="Accuracy by subject" testId="pr-accuracy">
        {failed ? (
          <p className="text-[13px] text-muted">Couldn&apos;t load this.</p>
        ) : !data ? (
          <p className="text-[13px] text-muted">Loading</p>
        ) : subjects.length === 0 ? (
          <p className="text-[13px] text-muted">Log some practice to see this.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {subjects.map((s) => (
              <BarRow key={s.subjectId} label={s.name} value={s.accuracy} max={100} text={`${s.accuracy}%`} />
            ))}
          </div>
        )}
      </PanelSection>

      <PanelSection title="Weakest chapters" testId="pr-weakest">
        {weakest.length === 0 ? (
          <p className="text-[13px] text-muted">{data ? "No weak chapters yet." : failed ? "Couldn't load this." : "Loading"}</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {weakest.map((c) => (
              <li key={c.chapterId} className="flex items-baseline justify-between gap-3 text-[14px]">
                <Link href={`/practice/custom?chapterId=${c.chapterId}`} className="min-w-0 truncate text-ink underline-offset-2 hover:underline">
                  {c.chapterName ?? "Chapter"}
                </Link>
                <span className="shrink-0 text-[12px] text-muted">{c.accuracy === null ? "n/a" : `${Math.round(c.accuracy)}%`}</span>
              </li>
            ))}
          </ul>
        )}
      </PanelSection>

      <PanelSection title="Questions per day, last 14 days" testId="pr-trend">
        <Sparkline points={days} label="Questions per day over the last 14 days" />
      </PanelSection>

      <GhostButton data-testid="pr-side-log" onClick={onLog}>
        + Log a practice session
      </GhostButton>
    </>
  );
}
