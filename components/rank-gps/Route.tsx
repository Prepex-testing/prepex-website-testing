"use client";

import { useState } from "react";
import Link from "next/link";
import { StatCard } from "@/components/stats/StatCard";
import { CoralButton } from "@/components/ui/CoralButton";
import { GhostButton } from "@/components/ui/GhostButton";
import { ApiError } from "@/lib/api/http";
import { addRankGpsMove, setRankGpsTarget } from "@/lib/api/rankGps";
import { fmtMarks, fmtPercentile } from "@/lib/rankGps/format";
import { COPY } from "@/lib/rankGps/labels";
import type { Move, TargetGap } from "@/lib/rankGps/types";

const TARGET_CHIPS = [90, 95, 97, 98, 99, 99.5];

type MoveState = "idle" | "confirm" | "saving" | "added" | "there" | "error";

function MoveCard({ move, index }: { move: Move; index: number }) {
  const [state, setState] = useState<MoveState>("idle");
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setState("saving");
    setError(null);
    try {
      const res = await addRankGpsMove(move.id);
      setState(res.alreadyThere ? "there" : "added");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "We could not add it. Please try again.");
      setState("error");
    }
  }

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-border-subtle p-4" data-testid={`move-${index + 1}`}>
      <div className="flex items-start gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-tint-strong text-[13px] font-bold text-ink">{index + 1}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold text-ink">{move.name}</p>
          <p className="text-[13px] text-body-text dark:text-ink">{move.action}</p>
          <p className="mt-1 text-[12px] text-muted">About {fmtMarks(move.hours)} h of work · up to +{fmtMarks(move.marksGain)} marks</p>
        </div>
      </div>
      {state === "idle" || state === "error" ? (
        <div className="flex flex-col items-start gap-1">
          <GhostButton onClick={() => setState("confirm")} data-testid={`move-add-${index + 1}`}>{COPY.addToWeek}</GhostButton>
          {error && <p role="alert" className="text-[12px] font-medium text-danger">{error}</p>}
        </div>
      ) : state === "confirm" ? (
        <div className="flex flex-col gap-2 rounded-xl bg-tint-strong p-3" data-testid={`move-confirm-${index + 1}`}>
          <p className="text-[13px] text-ink">Add this to your goals for this week?</p>
          <div className="flex gap-2">
            <CoralButton className="min-h-11 px-4 py-2 text-[14px]" onClick={() => void add()} data-testid={`move-confirm-yes-${index + 1}`}>Add</CoralButton>
            <GhostButton onClick={() => setState("idle")}>Cancel</GhostButton>
          </div>
        </div>
      ) : state === "saving" ? (
        <p className="text-[13px] text-muted">Adding…</p>
      ) : (
        <p className="text-[13px] font-semibold text-success" data-testid={`move-done-${index + 1}`}>
          {state === "added" ? COPY.added : COPY.alreadyThere}.{" "}
          <Link href="/goals" className="underline">See goals</Link>
        </p>
      )}
    </li>
  );
}

export function Route({ moves, target, targetPercentile, track, locked }: { moves: Move[]; target: TargetGap | null; targetPercentile: number | null; track: string; locked: { subjectGap: boolean } }) {
  const [pick, setPick] = useState<number | null>(targetPercentile);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choose(p: number | null) {
    setError(null);
    try {
      await setRankGpsTarget(p);
      setPick(p);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "We could not save your target. Please try again.");
    }
  }

  return (
    <StatCard title={COPY.route} subtitle={COPY.routeSub.toUpperCase()}>
      <div className="flex flex-col gap-4" data-testid="rank-gps-route">
        {track === "jee" && (
          <div className="flex flex-col gap-2" data-testid="target-picker">
            <p className="text-[13px] font-bold text-ink">{pick === null ? COPY.needsTarget : `Target: ${fmtPercentile(pick)} percentile`}</p>
            <div className="flex flex-wrap gap-2">
              {TARGET_CHIPS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={pick === c}
                  onClick={() => void choose(c)}
                  className={`min-h-11 rounded-full border px-4 text-[13px] font-bold transition-colors ${pick === c ? "border-brand bg-brand text-white dark:text-[#0b0b1f]" : "border-border-strong text-ink hover:bg-surface-elevated-2"}`}
                >
                  {c}
                </button>
              ))}
              {pick !== null && <GhostButton className="min-h-11" onClick={() => void choose(null)}>Clear</GhostButton>}
            </div>
            {saved && <p className="text-[12px] text-muted">Saved. Your next report is built around this target.</p>}
            {error && <p role="alert" className="text-[12px] font-medium text-danger">{error}</p>}
          </div>
        )}

        {target && (
          <div className="rounded-xl bg-tint-strong p-3 text-[13px] text-ink" data-testid="target-gap">
            {target.gapMarks === null ? (
              <>To reach the {fmtPercentile(target.targetPercentile)} percentile you need about {fmtMarks(target.requiredMarks.low)} to {fmtMarks(target.requiredMarks.high)} marks.</>
            ) : target.gapMarks <= 0 ? (
              <>You are already projected at or above your target of {fmtPercentile(target.targetPercentile)}. Hold the line.</>
            ) : (
              <>You are about <b>{fmtMarks(target.gapMarks)} marks</b> short of the {fmtPercentile(target.targetPercentile)} percentile (you need about {fmtMarks(target.requiredMarks.centre)}).</>
            )}
          </div>
        )}
        {target && target.subjects.length > 0 && (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3" data-testid="subject-gap">
            {target.subjects.map((s) => (
              <li key={s.subject} className="rounded-xl border border-border-subtle p-3 text-[13px]">
                <p className="font-bold capitalize text-ink">{s.subject}</p>
                <p className="text-muted">Needs {fmtMarks(s.requiredMarks)} · averaging {s.averageMarks === null ? "—" : fmtMarks(s.averageMarks)}</p>
                <p className={`font-bold ${s.gapMarks > 0 ? "text-danger" : "text-success"}`}>{s.gapMarks > 0 ? `${fmtMarks(s.gapMarks)} to find` : "on track"}</p>
              </li>
            ))}
          </ul>
        )}
        {target && locked.subjectGap && target.subjects.length === 0 && <p className="text-[12px] text-muted">Subject-level gap: {COPY.proLocked}</p>}

        {moves.length === 0 ? (
          <p className="text-[14px] text-muted">No moves yet. Start a chapter or log a practice set and your route appears here.</p>
        ) : (
          <ol className="flex flex-col gap-3">{moves.map((m, i) => <MoveCard key={m.id} move={m} index={i} />)}</ol>
        )}
      </div>
    </StatCard>
  );
}

