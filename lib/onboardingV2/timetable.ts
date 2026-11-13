import type { ActivityType } from "@/lib/api/timetable";
import type { CurrentLevel } from "@/lib/onboarding/draft";
import { newKey, type GridBlock } from "@/lib/timetable/grid";

/**
 * Onboarding v2, step 8: the week is BUILT from four one-tap answers instead of drawn. Pure and deterministic (apart
 * from the React keys), so the property test can walk every combination. The rules are the audit's
 * (docs/onboarding-v2-audit.md, "Auto-timetable rules"):
 *
 *   1. Fixed blocks first: sleep, school (Mon-Sat), offline coaching (Mon-Sat, 3 h) or online coaching (2 h), meals.
 *   2. Study only in the free time, inside the windows the student picked first; outside them only if needed.
 *   3. The day's study is split 50 / 30 / 20: self-study, practice, revision (revision at least 45 min, and always the
 *      LAST study block of the day: revision tasks only fit REVISION slots). Blocks are 45-120 min with a 15 min break
 *      between back-to-back blocks; everything is rounded to 15 min.
 *   4. Sunday: no school, no coaching, one hour more, and a "Weekly test / PYQs" practice block.
 *   5. Guarantees: self-study and revision every day; at least 7 h of sleep; a weekday never has more than 10 h of
 *      study, and never more than 6 h for a Class 11/12 student who also goes to school.
 *
 * Days are 0 = Monday ... 6 = Sunday, minutes from midnight; no block wraps midnight.
 */

export type SchoolAnswer = "MORNING" | "DAY" | "NONE";
export type CoachingAnswer = "OFFLINE" | "ONLINE" | "SELF";
export type CoachingSlot = "MORNING" | "AFTERNOON" | "EVENING";
export type StudyWindow = "EARLY_MORNING" | "MORNING" | "AFTERNOON" | "EVENING" | "NIGHT";
export type HoursAnswer = 2 | 4 | 6 | 8 | 10;

export interface WeekAnswers {
  level: CurrentLevel;
  school: SchoolAnswer;
  coaching: CoachingAnswer;
  /** Only for offline coaching. */
  coachingSlot: CoachingSlot | null;
  hours: HoursAnswer;
  windows: readonly StudyWindow[];
}

export const SCHOOL_TIMES: Record<Exclude<SchoolAnswer, "NONE">, [number, number]> = { MORNING: [7 * 60, 13 * 60], DAY: [9 * 60, 15 * 60] };
export const COACHING_TIMES: Record<CoachingSlot, [number, number]> = { MORNING: [7 * 60, 10 * 60], AFTERNOON: [13 * 60, 16 * 60], EVENING: [16 * 60, 19 * 60] };
export const WINDOW_TIMES: Record<StudyWindow, [number, number]> = {
  EARLY_MORNING: [5 * 60 + 30, 7 * 60 + 30],
  MORNING: [8 * 60, 12 * 60],
  AFTERNOON: [13 * 60 + 30, 17 * 60],
  EVENING: [17 * 60, 21 * 60],
  NIGHT: [21 * 60, 23 * 60 + 30],
};
const WINDOW_ORDER: StudyWindow[] = ["EARLY_MORNING", "MORNING", "AFTERNOON", "EVENING", "NIGHT"];

/** The hours question's pre-selected answer: 4 with school, 8 for a dropper, 6 otherwise. */
export function defaultHours(level: CurrentLevel, school: SchoolAnswer): HoursAnswer {
  if (level === "DROPPER_1" || level === "DROPPER_2") return 8;
  return school !== "NONE" ? 4 : 6;
}

/** Offline coaching slots that do not overlap school. */
export function coachingSlotsFor(school: SchoolAnswer): CoachingSlot[] {
  const all: CoachingSlot[] = ["MORNING", "AFTERNOON", "EVENING"];
  if (school === "NONE") return all;
  const [s, e] = SCHOOL_TIMES[school];
  return all.filter((slot) => {
    const [cs, ce] = COACHING_TIMES[slot];
    return ce <= s || cs >= e;
  });
}

export const MIN_SLEEP = 7 * 60;
export const WEEKDAY_CAP = 10 * 60;
export const SCHOOL_CAP = 6 * 60;
const BREAK = 15;
const MAX_CHUNK = 120;
const MIN_CHUNK = 45;

type Interval = [number, number];
type Planned = Omit<GridBlock, "key">;

const r15 = (m: number) => Math.round(m / 15) * 15;
const isSchoolStudent = (a: WeekAnswers) => a.school !== "NONE" && (a.level === "CLASS_11" || a.level === "CLASS_12");

/** The minutes of study planned for a weekday (Mon-Sat) and for Sunday. */
export function dailyTargets(a: WeekAnswers): { weekday: number; sunday: number } {
  const cap = isSchoolStudent(a) ? SCHOOL_CAP : WEEKDAY_CAP;
  const weekday = Math.min(a.hours * 60, cap);
  return { weekday, sunday: Math.min(weekday + 60, WEEKDAY_CAP + 60) };
}

/** When the student wakes and sleeps: 30 min before the earliest picked window (no later than 07:00, early enough for school or coaching), 23:00 or 23:30 with Night, and never under 7 h of sleep. */
export function sleepTimes(a: WeekAnswers): { wake: number; bed: number } {
  const bed = a.windows.includes("NIGHT") ? 23 * 60 + 30 : 23 * 60;
  const earliestWindow = Math.min(...a.windows.map((w) => WINDOW_TIMES[w][0]), 7 * 60 + 30);
  let wake = Math.min(earliestWindow - 30, 7 * 60);
  if (a.school !== "NONE") wake = Math.min(wake, SCHOOL_TIMES[a.school][0] - 60);
  if (a.coaching === "OFFLINE" && a.coachingSlot) wake = Math.min(wake, COACHING_TIMES[a.coachingSlot][0] - 60);
  // at least 7 h of sleep: an early riser who also picked Night goes to bed at the same time but wakes later
  wake = Math.max(wake, bed + MIN_SLEEP - 24 * 60);
  return { wake: r15(wake), bed };
}

function overlaps(a: Interval, b: Interval) {
  return a[0] < b[1] && b[0] < a[1];
}

function freeSegments(busy: Interval[], from: number, to: number): Interval[] {
  const sorted = [...busy].sort((x, y) => x[0] - y[0]);
  const out: Interval[] = [];
  let cursor = from;
  for (const [s, e] of sorted) {
    if (e <= cursor) continue;
    if (s > cursor) out.push([cursor, Math.min(s, to)]);
    cursor = Math.max(cursor, e);
    if (cursor >= to) break;
  }
  if (cursor < to) out.push([cursor, to]);
  return out.filter(([s, e]) => e - s > 0);
}

/** The first free half-slot of `length` among `candidates` (start times), or null. */
function placeAt(busy: Interval[], candidates: number[], length: number): Interval | null {
  for (const start of candidates) {
    const iv: Interval = [start, start + length];
    if (!busy.some((b) => overlaps(b, iv))) return iv;
  }
  return null;
}

/** Study chunks for a day, in order: self-study, practice, revision last. */
export function splitStudy(total: number, sunday: boolean): { type: ActivityType; minutes: number; label: string | null }[] {
  const revision = Math.max(MIN_CHUNK, r15(total * 0.2));
  let practice = r15(total * 0.3);
  if (practice < 30) practice = 0;
  let self = total - revision - practice;
  if (self < 30) {
    practice = Math.max(0, practice - (30 - self));
    self = total - revision - practice;
  }
  const chunks: { type: ActivityType; minutes: number; label: string | null }[] = [];
  const push = (type: ActivityType, minutes: number, label: string | null = null) => {
    let left = minutes;
    while (left > 0) {
      const n = Math.ceil(left / MAX_CHUNK);
      const size = r15(left / n) || left;
      const piece = Math.min(left, Math.max(size, Math.min(left, MIN_CHUNK)));
      chunks.push({ type, minutes: piece, label });
      left -= piece;
    }
  };
  push("SELF_STUDY", self);
  if (sunday && practice > 0) push("PRACTICE", practice, "Weekly test / PYQs");
  else push("PRACTICE", practice);
  push("REVISION", revision);
  return chunks;
}

/** Place the chunks in order into the segments, a 15 min break between back-to-back blocks. Null if they do not fit. */
function placeChunks(segments: Interval[], chunks: ReturnType<typeof splitStudy>): Planned[] | null {
  const out: Planned[] = [];
  const segs = segments.map((s) => [...s] as Interval);
  let i = 0;
  for (const chunk of chunks) {
    let left = chunk.minutes;
    while (left > 0) {
      while (i < segs.length && segs[i]![1] - segs[i]![0] < Math.min(left, MIN_CHUNK)) i += 1;
      if (i >= segs.length) return null;
      const seg = segs[i]!;
      const take = Math.min(left, seg[1] - seg[0]);
      // never leave a sliver under 45 min of a chunk to place later
      const piece = left - take > 0 && left - take < MIN_CHUNK ? take - (MIN_CHUNK - (left - take)) : take;
      if (piece < Math.min(left, MIN_CHUNK)) {
        i += 1;
        continue;
      }
      out.push({ dayOfWeek: 0, startMin: seg[0], endMin: seg[0] + piece, activityType: chunk.type, subjectId: null, label: chunk.label });
      seg[0] += piece;
      left -= piece;
      if (seg[1] - seg[0] >= BREAK) {
        out.push({ dayOfWeek: 0, startMin: seg[0], endMin: seg[0] + BREAK, activityType: "BREAK", subjectId: null, label: null });
        seg[0] += BREAK;
      } else {
        i += 1;
      }
    }
  }
  // a break after the last block is not needed
  while (out.length && out[out.length - 1]!.activityType === "BREAK") out.pop();
  return out;
}

/** Free study time for a day: inside the picked windows first, then (only if needed) the rest of the free time. */
function studySegments(busy: Interval[], wake: number, bed: number, windows: readonly StudyWindow[], need: number): Interval[] {
  const free = freeSegments(busy, wake, bed);
  const picked = WINDOW_ORDER.filter((w) => windows.includes(w)).map((w) => WINDOW_TIMES[w]);
  const inWindows: Interval[] = [];
  for (const f of free) for (const w of picked) {
    const s = Math.max(f[0], w[0]);
    const e = Math.min(f[1], w[1]);
    if (e - s >= MIN_CHUNK) inWindows.push([s, e]);
  }
  const merged = mergeIntervals(inWindows);
  const capacity = merged.reduce((sum, [s, e]) => sum + (e - s), 0);
  if (capacity >= need * 1.3) return merged;
  // not enough room in the windows: also use the free time around them, keeping the order of the day
  return mergeIntervals(free.filter(([s, e]) => e - s >= MIN_CHUNK));
}

function mergeIntervals(list: Interval[]): Interval[] {
  const sorted = [...list].sort((a, b) => a[0] - b[0]);
  const out: Interval[] = [];
  for (const iv of sorted) {
    const last = out[out.length - 1];
    if (last && iv[0] <= last[1]) last[1] = Math.max(last[1], iv[1]);
    else out.push([...iv] as Interval);
  }
  return out;
}

export interface BuiltWeek {
  blocks: GridBlock[];
  /** Planned study minutes on a weekday (the hours Pexo quotes). */
  weekdayStudyMinutes: number;
  /** When the weekday revision block starts, "HH:MM". */
  revisionTime: string;
  weeklyStudyMinutes: number;
}

const STUDY: ReadonlySet<ActivityType> = new Set(["SELF_STUDY", "PRACTICE", "REVISION"] as ActivityType[]);

export function buildWeek(a: WeekAnswers): BuiltWeek {
  const { wake, bed } = sleepTimes(a);
  const targets = dailyTargets(a);
  const planned: Planned[] = [];

  for (let day = 0; day < 7; day += 1) {
    const sunday = day === 6;
    const fixed: Planned[] = [];
    const add = (iv: Interval, activityType: ActivityType, label: string | null = null, extra: Partial<Planned> = {}) =>
      fixed.push({ dayOfWeek: day, startMin: iv[0], endMin: iv[1], activityType, subjectId: null, label, ...extra });

    add([0, wake], "SLEEP");
    if (bed < 24 * 60) add([bed, 24 * 60], "SLEEP");
    if (!sunday && a.school !== "NONE") add(SCHOOL_TIMES[a.school], "SCHOOL");
    if (!sunday && a.coaching === "OFFLINE") {
      const slot = a.coachingSlot && coachingSlotsFor(a.school).includes(a.coachingSlot) ? a.coachingSlot : coachingSlotsFor(a.school).at(-1)!;
      add(COACHING_TIMES[slot], "COACHING", null, { mode: "offline" });
    }
    const busy = (): Interval[] => fixed.map((b) => [b.startMin, b.endMin]);
    if (!sunday && a.coaching === "ONLINE") {
      const iv = placeAt(busy(), [19 * 60, 17 * 60, 18 * 60, 16 * 60, 15 * 60, 10 * 60], 120);
      if (iv) add(iv, "COACHING", null, { mode: "online" });
    }
    // meals: breakfast soon after waking, lunch around 13:00 (or after school), dinner around 20:30
    const breakfast = placeAt(busy(), [wake + 15, wake + 30, wake, wake + 45], 30);
    if (breakfast) add(breakfast, "MEAL", "Breakfast");
    const schoolEnd = !sunday && a.school !== "NONE" ? SCHOOL_TIMES[a.school][1] : 0;
    const lunchFrom = schoolEnd > 13 * 60 ? [schoolEnd, schoolEnd + 15, schoolEnd + 30] : [13 * 60, 12 * 60 + 30, 13 * 60 + 30, 12 * 60, 14 * 60, 16 * 60];
    const lunch = placeAt(busy(), lunchFrom, 45);
    if (lunch) add(lunch, "MEAL", "Lunch");
    const dinner = placeAt(busy(), [20 * 60 + 30, 21 * 60, 20 * 60, 21 * 60 + 15, 19 * 60 + 30, 19 * 60], 45);
    if (dinner) add(dinner, "MEAL", "Dinner");

    // study: as much of the target as fits, shrinking 15 min at a time until revision can be placed last
    let target = sunday ? targets.sunday : targets.weekday;
    let study: Planned[] | null = null;
    while (target >= 90 && !study) {
      study = placeChunks(studySegments(busy(), wake, bed, a.windows, target), splitStudy(target, sunday));
      if (!study) target -= 15;
    }
    planned.push(...fixed, ...(study ?? []).map((b) => ({ ...b, dayOfWeek: day })));
  }

  const blocks = planned
    .sort((x, y) => x.dayOfWeek - y.dayOfWeek || x.startMin - y.startMin)
    .map((b) => ({ ...b, key: newKey(), fromTemplate: true }) as GridBlock);
  const studyOn = (day: number) => blocks.filter((b) => b.dayOfWeek === day && STUDY.has(b.activityType)).reduce((s, b) => s + b.endMin - b.startMin, 0);
  const revision = blocks.find((b) => b.dayOfWeek === 0 && b.activityType === "REVISION");
  const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  return {
    blocks,
    weekdayStudyMinutes: studyOn(0),
    revisionTime: revision ? hhmm(revision.startMin) : "",
    weeklyStudyMinutes: [0, 1, 2, 3, 4, 5, 6].reduce((s, d) => s + studyOn(d), 0),
  };
}
