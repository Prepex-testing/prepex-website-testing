import type { HeatBand, PlannerWindow } from "@/lib/api/logsCommon";
import type { BacklogSource, BacklogStatus } from "@/lib/api/backlogItems";
import type { PracticeDifficulty, PracticeSource } from "@/lib/api/practiceLogs";
import type { RevisionStatus, RevisionType } from "@/lib/api/revisionLogs";

/** Plain-English labels for the closed vocabularies the Phase 3 backend validates. */

export const REVISION_TYPES: { value: RevisionType; label: string }[] = [
  { value: "notes", label: "Notes" },
  { value: "short_notes", label: "Short notes" },
  { value: "handwritten", label: "Handwritten" },
  { value: "formula_sheet", label: "Formula sheet" },
  { value: "mixed", label: "Mixed" },
];

/** All ten sources (nine named + "Other"). */
export const PRACTICE_SOURCES: { value: PracticeSource; label: string }[] = [
  { value: "coaching_dpp", label: "Coaching DPP" },
  { value: "hcv", label: "HC Verma" },
  { value: "dc_pandey", label: "DC Pandey" },
  { value: "allen_modules", label: "Allen modules" },
  { value: "pw_practice", label: "PW practice" },
  { value: "ncert", label: "NCERT" },
  { value: "pyq_mains", label: "PYQ · Mains" },
  { value: "pyq_advanced", label: "PYQ · Advanced" },
  { value: "own_notebook", label: "Own notebook" },
  { value: "other", label: "Other" },
];

export const DIFFICULTIES: { value: PracticeDifficulty; label: string }[] = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
  { value: "mixed", label: "Mixed" },
];

export const WINDOWS: { value: PlannerWindow; label: string; hint: string }[] = [
  { value: "MORNING", label: "Morning", hint: "5–11" },
  { value: "MIDDAY", label: "Midday", hint: "11–4" },
  { value: "EVENING", label: "Evening", hint: "4–9" },
  { value: "NIGHT", label: "Night", hint: "9 on" },
];

export const PRIORITIES: { value: number; label: string }[] = [
  { value: 1, label: "Urgent" },
  { value: 2, label: "High" },
  { value: 3, label: "Normal" },
  { value: 4, label: "Low" },
  { value: 5, label: "Whenever" },
];

export function labelOf<T extends string | number>(list: { value: T; label: string }[], value: T | null | undefined, fallback = ""): string {
  return list.find((x) => x.value === value)?.label ?? fallback;
}

export const REVISION_STATUS_LABEL: Record<RevisionStatus, string> = { fresh: "Fresh", ok: "OK", stale: "Stale", never: "Never revised" };

export const BACKLOG_SOURCE_LABEL: Record<BacklogSource, string> = {
  manual: "Added by you",
  auto_weekly_goal: "Missed weekly goal",
  auto_coaching_sync: "Coaching, not studied yet",
};

export const BACKLOG_STATUS_LABEL: Record<BacklogStatus, string> = { open: "Open", scheduled: "Scheduled", cleared: "Cleared", dropped: "Dropped" };

/** Heatmap colours — each reads on both themes and carries a text label too (colour is never the only signal). */
export const BAND_STYLE: Record<HeatBand, { bg: string; fg: string; label: string }> = {
  red: { bg: "bg-[#EF444426]", fg: "text-[#DC2626] dark:text-[#F87171]", label: "Weak" },
  yellow: { bg: "bg-[#F59E0B26]", fg: "text-[#B45309] dark:text-[#FBBF24]", label: "Getting there" },
  green: { bg: "bg-[#10B98126]", fg: "text-[#047857] dark:text-[#34D399]", label: "Strong" },
};

export const REVISION_STATUS_STYLE: Record<RevisionStatus, { bg: string; fg: string }> = {
  fresh: { bg: "bg-[#10B98126]", fg: "text-[#047857] dark:text-[#34D399]" },
  ok: { bg: "bg-[#6366F126]", fg: "text-[#4338CA] dark:text-[#A5B4FC]" },
  stale: { bg: "bg-[#F59E0B26]", fg: "text-[#B45309] dark:text-[#FBBF24]" },
  never: { bg: "bg-[#EF444426]", fg: "text-[#DC2626] dark:text-[#F87171]" },
};

export function percentLabel(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}
