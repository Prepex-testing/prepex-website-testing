import type { BoardFilter, BoardKind, BoardResult } from "@/lib/api/social";

export const BOARDS: { id: BoardKind; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "month", label: "This month" },
  { id: "improved", label: "Most improved" },
];

export const FILTERS: { id: BoardFilter; label: string }[] = [
  { id: "following", label: "Following" },
  { id: "coaching", label: "My coaching" },
  { id: "year", label: "My target year" },
  { id: "india", label: "All India" },
];

/** "38 XP behind #7", shown for the student's own position even when they are outside the visible rows. */
export function gapText(me: BoardResult["me"]): string | null {
  if (me.hidden) return "Hidden from boards. You still earn XP.";
  if (me.rank === null) return null;
  if (me.gapToAbove === null) return me.rank === 1 ? "You are first" : null;
  return `${me.gapToAbove.xp} XP behind #${me.gapToAbove.rank}`;
}

export function formatHours(hours: number): string {
  if (hours <= 0) return "0h";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

/** The line under the filters: what window this is and when it resets. */
export function boardCaption(data: Pick<BoardResult, "board" | "from" | "to" | "resetsOn" | "total">): string {
  const window = data.board === "today" ? "Today" : data.board === "month" ? "This month" : "This month against your last month";
  return `${window} · ${data.total} ${data.total === 1 ? "student" : "students"} ranked · resets ${data.resetsOn}`;
}
