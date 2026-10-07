import { CORE_API_BASE_URL } from "@/lib/api/config";
import { authenticatedRequest } from "@/lib/api/authRequest";

/** Weekly timetable — core-service /api/timetable/*. */

export type ActivityType =
  | "SCHOOL"
  | "COACHING"
  | "SELF_STUDY"
  | "PRACTICE"
  | "REVISION"
  | "SLEEP"
  | "MEAL"
  | "BREAK"
  | "EXERCISE"
  | "PRAYER"
  | "FAMILY";

export type TimetableSource = "MANUAL" | "OCR" | "COACHING_TEMPLATE";

export type ApiBlock = {
  id?: string;
  /** 0 = Monday … 6 = Sunday. */
  dayOfWeek: number;
  /** "HH:MM" 24-hour; endTime may be "24:00" (end of day). */
  startTime: string;
  endTime: string;
  activityType: ActivityType;
  subjectId: number | null;
  label: string | null;
};

export type Timetable = {
  id: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  source: TimetableSource;
  blocks: Array<ApiBlock & { id: string }>;
};

function timetableRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  return authenticatedRequest<T>(`${CORE_API_BASE_URL}/api/timetable${path}`, options);
}

export function getCurrentTimetable() {
  return timetableRequest<{ success: true; data: { timetable: Timetable | null } }>("/current");
}

export function createTimetable(input: { source?: TimetableSource; blocks: ApiBlock[] }) {
  return timetableRequest<{ success: true; data: Timetable }>("", {
    method: "POST",
    body: JSON.stringify({
      source: input.source ?? "MANUAL",
      blocks: input.blocks.map(stripId),
    }),
  });
}

/** Bulk save for the grid: the payload IS the timetable (replaceAll). */
export function saveTimetableBlocks(timetableId: string, blocks: ApiBlock[]) {
  return timetableRequest<{ success: true; data: Timetable }>("/blocks", {
    method: "POST",
    body: JSON.stringify({ timetableId, replaceAll: true, blocks }),
  });
}

export function deleteTimetableBlock(blockId: string) {
  return timetableRequest<{ success: true; data: { deleted: true } }>(`/blocks/${blockId}`, {
    method: "DELETE",
  });
}

/** Converts the student's uploaded coaching schedule (OCR) into a timetable. */
export function importTimetableFromOcr(uploadedScheduleId?: string) {
  return timetableRequest<{ success: true; data: Timetable }>("/from-ocr", {
    method: "POST",
    body: JSON.stringify(uploadedScheduleId ? { uploadedScheduleId } : {}),
  });
}

function stripId(block: ApiBlock): Omit<ApiBlock, "id"> {
  const rest: Partial<ApiBlock> = { ...block };
  delete rest.id;
  return rest as Omit<ApiBlock, "id">;
}
