"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { CoverageChips } from "@/components/rituals/CoverageChips";
import { CountUp } from "@/components/study/CountUp";
import { submitCoverage } from "@/lib/api/rituals";
import { getXpSummary, type XpSummary } from "@/lib/api/xp";
import { refreshXp } from "@/lib/rewards/events";

type Props = {
  focusSessionId: string;
  subjectId: number;
  chapterId: string | null;
  topic: string | null;
  taskType: string;
};

/** Heatmap-style intensity for today's minutes: 0 none, 4 a long day. */
export function intensity(minutes: number): 0 | 1 | 2 | 3 | 4 {
  if (minutes <= 0) return 0;
  if (minutes < 60) return 1;
  if (minutes < 180) return 2;
  if (minutes < 360) return 3;
  return 4;
}

const TILE = ["bg-surface-elevated-2", "bg-[#3B6BFF]/30", "bg-[#3B6BFF]/50", "bg-[#3B6BFF]/75", "bg-[#3B6BFF]"] as const;

/**
 * What the end of a session adds on top of the "what was saved" list: the XP it earned, today's total and today's tile
 * filling in, a one-tap way to save a mistake with the subject and chapter already filled, and (for a lecture) which
 * chapter it covered.
 */
export function SessionWrap({ focusSessionId, subjectId, chapterId, topic, taskType }: Props) {
  const reduce = useReducedMotion();
  const [gained, setGained] = useState<number | null>(null);
  const [today, setToday] = useState<XpSummary | null>(null);
  const [covered, setCovered] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const g = await refreshXp();
      const s = await getXpSummary().catch(() => null);
      if (!alive) return;
      setGained(g);
      setToday(s);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const mistakeHref = useMemo(() => {
    const q = new URLSearchParams();
    if (chapterId) q.set("chapter", chapterId);
    return `/notebooks/capture${q.size > 0 ? `?${q.toString()}` : ""}`;
  }, [chapterId]);

  const hours = today ? Math.floor(today.todayStudyMinutes / 60) : 0;
  const mins = today ? today.todayStudyMinutes % 60 : 0;

  return (
    <div className="flex flex-col gap-3 text-left" data-testid="session-wrap">
      <div className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border border-border-subtle bg-surface-elevated p-4">
        <div className="flex flex-col gap-0.5">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">This session</p>
          <p className="text-[24px] font-extrabold leading-none text-ink" data-testid="wrap-xp">
            {gained === null ? "…" : <CountUp value={gained} format={(n) => `+${n} XP`} />}
          </p>
          <p className="mt-2 text-[12px] font-semibold uppercase tracking-wide text-muted">Today</p>
          <p className="text-[18px] font-extrabold text-ink" data-testid="wrap-today">
            {today ? `${hours > 0 ? `${hours}h ` : ""}${mins}m studied · ${today.todayXp} XP` : "…"}
          </p>
          {today && (
            <p className="text-[13px] text-muted">
              Level {today.level}, {today.title}
            </p>
          )}
        </div>
        <motion.div
          aria-label="Today in your study calendar"
          data-testid="wrap-tile"
          initial={reduce ? false : { scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.15 }}
          className={`size-14 rounded-xl border border-border-subtle ${TILE[intensity(today?.todayStudyMinutes ?? 0)]}`}
        />
      </div>

      <Link href={mistakeHref} data-testid="wrap-mistake" className="flex min-h-12 items-center justify-center rounded-lg border-[1.5px] border-secondary-button-border bg-surface px-4 text-[15px] font-semibold text-body-text hover:bg-tint-strong dark:text-ink">
        Add a mistake?
      </Link>

      {taskType === "lecture" && !covered && (
        <CoverageChips
          testId="wrap-coverage"
          title="Which chapter did you cover?"
          hint="Optional. One tap updates your syllabus."
          chapterIds={chapterId ? [chapterId] : []}
          onPick={(pick) => {
            void submitCoverage({ blockKey: `lecture:${focusSessionId}`, chapterId: pick.chapterId, lectureNumber: pick.lectureNumber }).finally(() => setCovered(true));
          }}
          onSkip={() => setCovered(true)}
        />
      )}
    </div>
  );
}
