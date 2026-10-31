import type { Mistake, MistakeStats } from "@/lib/api/mistakes";

export type Count = { key: string; label: string; count: number };

const top = (map: Map<string, Count>, n: number): Count[] => [...map.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)).slice(0, n);

/** The chapters with the most open mistakes. Mistakes with no chapter, or one that cannot be named, are left out. */
export function topChapters(items: Mistake[], chapterName: (id: string | null) => string | null, n = 4): Count[] {
  const map = new Map<string, Count>();
  for (const m of items) {
    const label = chapterName(m.chapterId);
    if (!m.chapterId || !label) continue;
    const cur = map.get(m.chapterId) ?? { key: m.chapterId, label, count: 0 };
    cur.count++;
    map.set(m.chapterId, cur);
  }
  return top(map, n);
}

/** The tags the student gave their mistakes, most used first (the notebook has free tags, not a fixed reason field). */
export function topTags(items: Mistake[], n = 5): Count[] {
  const map = new Map<string, Count>();
  for (const m of items) {
    for (const raw of m.tags) {
      const tag = raw.trim().toLowerCase();
      if (!tag) continue;
      const cur = map.get(tag) ?? { key: tag, label: tag, count: 0 };
      cur.count++;
      map.set(tag, cur);
    }
  }
  return top(map, n);
}

/** "3 of 7 reviewed": what was reviewed today out of that plus what is still waiting. Null when there is nothing today. */
export function todayProgress(stats: MistakeStats | null, left: number): { done: number; total: number } | null {
  if (!stats) return null;
  const total = stats.reviewedToday + left;
  return total > 0 ? { done: stats.reviewedToday, total } : null;
}
