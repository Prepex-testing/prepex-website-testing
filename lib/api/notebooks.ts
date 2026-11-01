import { CORE_API_BASE_URL } from "@/lib/api/config";
import { apiRequest } from "@/lib/api/http";
import { authenticatedRequest } from "@/lib/api/authRequest";

/**
 * My Notebooks — core-service /api/notebooks. One notebook system for mistakes and notes: chapter notebooks that appear the first time
 * a page lands in a chapter, custom notebooks, pages made of blocks (text, photos, handwriting, a hidden solution), a review ladder,
 * private photo storage and read-only share links.
 */

type Envelope<T> = { success: true; data: T };
const core = <T>(path: string, options: RequestInit = {}) => authenticatedRequest<Envelope<T>>(`${CORE_API_BASE_URL}/api/notebooks${path}`, options).then((r) => r.data);
const send = (method: string, body?: unknown): RequestInit => ({ method, body: JSON.stringify(body ?? {}) });

// ---- vocabulary ----
export const REASONS = ["concept_gap", "silly_calculation", "misread", "formula_forgot", "didnt_know_how_to_start", "time_pressure", "guessed"] as const;
export type Reason = (typeof REASONS)[number];
export const REASON_LABEL: Record<Reason, string> = {
  concept_gap: "Concept gap",
  silly_calculation: "Silly calculation",
  misread: "Misread",
  formula_forgot: "Forgot formula",
  didnt_know_how_to_start: "Could not start",
  time_pressure: "Time pressure",
  guessed: "Guessed",
};

export const SOURCES = ["coaching_dpp", "module", "coaching_test", "mock", "pyq", "book", "prepex_practice"] as const;
export type Source = (typeof SOURCES)[number];
export const SOURCE_LABEL: Record<Source, string> = { coaching_dpp: "Coaching DPP", module: "Module", coaching_test: "Coaching test", mock: "Mock", pyq: "PYQ", book: "Book", prepex_practice: "Prepex practice" };

export type Status = "new" | "reviewing" | "mastered" | "stuck";
export const STATUS_LABEL: Record<Status, string> = { new: "New", reviewing: "Reviewing", mastered: "Mastered", stuck: "Stuck" };

// ---- the page document ----
export type Stroke = { tool: "pen" | "highlighter"; color: string; width: number; points: [number, number, number][] };
export type BlockType = "text" | "heading" | "checklist" | "image" | "ink" | "solution" | "formula" | "file";
export type Block = {
  id: string;
  type: BlockType;
  text?: string;
  level?: number;
  checked?: boolean;
  /** image / file: the stored asset. ink: the image it is drawn on, if any. */
  assetId?: string;
  /** an https picture that is not stored here (migrated pages). */
  url?: string;
  strokes?: Stroke[];
  height?: number;
  hidden?: boolean;
};

export type Entry = {
  id: string;
  notebookId: string;
  entryType: "mistake" | "note";
  title: string;
  blocks: Block[];
  subjectId: number | null;
  chapterId: string | null;
  topic: string | null;
  source: Source | null;
  sourceRef: string | null;
  reason: Reason | null;
  fix: string | null;
  starred: boolean;
  difficulty: "easy" | "medium" | "hard" | null;
  tags: string[];
  status: Status;
  reviewStep: number;
  nextReviewAt: string | null;
  correctStreak: number;
  correctDays: number;
  reviewCount: number;
  lastReviewedAt: string | null;
  masteredAt: string | null;
  practiceQuestionId: string | null;
  mockId: string | null;
  sessionId: string | null;
  needsSolution: boolean;
  createdAt: string;
  updatedAt: string;
};
export type AssetRef = { id: string; type: "image" | "pdf"; mime: string; bytes: number; width: number | null; height: number | null; url: string };
export type EntryWithAssets = Entry & { assets: AssetRef[] };

export type Notebook = { id: string; title: string; subjectId: number | null; chapterId: string | null; kind: "chapter" | "custom"; mistakes: number; notes: number; due: number; mastered: number; masteredPercent: number; needSolution: number; createdAt: string };
export type Usage = { images: number; bytes: number; maxImages: number; maxBytes: number; share: number; warn: boolean; full: boolean };

export type NewEntry = {
  entryType?: "mistake" | "note";
  notebookId?: string;
  chapterId?: string | null;
  subjectId?: number | null;
  title?: string;
  topic?: string | null;
  blocks?: Block[];
  source?: Source | null;
  sourceRef?: string | null;
  reason?: Reason | null;
  fix?: string | null;
  starred?: boolean;
  difficulty?: "easy" | "medium" | "hard" | null;
  tags?: string[];
  mockId?: string | null;
};
export type EntryPatch = Omit<NewEntry, "entryType" | "mockId"> & { status?: Status };

export type EntryFilter = { notebookId?: string; entryType?: "mistake" | "note"; subjectId?: number; chapterId?: string; source?: Source; reason?: Reason; status?: Status; starred?: boolean; q?: string; limit?: number; offset?: number };

const query = (f: Record<string, unknown>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v !== undefined && v !== "" && v !== false) p.set(k, v === true ? "1" : String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
};

export const listNotebooks = () => core<{ notebooks: Notebook[]; dueTotal: number; usage: Usage }>("");
export const createNotebook = (title: string, subjectId?: number | null) => core<Notebook>("", send("POST", { title, ...(subjectId ? { subjectId } : {}) }));
export const renameNotebook = (id: string, title: string) => core<Notebook>(`/${id}`, send("PATCH", { title }));
export const deleteNotebook = (id: string) => core<{ deleted: true }>(`/${id}`, { method: "DELETE" });
export const getUsage = () => core<Usage>("/usage");

export type ListedEntry = Entry & { thumbUrl: string | null };
export const listEntries = (f: EntryFilter = {}) => core<{ items: ListedEntry[]; total: number }>(`/entries${query({ ...f, starred: f.starred ? true : undefined })}`);
export const createEntry = (e: NewEntry) => core<Entry>("/entries", send("POST", e));
export const createEntries = (entries: NewEntry[]) => core<Entry[]>("/entries/batch", send("POST", { entries }));
export const getEntry = (id: string) => core<EntryWithAssets>(`/entries/${id}`);
export const updateEntry = (id: string, patch: EntryPatch) => core<Entry>(`/entries/${id}`, send("PATCH", patch));
export const deleteEntry = (id: string) => core<{ deleted: true }>(`/entries/${id}`, { method: "DELETE" });
export const reopenEntry = (id: string) => core<Entry>(`/entries/${id}/reopen`, send("POST"));
export const reviewEntry = (id: string, result: "correct" | "wrong", timeSpentSec?: number) => core<Entry>(`/entries/${id}/review`, send("POST", { result, ...(timeSpentSec !== undefined ? { timeSpentSec } : {}) }));
export const getDue = (f: { notebookId?: string; chapterId?: string } = {}) => core<{ items: Entry[]; total: number }>(`/due${query(f)}`);
export const getMistakeTest = (n = 10) => core<Entry[]>(`/test${query({ n })}`);
export const setReasons = (items: { entryId: string; reason: Reason }[]) => core<{ updated: number }>("/reasons", send("POST", { items }));

export type Insights = {
  total: number;
  mastered: number;
  masteredPercent: number;
  dueNow: number;
  needSolution: number;
  reasonBySubject: { subjectId: number | null; total: number; reasons: Partial<Record<Reason, number>> }[];
  topChapters: { chapterId: string; mistakes: number; open: number }[];
  sources: Record<string, number>;
};
export const getInsights = (notebookId?: string) => core<Insights>(notebookId ? `/${notebookId}/insights` : "/insights");

export type Share = { id: string; token: string; notebookId: string | null; entryId: string | null; path: string; createdAt: string };
export const listShares = () => core<Share[]>("/shares");
export const createShare = (target: { notebookId?: string; entryId?: string }) => core<{ id: string; token: string; path: string }>("/shares", send("POST", target));
export const revokeShare = (id: string) => core<{ revoked: true }>(`/shares/${id}`, { method: "DELETE" });

/** Adds a photo or PDF to a page. The server re-encodes photos (no location data survives) and enforces the limits. */
export function uploadAsset(entryId: string, file: Blob, name = "photo.webp") {
  const form = new FormData();
  form.append("file", file, name);
  return core<{ id: string; type: "image" | "pdf"; mime: string; bytes: number; width: number | null; height: number | null }>(`/entries/${entryId}/assets`, { method: "POST", body: form });
}
export const deleteAsset = (id: string) => core<{ deleted: true }>(`/assets/${id}`, { method: "DELETE" });

/** The absolute address of a signed file link the server returned (`/api/notebooks/files/...`). */
export const fileUrl = (path: string) => (path.startsWith("http") ? path : `${CORE_API_BASE_URL}${path}`);

// ---- public, read-only ----
export type SharedPage = { id: string; title: string; entryType: string; reason: Reason | null; fix: string | null; source: Source | null; blocks: Block[]; assets: { id: string; type: string; width: number | null; height: number | null; url: string }[] };
export type SharedView = { title: string; pages: SharedPage[] };
export const getShared = (token: string) => apiRequest<Envelope<SharedView>>(`${CORE_API_BASE_URL}/api/shared/${encodeURIComponent(token)}`).then((r) => r.data);
