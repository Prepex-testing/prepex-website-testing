"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getStudyingNow, presenceLabel, profileHref, type StudyingNow } from "@/lib/api/social";

/** Initials for an avatar with no picture. */
export function initialsOf(name: string): string {
  const parts = name.replace(/^@/, "").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "S") + (parts.length > 1 ? (parts[parts.length - 1]![0] ?? "") : "")).toUpperCase();
}

/** Tapping any avatar opens that student's profile. */
export function ProfileAvatar({ who, size = 40, ring = false }: { who: { userId: string; username: string | null; name: string; avatarUrl: string | null }; size?: number; ring?: boolean }) {
  return (
    <Link href={profileHref(who)} aria-label={`${who.name}'s profile`} data-testid="profile-avatar" className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-tint-strong text-[13px] font-bold text-ink ${ring ? "ring-2 ring-[#3B6BFF]" : ""}`} style={{ width: size, height: size }}>
      {who.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- the student's own uploaded photo
        <img src={who.avatarUrl} alt="" className="size-full object-cover" />
      ) : (
        <span aria-hidden>{initialsOf(who.name)}</span>
      )}
    </Link>
  );
}

/** Intensity step for a day's study minutes. */
export function heatLevel(minutes: number): 0 | 1 | 2 | 3 | 4 {
  if (minutes <= 0) return 0;
  if (minutes < 60) return 1;
  if (minutes < 180) return 2;
  if (minutes < 360) return 3;
  return 4;
}

const HEAT = ["bg-black/[0.07] dark:bg-white/[0.08]", "bg-[#3B6BFF]/25", "bg-[#3B6BFF]/50", "bg-[#3B6BFF]/75", "bg-[#3B6BFF]"] as const;

/** The weeks of a year as columns, newest on the right: [column][row Monday..Sunday], days outside the range are null. */
export function heatmapGrid(days: { date: string; minutes: number }[], today: Date): ({ date: string; minutes: number } | null)[][] {
  const byDate = new Map(days.map((d) => [d.date, d.minutes]));
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const start = new Date(end.getTime() - 364 * 86_400_000);
  // pad back to a Monday so every column is a full week
  const offset = (start.getUTCDay() + 6) % 7;
  const first = new Date(start.getTime() - offset * 86_400_000);
  const cols: ({ date: string; minutes: number } | null)[][] = [];
  for (let c = 0; first.getTime() + c * 7 * 86_400_000 <= end.getTime(); c++) {
    const col: ({ date: string; minutes: number } | null)[] = [];
    for (let r = 0; r < 7; r++) {
      const d = new Date(first.getTime() + (c * 7 + r) * 86_400_000);
      const key = d.toISOString().slice(0, 10);
      col.push(d < start || d > end ? null : { date: key, minutes: byDate.get(key) ?? 0 });
    }
    cols.push(col);
  }
  return cols;
}

/** A GitHub-style year of study: one square a day, darker for more minutes. Real minutes only. */
export function YearHeatmap({ days, today = new Date() }: { days: { date: string; minutes: number }[]; today?: Date }) {
  const grid = useMemo(() => heatmapGrid(days, today), [days, today]);
  const total = days.reduce((s, d) => s + d.minutes, 0);
  return (
    <figure className="flex flex-col gap-2" data-testid="year-heatmap">
      <div className="overflow-x-auto pb-1" tabIndex={0} aria-label="Study heatmap for the last year">
        <div className="flex gap-[3px]" role="img" aria-label={`${days.filter((d) => d.minutes > 0).length} study days in the last year, ${Math.round(total / 60)} hours`}>
          {grid.map((col, i) => (
            <div key={i} className="flex flex-col gap-[3px]">
              {col.map((cell, r) =>
                cell ? <span key={r} title={`${cell.date}: ${Math.round(cell.minutes)} min`} data-level={heatLevel(cell.minutes)} className={`size-[11px] rounded-[2px] ${HEAT[heatLevel(cell.minutes)]}`} /> : <span key={r} className="size-[11px]" />,
              )}
            </div>
          ))}
        </div>
      </div>
      <figcaption className="flex items-center justify-between text-[11px] text-muted">
        <span>{Math.round(total / 60)} hours in the last year</span>
        <span className="flex items-center gap-1">
          Less
          {HEAT.map((c) => (
            <span key={c} className={`size-[10px] rounded-[2px] ${c}`} />
          ))}
          More
        </span>
      </figcaption>
    </figure>
  );
}

/** The followed students who are studying right now, refreshed every minute. Nothing renders when nobody is. */
export function StudyingNowStrip({ pollMs = 60_000 }: { pollMs?: number }) {
  const [list, setList] = useState<StudyingNow[]>([]);
  useEffect(() => {
    let alive = true;
    const load = () => {
      if (document.visibilityState === "hidden") return;
      void getStudyingNow()
        .then((r) => {
          if (alive) setList(r);
        })
        .catch(() => undefined);
    };
    load();
    const t = setInterval(load, pollMs);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [pollMs]);
  if (list.length === 0) return null;
  return (
    <section aria-label="Studying now" data-testid="studying-now" className="flex flex-col gap-2 rounded-2xl border border-border-subtle bg-surface-elevated p-3">
      <h2 className="text-[12px] font-semibold uppercase tracking-wide text-muted">Studying now</h2>
      <ul className="flex gap-3 overflow-x-auto pb-1">
        {list.map((s) => (
          <li key={s.userId} className="flex min-w-[150px] items-center gap-2" data-testid="studying-now-item">
            <ProfileAvatar who={s} size={36} ring={!s.onBreak} />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-ink">{s.name}</p>
              <p className="truncate text-[12px] text-muted">{presenceLabel(s)}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
