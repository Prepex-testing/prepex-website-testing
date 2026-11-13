import type { CompleteOnboardingInput } from "@/lib/api/onboarding";
import type { CurrentLevel } from "@/lib/onboarding/draft";
import { toApiBlocks, type GridBlock } from "@/lib/timetable/grid";
import {
  buildWeek,
  coachingSlotsFor,
  defaultHours,
  type CoachingAnswer,
  type CoachingSlot,
  type HoursAnswer,
  type SchoolAnswer,
  type StudyWindow,
  type WeekAnswers,
} from "@/lib/onboardingV2/timetable";

/**
 * Onboarding v2: the canvas's questions, the order they come in, and the one payload they become (the same
 * POST /onboarding/complete body the old five screens send). Pure, so the flow and every path are unit-tested.
 */

export type QuestionId = "prefs" | "name" | "exam" | "class" | "exam_date" | "school" | "coaching" | "coaching_time" | "hours" | "windows" | "week" | "chapters" | "goals";
export type Goal = "JEE_MAIN" | "JEE_BOTH";
export type ClassAnswer = "CLASS_11" | "CLASS_12" | "DROPPER" | "OTHER";

export interface ExamDateChoice {
  kind: "JEE_MAIN" | "JEE_ADVANCED";
  label: string;
  date: string;
  days: number;
  isDefault: boolean;
}

export interface CanvasAnswers {
  version: 1;
  language: "en" | "hi";
  sound: boolean;
  name: string;
  goal: Goal | null;
  level: ClassAnswer | null;
  /** The dates Pexo confirmed or the student changed; empty until the date question. */
  examDates: ExamDateChoice[];
  examDatesChanged: boolean;
  school: SchoolAnswer | null;
  coaching: CoachingAnswer | null;
  coachingSlot: CoachingSlot | null;
  hours: HoursAnswer | null;
  windows: StudyWindow[];
  /** The built (or adjusted) week. */
  week: GridBlock[];
  weekEdited: boolean;
  /** Adjusted as one routine for every day ("same every day" in the editor). Absent on drafts saved before it existed. */
  weekUniform?: boolean;
  chapters: string[];
  /** Questions answered, in order: Back walks this list. */
  history: QuestionId[];
  current: QuestionId;
}

export function emptyAnswers(prefillName = ""): CanvasAnswers {
  return {
    version: 1,
    language: "en",
    sound: false,
    name: prefillName,
    goal: null,
    level: null,
    examDates: [],
    examDatesChanged: false,
    school: null,
    coaching: null,
    coachingSlot: null,
    hours: null,
    windows: [],
    week: [],
    weekEdited: false,
    chapters: [],
    history: [],
    current: "prefs",
  };
}

/** A Google or e-mail placeholder name is not a name to greet anyone by. */
export function usablePrefill(fullName: string | null | undefined): string {
  const n = (fullName ?? "").trim();
  return n && !["student", "user", "apple"].includes(n.toLowerCase()) ? n : "";
}

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? "";

export const levelOf = (c: ClassAnswer | null): CurrentLevel => (c === "DROPPER" ? "DROPPER_1" : (c ?? "CLASS_12"));
export const schoolAsked = (a: Pick<CanvasAnswers, "level">) => a.level === "CLASS_11" || a.level === "CLASS_12";

/** The question after `q`, given the answers so far. Null = the questions are done (building and the finale follow). */
export function nextQuestion(q: QuestionId, a: CanvasAnswers): QuestionId | null {
  switch (q) {
    case "prefs":
      return "name";
    case "name":
      return "exam";
    case "exam":
      return "class";
    case "class":
      return "exam_date";
    case "exam_date":
      return schoolAsked(a) ? "school" : "coaching";
    case "school":
      return "coaching";
    case "coaching":
      return a.coaching === "OFFLINE" ? "coaching_time" : "hours";
    case "coaching_time":
      return "hours";
    case "hours":
      return "windows";
    case "windows":
      return "week";
    case "week":
      return "chapters";
    case "chapters":
      return null;
    case "goals":
      return null;
  }
}

/** How many questions this student will see (for Pexo's staircase); depends on their answers. */
export function totalSteps(a: CanvasAnswers): number {
  let n = 0;
  let q: QuestionId | null = "prefs";
  while (q) {
    n += 1;
    q = nextQuestion(q, a);
  }
  return n + 1; // + the goals proposal
}

export function weekAnswers(a: CanvasAnswers): WeekAnswers {
  const level = levelOf(a.level);
  const school: SchoolAnswer = schoolAsked(a) ? (a.school ?? "NONE") : "NONE";
  const coaching = a.coaching ?? "SELF";
  const allowed = coachingSlotsFor(school);
  return {
    level,
    school,
    coaching,
    coachingSlot: coaching === "OFFLINE" ? (a.coachingSlot && allowed.includes(a.coachingSlot) ? a.coachingSlot : (allowed.at(-1) ?? null)) : null,
    hours: a.hours ?? defaultHours(level, school),
    windows: a.windows.length > 0 ? a.windows : defaultWindows(),
  };
}

/** "Skip for now" on the windows question: evening and night, when most students study. */
export const defaultWindows = (): StudyWindow[] => ["EVENING", "NIGHT"];

export function buildFor(a: CanvasAnswers) {
  return buildWeek(weekAnswers(a));
}

const COACHING_TYPE: Record<CoachingAnswer, CompleteOnboardingInput["coachingType"]> = { OFFLINE: "COACHING", ONLINE: "ONLINE_SELF_PREP", SELF: "SELF_PREP" };

/** The exact body the old flow also sends, plus the v2-only fields the server accepts. */
export function buildPayload(a: CanvasAnswers, examId: string): CompleteOnboardingInput & { jeeMainDate?: string; jeeAdvancedDate?: string; examDateIsDefault?: boolean; flowVersion: "v2" } {
  const next = a.examDates[0];
  const dateOf = (kind: ExamDateChoice["kind"]) => a.examDates.find((d) => d.kind === kind)?.date;
  const blocks = a.week.length > 0 ? a.week : buildFor(a).blocks;
  return {
    examId,
    fullName: a.name.trim() || "Student",
    targetExamDate: (a.goal === "JEE_BOTH" ? dateOf("JEE_ADVANCED") : dateOf("JEE_MAIN")) ?? next?.date ?? "",
    ...(a.examDatesChanged
      ? { ...(dateOf("JEE_MAIN") ? { jeeMainDate: dateOf("JEE_MAIN")! } : {}), ...(dateOf("JEE_ADVANCED") ? { jeeAdvancedDate: dateOf("JEE_ADVANCED")! } : {}) }
      : { examDateIsDefault: true }),
    currentLevel: levelOf(a.level),
    coachingType: COACHING_TYPE[a.coaching ?? "SELF"],
    timetable: {
      // the generated week differs on Sunday; an adjusted one is uniform when the student kept "same every day"
      uniformWeek: a.weekEdited ? a.weekUniform === true : false,
      source: a.weekEdited ? "MANUAL" : "COACHING_TEMPLATE",
      blocks: toApiBlocks(blocks).map((b) => {
        const rest = { ...b };
        delete rest.id;
        return rest;
      }),
    },
    completedChapterIds: a.chapters,
    flowVersion: "v2",
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Voice: what a spoken answer means, per question. English and Hinglish keywords; the student always confirms by tap.
// ---------------------------------------------------------------------------------------------------------------------

const KEYWORDS: Partial<Record<QuestionId, [string, RegExp][]>> = {
  exam: [
    ["JEE_BOTH", /\b(advanced|advance|both|dono|iit)\b/],
    ["JEE_MAIN", /\b(main|mains|jee)\b/],
  ],
  class: [
    ["CLASS_11", /\b(11|11th|eleven|eleventh|gyarah|gyarahvi|gyaarvi)\b/],
    ["CLASS_12", /\b(12|12th|twelve|twelfth|barah|barahvi|baarvi)\b/],
    ["DROPPER", /\b(drop|dropper|dropping|gap year|repeater)\b/],
    ["OTHER", /\b(other|kuch aur|something else)\b/],
  ],
  exam_date: [
    ["YES", /\b(yes|yeah|haan|han|ha|sahi|right|correct|theek|thik)\b/],
    ["CHANGE", /\b(no|nahi|nahin|change|badlo|different|alag)\b/],
  ],
  school: [
    ["NONE", /\b(no school|nahi jata|nahi jaati|dummy|don't go|dont go|no)\b/],
    ["MORNING", /\b(morning|subah|7|seven)\b/],
    ["DAY", /\b(day|din|9|nine|afternoon)\b/],
  ],
  coaching: [
    ["OFFLINE", /\b(offline|institute|class jata|centre|center)\b/],
    ["ONLINE", /\b(online|app|youtube|live)\b/],
    ["SELF", /\b(self|khud|no coaching|nahi|myself|own)\b/],
  ],
  coaching_time: [
    ["MORNING", /\b(morning|subah)\b/],
    ["AFTERNOON", /\b(afternoon|dopahar|din)\b/],
    ["EVENING", /\b(evening|shaam|sham)\b/],
  ],
  hours: [
    ["10", /\b(10|ten|das|10\+|more|zyada|bahut)\b/],
    ["8", /\b(8|eight|aath|aat)\b/],
    ["6", /\b(6|six|chhe|che|chhah)\b/],
    ["4", /\b(4|four|chaar|char)\b/],
    ["2", /\b(2|two|do)\b/],
  ],
};

const HINDI_DIGITS: Record<string, string> = { "०": "0", "१": "1", "२": "2", "३": "3", "४": "4", "५": "5", "६": "6", "७": "7", "८": "8", "९": "9" };

/** The option a transcript points to for this question, or null when it is unclear. Never a guess between two. */
export function matchVoice(q: QuestionId, transcript: string): string | null {
  const rules = KEYWORDS[q];
  if (!rules) return null;
  const text = transcript.toLowerCase().replace(/[०-९]/g, (d) => HINDI_DIGITS[d] ?? d).replace(/[.,!?]/g, " ");
  const hits = rules.filter(([, re]) => re.test(text)).map(([id]) => id);
  // "jee main and advanced" names both: the more specific one (listed first) wins; anything else ambiguous is no match
  if (q === "exam" && hits.includes("JEE_BOTH")) return "JEE_BOTH";
  if (q === "school" && hits.includes("NONE")) return "NONE";
  return hits.length === 1 ? hits[0]! : null;
}

export const VOICE_QUESTIONS: ReadonlySet<QuestionId> = new Set(Object.keys(KEYWORDS) as QuestionId[]);

/** "20 Jan 2027" for Pexo's {date}: the format the rest of the app uses. */
export function spokenDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d} ${MONTHS[(m ?? 1) - 1]} ${y}`;
}
