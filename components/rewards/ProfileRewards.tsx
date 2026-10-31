"use client";

import { useEffect, useState } from "react";
import { LifetimeCounters } from "@/components/rituals/HomeRituals";
import { getRewards, RECORD_LABELS, type BadgeInfo, type RewardsSummary } from "@/lib/api/xp";

/** Hidden badges stay a question mark until earned; chapter badges are summarised so one per chapter does not flood the grid. */
export function visibleBadges(badges: BadgeInfo[]): { key: string; title: string; description: string; earned: boolean }[] {
  const chapters = badges.filter((b) => b.key.startsWith("chapter_mastered:"));
  const base = badges
    .filter((b) => !b.key.startsWith("chapter_mastered:"))
    .map((b) => (b.hidden && !b.earned ? { key: b.key, title: "Hidden badge", description: "Keep studying to find it.", earned: false } : { key: b.key, title: b.title, description: b.description, earned: b.earned }));
  if (chapters.length > 0) base.push({ key: "chapter_mastered", title: `Chapter Mastered x${chapters.length}`, description: "One badge for every chapter you master.", earned: true });
  return base;
}

/** Profile: the lifetime counters, the badges (earned first) and the personal records. All from the student's own logs. */
export function ProfileRewards() {
  const [data, setData] = useState<RewardsSummary | null>(null);
  useEffect(() => {
    let alive = true;
    void getRewards()
      .then((r) => {
        if (alive) setData(r);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  if (!data) return null;

  const badges = visibleBadges(data.badges).sort((a, b) => Number(b.earned) - Number(a.earned));
  return (
    <section className="flex flex-col gap-5 rounded-2xl border border-brand/10 bg-surface p-6" data-testid="profile-rewards">
      <LifetimeCounters lifetime={data.lifetime} />

      <div className="flex flex-col gap-3">
        <h2 className="text-[16px] font-extrabold text-ink">Badges</h2>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3" data-testid="badge-grid">
          {badges.map((b) => (
            <li key={b.key} data-testid={b.earned ? "badge-earned" : "badge-locked"} className={`rounded-xl border p-3 ${b.earned ? "border-brand/40 bg-tint-strong" : "border-border-subtle bg-surface-elevated opacity-70"}`}>
              <p className="text-[14px] font-bold text-ink">{b.title}</p>
              <p className="text-[12px] text-muted">{b.description}</p>
            </li>
          ))}
        </ul>
      </div>

      {data.records.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-[16px] font-extrabold text-ink">Personal records</h2>
          <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2" data-testid="records">
            {data.records.map((r) => (
              <div key={r.kind} className="flex items-baseline justify-between gap-3 rounded-xl border border-border-subtle bg-surface-elevated px-3 py-2">
                <dt className="text-[13px] text-muted">{RECORD_LABELS[r.kind].label}</dt>
                <dd className="text-[15px] font-extrabold text-ink">
                  {r.value}
                  {RECORD_LABELS[r.kind].unit}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </section>
  );
}
