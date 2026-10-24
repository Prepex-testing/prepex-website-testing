import type { OnboardingDraft } from "@/lib/onboarding/draft";
import { isUniformWeek } from "@/lib/timetable/grid";
import { buildTemplate, matchesTemplate, pickTemplateId } from "@/lib/timetable/templates";

/** The two answers that decide which starter week fits: coaching and class. */
export const templateKey = (draft: OnboardingDraft) => `${draft.coaching.type}|${draft.about.currentLevel}`;

/**
 * What the timetable step should open with. The coaching and class answers pick a starter week
 * (self-prep -> Self-Prep, coaching + school years -> School + Coaching, coaching + dropper -> Dropper + Coaching);
 * it is loaded, marked "from template", before the student sees the screen.
 *
 * Returns the timetable to start from, or null to leave it alone:
 *   - already loaded for these same answers (a reload, or coming back with Back)  -> keep exactly what is there
 *   - the answers changed but the student has built or edited their own week       -> keep their work
 *   - otherwise (first arrival, or answers changed and the week is still the template) -> load the matching template
 *
 * A template that differs by day (school on weekdays, a different Sunday) opens with "same every day" off,
 * because one routine repeated seven times would erase the difference. A template that is the same every day
 * (Self-Prep) opens with it on.
 */
export function planTimetableStart(draft: OnboardingDraft): OnboardingDraft["timetable"] | null {
  const key = templateKey(draft);
  const tt = draft.timetable;
  if (tt.templateFor === key) return null;

  const untouched = tt.blocks.length === 0 || (tt.templateId !== null && matchesTemplate(tt.blocks, tt.templateId));
  if (!untouched) return { ...tt, templateFor: key };

  const templateId = pickTemplateId(draft.coaching.type, draft.about.currentLevel);
  const blocks = buildTemplate(templateId);
  return { uniformWeek: isUniformWeek(blocks), blocks, templateId, templateFor: key, edited: false };
}
