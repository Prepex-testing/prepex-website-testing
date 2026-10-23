"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/layout/AuthCard";
import { TimetableBuilder } from "@/components/timetable/TimetableBuilder";
import { StepProgress } from "@/components/ui/StepProgress";
import { useOnboardingDraft, useStepGuard } from "@/lib/onboarding/draft-context";
import { ONBOARDING_TOTAL_STEPS, stepPath } from "@/lib/onboarding/steps";
import { planTimetableStart } from "@/lib/onboarding/timetableStart";
import { useStepTelemetry } from "@/lib/onboarding/useStepTelemetry";
import { useOnboardingSyllabus } from "@/lib/onboarding/useSyllabus";
import { TEMPLATE_OPTIONS, matchesTemplate, type TemplateId } from "@/lib/timetable/templates";
import type { GridBlock } from "@/lib/timetable/grid";

/**
 * Onboarding step 4 of 5: build the week. The coaching and class answers from the last two screens have already
 * picked a starter week, which is loaded (marked "from template") before this screen shows. The student edits it,
 * swaps it, or builds their own; nothing is sent until the last step.
 */
export default function BuildTimetablePage() {
  const router = useRouter();
  const allowed = useStepGuard(4);
  const { draft, update } = useOnboardingDraft();
  const completeStep = useStepTelemetry(4, "timetable");
  const { data: syllabus } = useOnboardingSyllabus();

  // Load the matching starter week before the builder mounts: it reads its blocks once, on mount. Until the
  // effect below has stored it, `pending` is set and nothing renders.
  const pending = allowed ? planTimetableStart(draft) : null;
  useEffect(() => {
    if (!pending) return;
    update((d) => {
      const start = planTimetableStart(d);
      return start ? { ...d, timetable: start } : d;
    });
  }, [pending, update]);

  const subjects = useMemo(() => (syllabus?.subjects ?? []).map((s) => ({ id: s.id, name: s.name })), [syllabus]);

  if (!allowed || pending) return null;

  const { timetable } = draft;
  const template = TEMPLATE_OPTIONS.find((t) => t.id === timetable.templateId);
  const showingTemplate = Boolean(template) && !timetable.edited;

  const handleBlocksChange = (blocks: GridBlock[]) =>
    update((d) => ({
      ...d,
      timetable: {
        ...d.timetable,
        blocks,
        edited: d.timetable.templateId ? !matchesTemplate(blocks, d.timetable.templateId) : blocks.length > 0,
      },
    }));

  const handleTemplateApplied = (id: TemplateId) => update((d) => ({ ...d, timetable: { ...d.timetable, templateId: id } }));

  const handleNext = (blocks: GridBlock[]) => {
    update((d) => ({ ...d, timetable: { ...d.timetable, blocks }, step: Math.max(d.step, 5) }));
    completeStep();
    router.push(stepPath(5));
  };

  return (
    <AuthCard>
      <StepProgress step={4} totalSteps={ONBOARDING_TOTAL_STEPS} />

      <div className="mt-4 flex flex-col gap-3 sm:mt-5">
        <h1 className="text-[24px] font-extrabold leading-tight text-ink sm:text-[32px]">Build your week</h1>
        <p className="text-[14px] font-semibold leading-snug text-neutral-text sm:text-[16px]">
          Show Prepex when school, coaching, meals and sleep happen. It plans your study tasks in the study blocks, around your real
          life instead of on top of it.
        </p>
        {showingTemplate && (
          <p data-testid="template-note" className="rounded-lg bg-tint-strong px-3 py-2 text-[13px] font-medium text-ink dark:bg-[#FAF7F214]">
            We started you with the <strong>{template!.label}</strong> week to match your answers. Change anything, or pick another
            starter week below.
          </p>
        )}
      </div>

      <div className="mt-5">
        <TimetableBuilder
          initialBlocks={timetable.blocks}
          subjects={subjects}
          uniformWeek={timetable.uniformWeek}
          onUniformWeekChange={(uniformWeek) => update((d) => ({ ...d, timetable: { ...d.timetable, uniformWeek } }))}
          onBlocksChange={handleBlocksChange}
          onTemplateApplied={handleTemplateApplied}
          activeTemplateId={timetable.templateId}
          requirePlanningTime
          saveLabel="Next"
          onSave={handleNext}
          secondaryAction={{ label: "Back", placement: "before", onClick: () => router.push(stepPath(3)) }}
        />
      </div>
    </AuthCard>
  );
}
