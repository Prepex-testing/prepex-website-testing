"use client";

import { BarRow, PanelSection } from "@/components/logs/LogScreenScaffold";
import { GhostButton } from "@/components/ui/GhostButton";
import type { SyllabusOverview } from "@/lib/api/syllabus";
import { startFocusSession } from "@/lib/focus/startFocusSession";
import { sectionColor } from "@/lib/goals/display";
import { attentionChapters, type Attention } from "@/lib/insights/attention";

function Row({ a }: { a: Attention }) {
  return (
    <li className="flex items-center justify-between gap-3" data-testid="attention-row">
      <p className="min-w-0 text-[14px] text-ink">
        <span className="block truncate font-semibold">{a.chapter.name}</span>
        <span className="text-[12px] text-muted">
          {a.subjectName} · {a.reason}
        </span>
      </p>
      <GhostButton data-testid="attention-study" onClick={() => startFocusSession({ originSource: "syllabus_overview", chapter: a.chapter.chapterId, taskType: "self_study", targetMinutes: 60 })}>
        Study
      </GhostButton>
    </li>
  );
}

/** The syllabus's right column: what needs attention (weak, then stale), and how far each subject has come. */
export function SyllabusSidePanel({ subjects }: { subjects: SyllabusOverview["subjects"] }) {
  const { weak, stale } = attentionChapters(subjects);
  return (
    <>
      <PanelSection title="Chapters needing attention" testId="syl-attention">
        {weak.length + stale.length === 0 ? (
          <p className="text-[13px] text-muted">Nothing weak or stale right now.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {[...weak, ...stale].map((a) => (
              <Row key={a.chapter.chapterId} a={a} />
            ))}
          </ul>
        )}
      </PanelSection>
      <PanelSection title="Overall subject progress" testId="syl-progress">
        <div className="flex flex-col gap-2">
          {subjects.map((s) => (
            <BarRow key={s.subjectId} label={s.name} value={s.summary.studied} max={Math.max(1, s.summary.chapters)} text={`${s.summary.chapters === 0 ? 0 : Math.round((s.summary.studied / s.summary.chapters) * 100)}%`} color={sectionColor(s.name, s.subjectId)} />
          ))}
        </div>
      </PanelSection>
    </>
  );
}
