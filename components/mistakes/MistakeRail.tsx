import Link from "next/link";
import { BarRow, PanelSection } from "@/components/logs/LogScreenScaffold";
import type { Mistake, MistakeStats } from "@/lib/api/mistakes";
import { todayProgress, topChapters, topTags } from "@/lib/study/mistakeRail";
import { subjectColor, type SubjectLookup } from "@/lib/study/subjects";

/**
 * The desktop side rail of the Mistakes tab. Every figure is read from the mistake stats or the student's own open
 * mistakes; a section with nothing to show is left out.
 */
export function MistakeRail({ stats, items, more, left, lookup }: { stats: MistakeStats | null; items: Mistake[]; more: boolean; left: number; lookup: SubjectLookup }) {
  const progress = todayProgress(stats, left);
  const chapters = topChapters(items, lookup.chapterName);
  const tags = topTags(items);
  const subjects = stats?.bySubject.filter((s) => s.total > 0) ?? [];
  const maxSubject = Math.max(1, ...subjects.map((s) => s.total));
  const note = more ? " (latest 100)" : "";

  return (
    <aside aria-label="Your mistakes at a glance" className="hidden min-w-0 lg:sticky lg:top-6 lg:block lg:self-start" data-testid="mistake-rail">
      <div className="flex flex-col gap-5 rounded-2xl border border-border-subtle bg-surface-elevated p-5">
        {progress && (
          <PanelSection title="Today" testId="rail-progress">
            <p className="text-[22px] font-extrabold leading-none text-ink">
              {progress.done} of {progress.total} <span className="text-[14px] font-semibold text-muted">reviewed</span>
            </p>
            <div className="h-1.5 overflow-hidden rounded-[3px] bg-black/[0.08] dark:bg-white/[0.08]" role="progressbar" aria-valuenow={progress.done} aria-valuemin={0} aria-valuemax={progress.total} aria-label="Reviewed today">
              <div className="h-full rounded-[3px] bg-slate-700 dark:bg-white/50" style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }} />
            </div>
          </PanelSection>
        )}
        {stats && (
          <PanelSection title="Coming up" testId="rail-upcoming">
            <p className="text-[13px] text-ink">
              <strong className="font-semibold">{stats.dueNext7Days}</strong> due in the next 7 days
            </p>
          </PanelSection>
        )}
        {subjects.length > 0 && (
          <PanelSection title="By subject" testId="rail-subjects">
            {subjects.map((s) => (
              <BarRow key={s.subjectId} label={lookup.subjectName(s.subjectId)} value={s.total} max={maxSubject} text={String(s.total)} color={subjectColor(s.subjectId)} />
            ))}
          </PanelSection>
        )}
        {chapters.length > 0 && (
          <PanelSection title={`Top chapters${note}`} testId="rail-chapters">
            {chapters.map((c) => (
              <BarRow key={c.key} label={c.label} value={c.count} max={chapters[0]!.count} text={String(c.count)} />
            ))}
          </PanelSection>
        )}
        {tags.length > 0 && (
          <PanelSection title={`Your tags${note}`} testId="rail-tags">
            {tags.map((t) => (
              <BarRow key={t.key} label={t.label} value={t.count} max={tags[0]!.count} text={String(t.count)} />
            ))}
          </PanelSection>
        )}
        <Link href="/home/mistake-notebook" className="text-[13px] font-semibold text-ink underline underline-offset-2">
          Mistakes from practice
        </Link>
      </div>
    </aside>
  );
}
