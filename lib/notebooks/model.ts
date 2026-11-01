import type { Block, BlockType, Entry, Notebook, Reason, Stroke, Usage } from "@/lib/api/notebooks";
import { REASON_LABEL } from "@/lib/api/notebooks";

/** The pure parts of the notebook screens: block helpers, plain-language notes, the storage notice and the stats sentences. */

let counter = 0;
export function newId(): string {
  counter += 1;
  return `b${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function blank(type: BlockType, extra: Partial<Block> = {}): Block {
  switch (type) {
    case "text":
    case "formula":
    case "solution":
      return { id: newId(), type, text: "", ...extra };
    case "heading":
      return { id: newId(), type, text: "", level: 2, ...extra };
    case "checklist":
      return { id: newId(), type, text: "", checked: false, ...extra };
    case "ink":
      return { id: newId(), type, strokes: [], height: 320, ...extra };
    default:
      return { id: newId(), type, ...extra };
  }
}

/** The first non-empty line of text on a page: its title when it has none. */
export function titleOf(e: Pick<Entry, "title" | "blocks" | "entryType">): string {
  if (e.title.trim()) return e.title.trim();
  for (const b of e.blocks) if ((b.type === "text" || b.type === "heading") && b.text?.trim()) return b.text.trim().split("\n")[0]!.slice(0, 80);
  return e.entryType === "note" ? "Untitled note" : "Untitled mistake";
}

/** The first photo of a page, for its thumbnail in the list. */
export function thumbOf(e: Pick<Entry, "blocks">, assets: { id: string; url: string }[] = []): { assetId?: string; url?: string } | null {
  const img = e.blocks.find((b) => b.type === "image");
  if (!img) return null;
  const found = img.assetId ? assets.find((a) => a.id === img.assetId) : undefined;
  return { ...(img.assetId ? { assetId: img.assetId } : {}), ...(found ? { url: found.url } : img.url ? { url: img.url } : {}) };
}

export function hasInk(blocks: Block[]): boolean {
  return blocks.some((b) => b.type === "ink" && (b.strokes?.length ?? 0) > 0);
}

export function strokeCount(blocks: Block[]): number {
  return blocks.reduce((n, b) => n + (b.strokes?.length ?? 0), 0);
}

/** "Saved 3 minutes ago" style helpers for the quiet save indicator. */
export type SaveState = "saved" | "saving" | "dirty" | "error";
export const SAVE_TEXT: Record<SaveState, string> = { saved: "Saved", saving: "Saving…", dirty: "Unsaved changes", error: "Could not save. Retrying" };

// ---- storage notice ----
export type StorageNotice = { level: "none" | "warn" | "full"; text: string };
export function storageNotice(u: Usage | null | undefined): StorageNotice {
  if (!u) return { level: "none", text: "" };
  if (u.full) return { level: "full", text: "Storage limit reached. Delete some images to add more." };
  if (u.warn) return { level: "warn", text: `You have used ${Math.round(u.share * 100)}% of your notebook storage (${u.images} of ${u.maxImages} images).` };
  return { level: "none", text: "" };
}

export function mb(bytes: number): string {
  return bytes >= 1024 * 1024 * 1024 ? `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB` : `${Math.max(0.1, bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---- review and due ----
export function dueLabel(e: Pick<Entry, "nextReviewAt" | "masteredAt">, now = new Date()): string {
  if (e.masteredAt) return "Mastered";
  if (!e.nextReviewAt) return "";
  const days = Math.round((new Date(e.nextReviewAt).getTime() - now.getTime()) / 86_400_000);
  if (days <= 0) return "Due now";
  return days === 1 ? "Due tomorrow" : `Due in ${days} days`;
}

export function isDue(e: Pick<Entry, "nextReviewAt" | "masteredAt" | "entryType">, now = new Date()): boolean {
  return e.entryType === "mistake" && !e.masteredAt && !!e.nextReviewAt && new Date(e.nextReviewAt) <= now;
}

// ---- stats sentences ----
const FIX: Partial<Record<Reason, string>> = {
  silly_calculation: "slow down on calculations rather than re-learning concepts",
  misread: "read the question twice and underline what is asked",
  formula_forgot: "build a one-page formula sheet and revise it",
  concept_gap: "go back to the concept and re-learn it, then re-solve",
  time_pressure: "practise under a timer in short sets",
  guessed: "skip what you cannot start and come back to it",
  didnt_know_how_to_start: "study a worked example for the first step, then try again",
};

/** The one-line insight for a subject: the biggest reason and what to do about it. Null when there is too little data. */
export function insightFor(subjectName: string, total: number, reasons: Partial<Record<Reason, number>>): string | null {
  const tagged = Object.values(reasons).reduce((a, b) => a + (b ?? 0), 0);
  if (total < 5 || tagged < 3) return null;
  const [top, n] = (Object.entries(reasons) as [Reason, number][]).sort((a, b) => b[1] - a[1])[0]!;
  const pct = Math.round((n / tagged) * 100);
  return `${pct}% of your ${subjectName} mistakes are "${REASON_LABEL[top].toLowerCase()}": ${FIX[top] ?? "work on that first"}.`;
}

/** Notebook cover colours by subject (the same palette as the planner). */
export const COVER: Record<string, string> = { physics: "#6366F1", chemistry: "#10B981", maths: "#F59E0B", biology: "#EC4899" };
export function coverFor(subjectName: string | null | undefined): string {
  const k = (subjectName ?? "").toLowerCase().replace("mathematics", "maths");
  return COVER[k] ?? "#8B5CF6";
}

export function sortNotebooks(list: Notebook[]): Notebook[] {
  return [...list].sort((a, b) => b.due - a.due || b.mistakes + b.notes - (a.mistakes + a.notes) || a.title.localeCompare(b.title));
}

export function strokeBounds(s: Stroke[]): { w: number; h: number } {
  let w = 0;
  let h = 0;
  for (const st of s) for (const [x, y] of st.points) { w = Math.max(w, x); h = Math.max(h, y); }
  return { w, h };
}
