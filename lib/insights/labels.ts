import type { GridLabel } from "@/lib/api/masterAnalytics";
import type { Difficulty, Strength, TheoryStatus } from "@/lib/api/syllabus";

/** Labels and colours for chapter strength, theory status and the syllabus screens. */

export const STRENGTH_STYLE: Record<GridLabel, { label: string; dot: string; bg: string; fg: string }> = {
  strong: { label: "Strong", dot: "#10B981", bg: "#10B9811F", fg: "#047857" },
  medium: { label: "Medium", dot: "#F59E0B", bg: "#F59E0B24", fg: "#B45309" },
  weak: { label: "Weak", dot: "#EF4444", bg: "#EF44441F", fg: "#B91C1C" },
  unrated: { label: "Not rated yet", dot: "#9CA3AF", bg: "#9CA3AF22", fg: "#6B7280" },
};

export function strengthKey(label: Strength | null | undefined): GridLabel {
  return label ?? "unrated";
}

export const THEORY_LABEL: Record<TheoryStatus, string> = { not_started: "Not started", learning: "Learning", studied: "Theory done" };

export const THEORY_OPTIONS: { value: TheoryStatus; label: string }[] = [
  { value: "not_started", label: "Not started" },
  { value: "learning", label: "Learning" },
  { value: "studied", label: "Theory done" },
];

export const DIFFICULTY_LABEL: Record<Difficulty, string> = { EASY: "Easy", MEDIUM: "Medium", HARD: "Hard" };

/** 0.0344 → "3.4%". The weightage is the chapter's share of the whole paper (an estimate). */
export function weightageLabel(weightage: number | null | undefined): string {
  if (weightage === null || weightage === undefined) return "—";
  const pct = weightage * 100;
  return `${pct >= 10 ? Math.round(pct) : Math.round(pct * 10) / 10}%`;
}

export function hoursLabel(hours: number): string {
  if (hours <= 0) return "0h";
  return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`;
}

/** The facts under a chapter title: "Class 11 · NCERT 3 · 1.5h of ~12h". */
export function chapterMeta(c: { class: number | null; ncertChapterNumber: number | null; estimatedHours: number | null; progress: { hours: number } }): string {
  const parts: string[] = [];
  if (c.class) parts.push(`Class ${c.class}`);
  if (c.ncertChapterNumber) parts.push(`NCERT ${c.ncertChapterNumber}`);
  parts.push(c.estimatedHours ? `${hoursLabel(c.progress.hours)} of ~${hoursLabel(c.estimatedHours)}` : hoursLabel(c.progress.hours));
  return parts.join(" · ");
}

export const COUNT_ROWS: { aspect: "lecture" | "dpp" | "hcv" | "module" | "pyq_mains" | "pyq_advanced" | "revision"; key: "lecture" | "dpp" | "hcv" | "module" | "pyqMains" | "pyqAdvanced" | "revision"; label: string }[] = [
  { aspect: "lecture", key: "lecture", label: "Lectures watched" },
  { aspect: "dpp", key: "dpp", label: "DPPs done" },
  { aspect: "hcv", key: "hcv", label: "HC Verma sets" },
  { aspect: "module", key: "module", label: "Module sets" },
  { aspect: "pyq_mains", key: "pyqMains", label: "PYQ sets (Mains)" },
  { aspect: "pyq_advanced", key: "pyqAdvanced", label: "PYQ sets (Advanced)" },
  { aspect: "revision", key: "revision", label: "Revisions" },
];
