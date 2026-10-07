import type { ActivityType } from "@/lib/api/timetable";
import { parseTime, newKey, type GridBlock } from "@/lib/timetable/grid";

/**
 * Starter timetables. Each is a plain week of typical blocks the student then
 * edits — a starting point, never a promise about their real day. Every
 * template is validated for overlaps and 15-minute alignment in templates.test.ts.
 */

export type TemplateId = "SCHOOL_COACHING" | "DROPPER_COACHING" | "SELF_PREP";

export const TEMPLATE_OPTIONS: { id: TemplateId; label: string; description: string }[] = [
  { id: "SCHOOL_COACHING", label: "School + Coaching", description: "School in the day, coaching in the evening" },
  { id: "DROPPER_COACHING", label: "Dropper + Coaching", description: "Full-day coaching with long study blocks" },
  { id: "SELF_PREP", label: "Self-Prep Only", description: "You plan the whole day yourself" },
];

type Row = { days: number[]; start: string; end: string; type: ActivityType; label?: string };

const MON_FRI = [0, 1, 2, 3, 4];
const MON_SAT = [0, 1, 2, 3, 4, 5];
const ALL = [0, 1, 2, 3, 4, 5, 6];
const SAT = [5];
const SUN = [6];

const TEMPLATES: Record<TemplateId, Row[]> = {
  SCHOOL_COACHING: [
    { days: MON_SAT, start: "00:00", end: "06:00", type: "SLEEP" },
    { days: MON_SAT, start: "06:00", end: "06:45", type: "EXERCISE" },
    { days: MON_SAT, start: "06:45", end: "07:30", type: "MEAL", label: "Breakfast" },
    { days: MON_FRI, start: "07:30", end: "14:00", type: "SCHOOL" },
    { days: SAT, start: "07:30", end: "12:30", type: "SCHOOL" },
    { days: MON_FRI, start: "14:00", end: "14:45", type: "MEAL", label: "Lunch" },
    { days: SAT, start: "12:30", end: "13:15", type: "MEAL", label: "Lunch" },
    { days: MON_FRI, start: "14:45", end: "15:30", type: "BREAK", label: "Rest / travel" },
    { days: MON_SAT, start: "15:30", end: "18:30", type: "COACHING" },
    { days: MON_SAT, start: "18:30", end: "19:00", type: "BREAK" },
    { days: MON_SAT, start: "19:00", end: "21:00", type: "SELF_STUDY" },
    { days: MON_SAT, start: "21:00", end: "21:45", type: "MEAL", label: "Dinner" },
    { days: MON_SAT, start: "21:45", end: "22:45", type: "REVISION" },
    { days: MON_SAT, start: "22:45", end: "24:00", type: "SLEEP" },
    { days: SUN, start: "00:00", end: "06:30", type: "SLEEP" },
    { days: SUN, start: "06:30", end: "07:15", type: "EXERCISE" },
    { days: SUN, start: "07:15", end: "08:00", type: "MEAL", label: "Breakfast" },
    { days: SUN, start: "08:30", end: "12:30", type: "SELF_STUDY" },
    { days: SUN, start: "12:30", end: "13:30", type: "MEAL", label: "Lunch" },
    { days: SUN, start: "13:30", end: "15:30", type: "FAMILY" },
    { days: SUN, start: "15:30", end: "19:30", type: "PRACTICE" },
    { days: SUN, start: "19:30", end: "20:30", type: "MEAL", label: "Dinner" },
    { days: SUN, start: "20:30", end: "22:00", type: "REVISION" },
    { days: SUN, start: "22:30", end: "24:00", type: "SLEEP" },
  ],

  DROPPER_COACHING: [
    { days: MON_SAT, start: "00:00", end: "06:00", type: "SLEEP" },
    { days: MON_SAT, start: "06:00", end: "06:45", type: "EXERCISE" },
    { days: MON_SAT, start: "06:45", end: "07:30", type: "MEAL", label: "Breakfast" },
    { days: MON_SAT, start: "07:30", end: "09:00", type: "REVISION" },
    { days: MON_SAT, start: "09:00", end: "14:00", type: "COACHING" },
    { days: MON_SAT, start: "14:00", end: "15:00", type: "MEAL", label: "Lunch + rest" },
    { days: MON_SAT, start: "15:00", end: "18:30", type: "SELF_STUDY" },
    { days: MON_SAT, start: "18:30", end: "19:15", type: "BREAK" },
    { days: MON_FRI, start: "19:15", end: "21:30", type: "SELF_STUDY" },
    { days: SAT, start: "19:15", end: "21:30", type: "PRACTICE" },
    { days: MON_SAT, start: "21:30", end: "22:15", type: "MEAL", label: "Dinner" },
    { days: MON_SAT, start: "22:15", end: "23:00", type: "REVISION" },
    { days: MON_SAT, start: "23:00", end: "24:00", type: "SLEEP" },
    { days: SUN, start: "00:00", end: "06:30", type: "SLEEP" },
    { days: SUN, start: "06:30", end: "07:15", type: "EXERCISE" },
    { days: SUN, start: "07:15", end: "08:00", type: "MEAL", label: "Breakfast" },
    { days: SUN, start: "08:30", end: "11:30", type: "PRACTICE", label: "Weekly test / PYQs" },
    { days: SUN, start: "11:30", end: "12:30", type: "BREAK" },
    { days: SUN, start: "12:30", end: "13:30", type: "REVISION" },
    { days: SUN, start: "13:30", end: "14:30", type: "MEAL", label: "Lunch" },
    { days: SUN, start: "15:00", end: "17:00", type: "FAMILY" },
    { days: SUN, start: "17:00", end: "20:00", type: "SELF_STUDY" },
    { days: SUN, start: "20:00", end: "21:00", type: "MEAL", label: "Dinner" },
    { days: SUN, start: "21:00", end: "22:00", type: "REVISION" },
    { days: SUN, start: "22:30", end: "24:00", type: "SLEEP" },
  ],

  SELF_PREP: [
    { days: ALL, start: "00:00", end: "06:00", type: "SLEEP" },
    { days: ALL, start: "06:00", end: "06:45", type: "EXERCISE" },
    { days: ALL, start: "06:45", end: "07:30", type: "MEAL", label: "Breakfast" },
    { days: ALL, start: "07:30", end: "11:30", type: "SELF_STUDY" },
    { days: ALL, start: "11:30", end: "12:30", type: "MEAL", label: "Lunch" },
    { days: ALL, start: "12:30", end: "13:30", type: "BREAK" },
    { days: ALL, start: "13:30", end: "16:30", type: "SELF_STUDY" },
    { days: ALL, start: "16:30", end: "17:15", type: "BREAK" },
    { days: ALL, start: "17:15", end: "19:30", type: "PRACTICE" },
    { days: ALL, start: "19:30", end: "20:30", type: "MEAL", label: "Dinner" },
    { days: ALL, start: "20:30", end: "22:00", type: "REVISION" },
    { days: ALL, start: "23:00", end: "24:00", type: "SLEEP" },
  ],
};

/** Expands a template into editable grid blocks (fresh keys, no server ids). */
export function buildTemplate(id: TemplateId): GridBlock[] {
  return TEMPLATES[id].flatMap((row) =>
    row.days.map((dayOfWeek) => ({
      key: newKey(),
      dayOfWeek,
      startMin: parseTime(row.start),
      endMin: parseTime(row.end),
      activityType: row.type,
      subjectId: null,
      label: row.label ?? null,
    })),
  );
}
