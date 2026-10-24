import { describe, expect, it } from "vitest";
import { emptyDraft, type OnboardingDraft } from "@/lib/onboarding/draft";
import { planTimetableStart, templateKey } from "@/lib/onboarding/timetableStart";
import { isUniformWeek, updateBlock } from "@/lib/timetable/grid";
import { buildTemplate, matchesTemplate } from "@/lib/timetable/templates";

function draftWith(coaching: OnboardingDraft["coaching"]["type"], level: OnboardingDraft["about"]["currentLevel"]): OnboardingDraft {
  const d = emptyDraft();
  return { ...d, coaching: { ...d.coaching, type: coaching }, about: { ...d.about, currentLevel: level } };
}

describe("planTimetableStart: the coaching answer picks the starter week", () => {
  it("hands a school-year coaching student School + Coaching, marked from the template, with each day separate", () => {
    const start = planTimetableStart(draftWith("COACHING", "CLASS_12"))!;
    expect(start.templateId).toBe("SCHOOL_COACHING");
    expect(matchesTemplate(start.blocks, "SCHOOL_COACHING")).toBe(true);
    expect(start.blocks.every((b) => b.fromTemplate)).toBe(true);
    expect(start.edited).toBe(false);
    // School + Coaching differs by day, so one repeated routine would erase the difference.
    expect(start.uniformWeek).toBe(false);
  });

  it("hands a dropper in coaching Dropper + Coaching", () => {
    expect(planTimetableStart(draftWith("COACHING", "DROPPER_1"))!.templateId).toBe("DROPPER_COACHING");
  });

  it("hands a self-prep student Self-Prep, which is the same every day, so the toggle starts on", () => {
    const start = planTimetableStart(draftWith("SELF_PREP", "CLASS_11"))!;
    expect(start.templateId).toBe("SELF_PREP");
    expect(start.uniformWeek).toBe(true);
    expect(isUniformWeek(start.blocks)).toBe(true);
  });

  it("leaves the week alone when it was already loaded for these answers (reload, or Back then Next)", () => {
    const first = draftWith("COACHING", "CLASS_12");
    const loaded = { ...first, timetable: planTimetableStart(first)! };
    expect(planTimetableStart(loaded)).toBeNull();
  });

  it("swaps to the new matching template when the answers changed and the week is still the template", () => {
    const first = draftWith("COACHING", "CLASS_12");
    const loaded = { ...first, timetable: planTimetableStart(first)! };
    const changed: OnboardingDraft = { ...loaded, coaching: { ...loaded.coaching, type: "SELF_PREP" } };
    expect(templateKey(changed)).not.toBe(changed.timetable.templateFor);
    expect(planTimetableStart(changed)!.templateId).toBe("SELF_PREP");
  });

  it("keeps the student's own work when the answers change after they edited the week", () => {
    const first = draftWith("COACHING", "CLASS_12");
    const loaded = { ...first, timetable: planTimetableStart(first)! };
    const blocks = updateBlock(loaded.timetable.blocks, loaded.timetable.blocks[0]!.key, { label: "My own" });
    const edited: OnboardingDraft = { ...loaded, timetable: { ...loaded.timetable, blocks, edited: true }, coaching: { ...loaded.coaching, type: "SELF_PREP" } };

    const next = planTimetableStart(edited)!;
    expect(next.blocks).toBe(blocks);
    expect(next.templateFor).toBe(templateKey(edited));
  });

  it("builds fresh blocks each time (a template can be loaded twice)", () => {
    const a = planTimetableStart(draftWith("SELF_PREP", "CLASS_12"))!;
    const b = buildTemplate("SELF_PREP");
    expect(new Set([...a.blocks, ...b].map((x) => x.key)).size).toBe(a.blocks.length + b.length);
  });
});
