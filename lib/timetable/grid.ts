import type { ActivityType, ApiBlock } from "@/lib/api/timetable";

/**
 * Pure logic behind the timetable grid: snapping, collision rules, and the
 * conversions to/from the API shape. No React, no DOM — so every rule the
 * drag-and-drop UI relies on is unit-tested (grid.test.ts).
 *
 * Time is held as minutes since midnight (0–1440); a day is Monday = 0 … Sunday = 6.
 */

export const SLOT_MINUTES = 15;
export const DAY_MINUTES = 1440;
export const MIN_BLOCK_MINUTES = 15;
export const DEFAULT_DROP_MINUTES = 60;
export const DAY_COUNT = 7;

export const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const DAY_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

export type GridBlock = {
  /** Stable client key (React key + drag identity). */
  key: string;
  /** Server id once saved. */
  id?: string;
  dayOfWeek: number;
  startMin: number;
  endMin: number;
  activityType: ActivityType;
  subjectId: number | null;
  label: string | null;
};

export type GridResult = { blocks: GridBlock[]; error?: string; block?: GridBlock };

let keyCounter = 0;
export function newKey(): string {
  keyCounter += 1;
  return `blk_${Date.now().toString(36)}_${keyCounter}`;
}

// ---------------------------------------------------------------------------
// Time helpers
// ---------------------------------------------------------------------------

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** Rounds to the nearest 15-minute line, inside the day. */
export function snap(minutes: number): number {
  return clamp(Math.round(minutes / SLOT_MINUTES) * SLOT_MINUTES, 0, DAY_MINUTES);
}

export function toTime(minutes: number): string {
  if (minutes >= DAY_MINUTES) return "24:00";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function parseTime(time: string): number {
  const [h, m] = time.split(":").map(Number) as [number, number];
  return h * 60 + m;
}

/** "9 AM", "9:15 AM", "12 PM" — for compact labels. */
export function formatClock(minutes: number): string {
  const total = minutes >= DAY_MINUTES ? 0 : minutes;
  const h24 = Math.floor(total / 60);
  const m = total % 60;
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return m === 0 ? `${h12} ${suffix}` : `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function formatRange(startMin: number, endMin: number): string {
  return `${formatClock(startMin)} – ${formatClock(endMin)}`;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// ---------------------------------------------------------------------------
// Collisions
// ---------------------------------------------------------------------------

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function blocksOnDay(blocks: GridBlock[], day: number, ignoreKey?: string): GridBlock[] {
  return blocks.filter((b) => b.dayOfWeek === day && b.key !== ignoreKey).sort((a, b) => a.startMin - b.startMin);
}

export function hasOverlap(blocks: GridBlock[], day: number, start: number, end: number, ignoreKey?: string): boolean {
  return blocksOnDay(blocks, day, ignoreKey).some((b) => overlaps(start, end, b.startMin, b.endMin));
}

/** The start of the first block that begins at/after `from` on this day (or the end of the day). */
function nextBlockStart(blocks: GridBlock[], day: number, from: number, ignoreKey?: string): number {
  const next = blocksOnDay(blocks, day, ignoreKey).find((b) => b.startMin >= from);
  return next ? next.startMin : DAY_MINUTES;
}

/** The end of the last block that finishes at/before `to` on this day (or the start of the day). */
function previousBlockEnd(blocks: GridBlock[], day: number, to: number, ignoreKey?: string): number {
  const prev = [...blocksOnDay(blocks, day, ignoreKey)].reverse().find((b) => b.endMin <= to);
  return prev ? prev.endMin : 0;
}

// ---------------------------------------------------------------------------
// Editing
// ---------------------------------------------------------------------------

export type NewBlockInput = {
  dayOfWeek: number;
  /** Where the student pressed / dropped. */
  startMin: number;
  /** Where they dragged to; omit for a default-length drop. */
  endMin?: number;
  activityType: ActivityType;
  subjectId?: number | null;
  label?: string | null;
};

/**
 * Adds a block. The span is snapped to 15 minutes and clipped so it never
 * overlaps a neighbour: dragging down stops at the next block, dragging up stops
 * at the previous one. A press that lands inside an existing block is refused.
 */
export function addBlock(blocks: GridBlock[], input: NewBlockInput): GridResult {
  const day = clamp(input.dayOfWeek, 0, DAY_COUNT - 1);
  const anchor = snap(input.startMin);
  const dragEnd = input.endMin === undefined ? anchor + DEFAULT_DROP_MINUTES : snap(input.endMin);

  let start = Math.min(anchor, dragEnd);
  let end = Math.max(anchor, dragEnd);
  if (end - start < MIN_BLOCK_MINUTES) end = start + (input.endMin === undefined ? DEFAULT_DROP_MINUTES : MIN_BLOCK_MINUTES);

  start = clamp(start, 0, DAY_MINUTES - MIN_BLOCK_MINUTES);
  end = clamp(end, start + MIN_BLOCK_MINUTES, DAY_MINUTES);

  // Pressed inside an existing block → nothing to create.
  if (blocksOnDay(blocks, day).some((b) => b.startMin <= anchor && anchor < b.endMin)) {
    return { blocks, error: "That time is already taken." };
  }

  // Clip to the free gap around the press point.
  const gapEnd = nextBlockStart(blocks, day, anchor);
  const gapStart = previousBlockEnd(blocks, day, anchor);
  start = Math.max(start, gapStart);
  end = Math.min(end, gapEnd);
  if (end - start < MIN_BLOCK_MINUTES) return { blocks, error: "Not enough free time there." };

  const block: GridBlock = {
    key: newKey(),
    dayOfWeek: day,
    startMin: start,
    endMin: end,
    activityType: input.activityType,
    subjectId: input.subjectId ?? null,
    label: input.label ?? null,
  };
  return { blocks: [...blocks, block], block };
}

/** Moves a block (keeping its length) to a new day/start. Refused if it would overlap or leave the day. */
export function moveBlock(blocks: GridBlock[], key: string, dayOfWeek: number, startMin: number): GridResult {
  const block = blocks.find((b) => b.key === key);
  if (!block) return { blocks, error: "Block not found." };
  const length = block.endMin - block.startMin;
  const day = clamp(dayOfWeek, 0, DAY_COUNT - 1);
  const start = clamp(snap(startMin), 0, DAY_MINUTES - length);
  const end = start + length;
  if (hasOverlap(blocks, day, start, end, key)) return { blocks, error: "That would overlap another block." };
  const moved = { ...block, dayOfWeek: day, startMin: start, endMin: end };
  return { blocks: blocks.map((b) => (b.key === key ? moved : b)), block: moved };
}

/** Changes a block's end (bottom handle). Clamped to 15 minutes minimum and to the next block. */
export function resizeBlock(blocks: GridBlock[], key: string, endMin: number): GridResult {
  const block = blocks.find((b) => b.key === key);
  if (!block) return { blocks, error: "Block not found." };
  const limit = nextBlockStart(blocks, block.dayOfWeek, block.endMin, key);
  const end = clamp(snap(endMin), block.startMin + MIN_BLOCK_MINUTES, Math.max(block.startMin + MIN_BLOCK_MINUTES, limit));
  const resized = { ...block, endMin: end };
  return { blocks: blocks.map((b) => (b.key === key ? resized : b)), block: resized };
}

/** Changes a block's start (top handle). Clamped to 15 minutes minimum and to the previous block. */
export function resizeBlockStart(blocks: GridBlock[], key: string, startMin: number): GridResult {
  const block = blocks.find((b) => b.key === key);
  if (!block) return { blocks, error: "Block not found." };
  const limit = previousBlockEnd(blocks, block.dayOfWeek, block.startMin, key);
  const start = clamp(snap(startMin), Math.min(limit, block.endMin - MIN_BLOCK_MINUTES), block.endMin - MIN_BLOCK_MINUTES);
  const resized = { ...block, startMin: start };
  return { blocks: blocks.map((b) => (b.key === key ? resized : b)), block: resized };
}

export function updateBlock(
  blocks: GridBlock[],
  key: string,
  patch: Partial<Pick<GridBlock, "activityType" | "subjectId" | "label">>,
): GridBlock[] {
  return blocks.map((b) => (b.key === key ? { ...b, ...patch } : b));
}

export function removeBlock(blocks: GridBlock[], key: string): GridBlock[] {
  return blocks.filter((b) => b.key !== key);
}

/** Replaces every target day with a copy of `fromDay`'s blocks. */
export function copyDay(blocks: GridBlock[], fromDay: number, toDays: number[]): GridBlock[] {
  const source = blocksOnDay(blocks, fromDay);
  const targets = new Set(toDays.filter((d) => d !== fromDay && d >= 0 && d < DAY_COUNT));
  const kept = blocks.filter((b) => !targets.has(b.dayOfWeek));
  const copies = [...targets].flatMap((day) =>
    source.map((b) => ({ ...b, key: newKey(), id: undefined, dayOfWeek: day })),
  );
  return [...kept, ...copies];
}

// ---------------------------------------------------------------------------
// Summaries
// ---------------------------------------------------------------------------

export const STUDY_ACTIVITIES: ActivityType[] = ["SELF_STUDY", "PRACTICE", "REVISION"];

export function studyMinutes(blocks: GridBlock[], day?: number): number {
  return blocks
    .filter((b) => STUDY_ACTIVITIES.includes(b.activityType) && (day === undefined || b.dayOfWeek === day))
    .reduce((sum, b) => sum + (b.endMin - b.startMin), 0);
}

// ---------------------------------------------------------------------------
// API shape
// ---------------------------------------------------------------------------

export function fromApiBlocks(blocks: ApiBlock[]): GridBlock[] {
  return blocks.map((b) => ({
    key: b.id ?? newKey(),
    id: b.id,
    dayOfWeek: b.dayOfWeek,
    startMin: parseTime(b.startTime),
    endMin: parseTime(b.endTime),
    activityType: b.activityType,
    subjectId: b.subjectId ?? null,
    label: b.label ?? null,
  }));
}

export function toApiBlocks(blocks: GridBlock[]): ApiBlock[] {
  return [...blocks]
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startMin - b.startMin)
    .map((b) => ({
      ...(b.id ? { id: b.id } : {}),
      dayOfWeek: b.dayOfWeek,
      startTime: toTime(b.startMin),
      endTime: toTime(b.endMin),
      activityType: b.activityType,
      subjectId: b.subjectId,
      label: b.label && b.label.trim() ? b.label.trim() : null,
    }));
}
