export type SubjectCoverage = { name: string; total: number; completed: number };

const pct = (completed: number, total: number) => (total > 0 ? Math.round((completed / total) * 100) : 0);

/**
 * One line about syllabus progress built only from the student's own chapter statuses, for the Home and Analytics
 * headers: "You've completed 18 of 90 chapters · Physics leads at 32%". Returns null when nothing is complete yet
 * (nothing true to say) or when there is no syllabus.
 */
export function syllabusHeadline(subjects: SubjectCoverage[]): string | null {
  const total = subjects.reduce((n, s) => n + s.total, 0);
  const completed = subjects.reduce((n, s) => n + s.completed, 0);
  if (total === 0 || completed === 0) return null;

  const ranked = subjects.filter((s) => s.total > 0 && s.completed > 0).sort((a, b) => pct(b.completed, b.total) - pct(a.completed, a.total));
  const lead = ranked[0];
  const base = `You've completed ${completed} of ${total} chapters`;
  // A "leader" only means something when there is more than one subject with progress.
  if (!lead || ranked.length < 2) return base;
  return `${base} · ${lead.name} leads at ${pct(lead.completed, lead.total)}%`;
}
