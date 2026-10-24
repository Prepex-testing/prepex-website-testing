import Link from "next/link";
import { startFocusSession } from "@/lib/focus/startFocusSession";
import type { ChapterRow } from "@/lib/api/syllabus";
import { chapterMeta, hoursLabel, STRENGTH_STYLE, strengthKey, THEORY_LABEL } from "@/lib/insights/labels";

/** One chapter in the syllabus list: strength dot, name, hours, accuracy and theory status. Taps through to the chapter. */
export function ChapterListRow({ chapter }: { chapter: ChapterRow }) {
  const p = chapter.progress;
  const key = strengthKey(p.strengthLabel);
  const style = STRENGTH_STYLE[key];
  return (
    <li className="flex items-stretch gap-2">
      <Link
        href={`/syllabus/${chapter.chapterId}`}
        data-testid={`chapter-row-${chapter.chapterId}`}
        data-strength={key}
        data-theory={p.theoryStatus}
        className="flex min-h-16 min-w-0 flex-1 items-center gap-3 rounded-xl border border-brand/10 bg-surface px-3 py-3 hover:bg-tint-strong"
      >
        <span aria-hidden className="size-3.5 shrink-0 rounded-full" style={{ background: style.dot }} data-testid={`chapter-dot-${chapter.chapterId}`} />
        <span className="min-w-0 flex-1">
          <span className="block break-words text-[15px] font-bold text-ink">{chapter.name}</span>
          <span className="block text-[12px] text-muted">{chapterMeta(chapter)}</span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1 text-right">
          <span className="text-[12px] font-bold" style={{ color: style.fg }}>
            {style.label}
          </span>
          <span className="text-[12px] font-semibold text-muted">
            {hoursLabel(p.hours)}
            {p.accuracy !== null ? ` · ${Math.round(p.accuracy)}%` : ""}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${p.theoryStatus === "studied" ? "bg-[#10B9811F] text-[#047857]" : p.theoryStatus === "learning" ? "bg-[#F59E0B24] text-[#B45309]" : "bg-tint-strong text-muted"}`}>{THEORY_LABEL[p.theoryStatus]}</span>
        </span>
      </Link>
      <button
        type="button"
        data-testid={`study-chapter-${chapter.chapterId}`}
        aria-label={`Study ${chapter.name}`}
        onClick={() => startFocusSession({ originSource: "syllabus_overview", chapter: chapter.chapterId, taskType: "self_study", targetMinutes: 60 })}
        className="flex min-h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-primary-button-border bg-cta px-2 text-[13px] font-bold text-white hover:bg-[#E8623F]"
      >
        Study
      </button>
    </li>
  );
}
