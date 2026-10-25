import type { GridBlock } from "@/lib/timetable/grid";
import type { TemplateId } from "@/lib/timetable/templates";
import type { GoalOptionKey } from "@/lib/onboarding/goal";

/**
 * Everything the five onboarding screens collect, kept on the device until the last Next sends it in one go.
 * Saved on every change, so a reload (or a dropped connection) resumes where the student left off, and a
 * failed submit loses nothing. Stored per student, so a shared phone never shows one student another's answers.
 */

export type CurrentLevel = "CLASS_11" | "CLASS_12" | "DROPPER_1" | "DROPPER_2" | "OTHER";
export type CoachingType = "COACHING" | "SELF_PREP" | "ONLINE_SELF_PREP";

export type OnboardingDraft = {
  version: 1;
  /** The furthest step reached, for resuming (1-5). */
  step: number;
  goal: {
    examId: string | null;
    examCode: string | null;
    examName: string | null;
    subjectIds: number[];
    /** Which of the four goal cards was picked (null until then, and for drafts saved before the cards changed). */
    option: GoalOptionKey | null;
  };
  about: { fullName: string; city: string; phoneNumber: string; examDate: string; currentLevel: CurrentLevel };
  coaching: { type: CoachingType; name: string; batch: string };
  timetable: {
    /** "My routine is the same every day". On unless the student (or a non-uniform template) turns it off. */
    uniformWeek: boolean;
    blocks: GridBlock[];
    /** The template waiting for the student on arrival, and whether their week is still exactly that. */
    templateId: TemplateId | null;
    /** Which coaching + class answers the template was chosen for, so it is reloaded only when they change. */
    templateFor: string | null;
    edited: boolean;
  };
  chapters: { completedIds: string[] };
  updatedAt: number;
};

export function emptyDraft(): OnboardingDraft {
  return {
    version: 1,
    step: 1,
    goal: { examId: null, examCode: null, examName: null, subjectIds: [], option: null },
    about: { fullName: "", city: "", phoneNumber: "", examDate: "", currentLevel: "CLASS_11" },
    coaching: { type: "SELF_PREP", name: "", batch: "" },
    timetable: { uniformWeek: true, blocks: [], templateId: null, templateFor: null, edited: false },
    chapters: { completedIds: [] },
    updatedAt: 0,
  };
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

const KEY_PREFIX = "prepex_onboarding_draft_v1";
const draftKey = (userId: string) => `${KEY_PREFIX}:${userId}`;

/** Reads the saved draft, or null if there is none, it is unreadable, or it is from another version. */
export function loadDraft(userId: string): OnboardingDraft | null {
  try {
    const raw = window.localStorage.getItem(draftKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OnboardingDraft>;
    if (parsed.version !== 1) return null;
    // Merged over the defaults so a draft saved by an older build never leaves a field undefined.
    const base = emptyDraft();
    return {
      ...base,
      ...parsed,
      goal: { ...base.goal, ...parsed.goal },
      about: { ...base.about, ...parsed.about },
      coaching: { ...base.coaching, ...parsed.coaching },
      timetable: { ...base.timetable, ...parsed.timetable },
      chapters: { ...base.chapters, ...parsed.chapters },
    };
  } catch {
    return null;
  }
}

export function saveDraft(userId: string, draft: OnboardingDraft): void {
  try {
    window.localStorage.setItem(draftKey(userId), JSON.stringify({ ...draft, updatedAt: Date.now() }));
  } catch {
    // Private mode or a full disk: onboarding still works, it just will not survive a reload.
  }
}

export function clearDraft(userId: string): void {
  try {
    window.localStorage.removeItem(draftKey(userId));
  } catch {
    // Nothing to clear.
  }
}

// ---------------------------------------------------------------------------
// Dates (the exam date is typed/picked as DD/MM/YYYY)
// ---------------------------------------------------------------------------

export function displayDateToIso(display: string): string | null {
  const match = display.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  const real = date.getUTCFullYear() === Number(year) && date.getUTCMonth() === Number(month) - 1 && date.getUTCDate() === Number(day);
  return real ? `${year}-${month}-${day}` : null;
}

export function isoToDisplayDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : "";
}

/** JEE Main is mid-May, so an unanswered exam date means 15 May: two years out for Class 11, one for everyone else. */
export function defaultExamDateIso(level: CurrentLevel, now: Date = new Date()): string {
  return `${now.getFullYear() + (level === "CLASS_11" ? 2 : 1)}-05-15`;
}

// ---------------------------------------------------------------------------
// Is each step done? (Next stays disabled until it is.)
// ---------------------------------------------------------------------------

export function goalValid(draft: OnboardingDraft, needsSubjects: boolean): boolean {
  return Boolean(draft.goal.examId) && (!needsSubjects || draft.goal.subjectIds.length > 0);
}

export function aboutError(about: OnboardingDraft["about"]): string | null {
  if (!about.fullName.trim()) return "Add your name.";
  if (about.phoneNumber.trim() && !/^\d{10}$/.test(about.phoneNumber.trim())) return "Enter a 10-digit phone number, or leave it blank.";
  if (about.examDate.trim() && !displayDateToIso(about.examDate)) return "Enter your exam date as DD/MM/YYYY.";
  return null;
}

export const aboutValid = (about: OnboardingDraft["about"]) => aboutError(about) === null;

export function coachingValid(coaching: OnboardingDraft["coaching"]): boolean {
  return coaching.type !== "COACHING" || Boolean(coaching.name);
}

export function timetableValid(blocks: GridBlock[]): boolean {
  return blocks.some((b) => b.activityType === "SELF_STUDY" || b.activityType === "PRACTICE");
}

/** The first step whose answers are missing, so a direct visit or a stale resume lands on the right screen. */
export function firstIncompleteStep(draft: OnboardingDraft, needsSubjects: boolean): number {
  if (!goalValid(draft, needsSubjects)) return 1;
  if (!aboutValid(draft.about)) return 2;
  if (!coachingValid(draft.coaching)) return 3;
  if (!timetableValid(draft.timetable.blocks)) return 4;
  return 5;
}
