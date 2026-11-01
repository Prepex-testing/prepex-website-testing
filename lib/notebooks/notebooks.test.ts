import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Entry, Notebook, Usage } from "@/lib/api/notebooks";
import { blank, dueLabel, insightFor, isDue, sortNotebooks, storageNotice, strokeBounds, thumbOf, titleOf } from "@/lib/notebooks/model";
import { readLast, setPending, takePending, writeLast } from "@/lib/notebooks/pendingCapture";

vi.mock("@/lib/api/notebooks", async (orig) => ({
  ...(await orig<typeof import("@/lib/api/notebooks")>()),
  createEntry: vi.fn(),
  uploadAsset: vi.fn(),
  updateEntry: vi.fn(),
}));
vi.mock("@/lib/notebooks/compress", () => ({ compressImage: vi.fn(async (b: Blob) => b) }));
import { createEntry, updateEntry, uploadAsset } from "@/lib/api/notebooks";
import { saveCapturedBatch, saveCapturedMistake } from "@/lib/notebooks/saveCapture";

const entry = (over: Partial<Entry> = {}): Entry => ({ id: "e1", notebookId: "n1", entryType: "mistake", title: "", blocks: [], subjectId: 1, chapterId: "c1", topic: null, source: null, sourceRef: null, reason: null, fix: null, starred: false, difficulty: null, tags: [], status: "new", reviewStep: 0, nextReviewAt: null, correctStreak: 0, correctDays: 0, reviewCount: 0, lastReviewedAt: null, masteredAt: null, practiceQuestionId: null, mockId: null, sessionId: null, needsSolution: false, createdAt: "2026-11-01T00:00:00Z", updatedAt: "2026-11-01T00:00:00Z", ...over });
const book = (over: Partial<Notebook> = {}): Notebook => ({ id: "n", title: "A", subjectId: 1, chapterId: null, kind: "chapter", mistakes: 0, notes: 0, due: 0, mastered: 0, masteredPercent: 0, needSolution: 0, createdAt: "", ...over });

describe("page titles and thumbnails", () => {
  it("uses the title, else the first line of text, else a plain name", () => {
    expect(titleOf(entry({ title: " Pulley " }))).toBe("Pulley");
    expect(titleOf(entry({ blocks: [{ id: "a", type: "text", text: "A block slides\nover a table" }] }))).toBe("A block slides");
    expect(titleOf(entry())).toBe("Untitled mistake");
    expect(titleOf(entry({ entryType: "note" }))).toBe("Untitled note");
  });

  it("thumbnail is the first photo, resolved through its asset", () => {
    const e = entry({ blocks: [{ id: "t", type: "text", text: "x" }, { id: "i", type: "image", assetId: "a1" }] });
    expect(thumbOf(e, [{ id: "a1", url: "/f/a1" }])).toEqual({ assetId: "a1", url: "/f/a1" });
    expect(thumbOf(entry())).toBeNull();
  });

  it("blank blocks carry the fields their type needs", () => {
    expect(blank("ink").strokes).toEqual([]);
    expect(blank("checklist").checked).toBe(false);
    expect(blank("heading").level).toBe(2);
    expect(blank("text").id).not.toBe(blank("text").id);
  });
});

describe("review state", () => {
  const now = new Date("2026-11-10T00:00:00Z");
  it("due now, tomorrow, in N days, mastered", () => {
    expect(dueLabel({ nextReviewAt: "2026-11-09T00:00:00Z", masteredAt: null }, now)).toBe("Due now");
    expect(dueLabel({ nextReviewAt: "2026-11-11T00:00:00Z", masteredAt: null }, now)).toBe("Due tomorrow");
    expect(dueLabel({ nextReviewAt: "2026-11-15T00:00:00Z", masteredAt: null }, now)).toBe("Due in 5 days");
    expect(dueLabel({ nextReviewAt: null, masteredAt: "2026-11-01T00:00:00Z" }, now)).toBe("Mastered");
  });

  it("only an unmastered mistake past its date is due", () => {
    expect(isDue({ entryType: "mistake", nextReviewAt: "2026-11-09T00:00:00Z", masteredAt: null }, now)).toBe(true);
    expect(isDue({ entryType: "note", nextReviewAt: "2026-11-09T00:00:00Z", masteredAt: null }, now)).toBe(false);
    expect(isDue({ entryType: "mistake", nextReviewAt: "2026-11-09T00:00:00Z", masteredAt: "2026-11-01T00:00:00Z" }, now)).toBe(false);
  });
});

describe("storage notice", () => {
  const usage = (over: Partial<Usage>): Usage => ({ images: 10, bytes: 1000, maxImages: 500, maxBytes: 1_000_000_000, share: 0.1, warn: false, full: false, ...over });
  it("says nothing under 80%, warns at 80%, blocks at 100%", () => {
    expect(storageNotice(usage({})).level).toBe("none");
    expect(storageNotice(usage({ warn: true, share: 0.83, images: 415 })).text).toContain("83%");
    expect(storageNotice(usage({ full: true, share: 1 })).level).toBe("full");
    expect(storageNotice(null).level).toBe("none");
  });
});

describe("stats sentences", () => {
  it("names the biggest reason and what to do about it", () => {
    const line = insightFor("Physics", 10, { silly_calculation: 6, concept_gap: 2 });
    expect(line).toContain("75%");
    expect(line).toContain("silly calculation");
  });

  it("stays quiet when there is too little behind it", () => {
    expect(insightFor("Physics", 3, { silly_calculation: 3 })).toBeNull();
    expect(insightFor("Physics", 10, { silly_calculation: 1 })).toBeNull();
  });

  it("puts notebooks with due pages first", () => {
    const sorted = sortNotebooks([book({ id: "a", title: "A", mistakes: 9 }), book({ id: "b", title: "B", due: 2, mistakes: 1 })]);
    expect(sorted.map((b) => b.id)).toEqual(["b", "a"]);
  });

  it("measures the extent of a drawing", () => {
    expect(strokeBounds([{ tool: "pen", color: "auto", width: 3, points: [[10, 20, 0.5], [40, 5, 0.5]] }])).toEqual({ w: 40, h: 20 });
  });
});

describe("pending capture", () => {
  it("hands photos over exactly once", () => {
    const f = new File(["x"], "a.png", { type: "image/png" });
    setPending([f]);
    expect(takePending()).toEqual([f]);
    expect(takePending()).toEqual([]);
  });

  it("remembers the last chapter and source, and survives a blocked store", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", { localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) } });
    writeLast({ chapterId: "c1", subjectId: 1, source: "mock" });
    expect(readLast()).toEqual({ chapterId: "c1", subjectId: 1, source: "mock" });
    vi.stubGlobal("window", { localStorage: { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } } });
    expect(readLast()).toEqual({ chapterId: null, subjectId: null, source: null });
    expect(() => writeLast({ chapterId: null, subjectId: null, source: null })).not.toThrow();
    vi.unstubAllGlobals();
  });
});

describe("saving captured photos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createEntry).mockImplementation(async () => entry({ id: `e${vi.mocked(createEntry).mock.calls.length}` }));
    vi.mocked(uploadAsset).mockResolvedValue({ id: "asset1", type: "image", mime: "image/webp", bytes: 10, width: 1, height: 1 });
    vi.mocked(updateEntry).mockResolvedValue(entry());
  });

  it("makes the page, attaches the photo, and the photo becomes the page body", async () => {
    const id = await saveCapturedMistake({ blob: new Blob(["x"]), reason: "misread" }, { chapterId: "c1", subjectId: 1, source: "coaching_dpp", sourceRef: "DPP 4 Q12" });
    expect(id).toBe("e1");
    expect(createEntry).toHaveBeenCalledWith(expect.objectContaining({ entryType: "mistake", chapterId: "c1", reason: "misread", source: "coaching_dpp", sourceRef: "DPP 4 Q12", mockId: null }));
    expect(uploadAsset).toHaveBeenCalledWith("e1", expect.any(Blob), "photo.webp");
    expect(updateEntry).toHaveBeenCalledWith("e1", { blocks: [expect.objectContaining({ type: "image", assetId: "asset1" })] });
  });

  it("carries the mock link through for 'Add mistakes from this test'", async () => {
    await saveCapturedMistake({ blob: new Blob(["x"]), reason: null }, { chapterId: null, subjectId: null, source: "mock", mockId: "m1" });
    expect(createEntry).toHaveBeenCalledWith(expect.objectContaining({ mockId: "m1", source: "mock", chapterId: null }));
  });

  it("a batch keeps going when one photo fails and says which one", async () => {
    vi.mocked(uploadAsset).mockRejectedValueOnce(new Error("offline")).mockResolvedValue({ id: "a2", type: "image", mime: "image/webp", bytes: 1, width: 1, height: 1 });
    const progress: number[] = [];
    const out = await saveCapturedBatch([{ blob: new Blob(["1"]), reason: null }, { blob: new Blob(["2"]), reason: "guessed" }], { chapterId: "c1", subjectId: 1, source: null }, (d) => progress.push(d));
    expect(out.failed).toEqual([0]);
    expect(out.saved).toHaveLength(1);
    expect(progress).toEqual([1, 2]);
  });
});

describe("PDF export grouping", () => {
  const blocks = [
    { id: "a", type: "text", text: "Q" },
    { id: "b", type: "image", assetId: "x" },
    { id: "c", type: "solution", text: "Use $F=ma$" },
    { id: "d", type: "solution", text: "  " },
    { id: "e", type: "text", text: "after" },
  ] as import("@/lib/api/notebooks").Block[];

  it("keeps the question together, the solution on its own, and skips empty solutions", async () => {
    const { segments } = await import("@/lib/notebooks/print");
    const out = segments(blocks, false);
    expect(out.map((s) => s.kind)).toEqual(["blocks", "solution", "blocks"]);
    expect(out[0]!.blocks).toHaveLength(2);
  });

  it("'Hide solutions' removes every solution block", async () => {
    const { segments } = await import("@/lib/notebooks/print");
    const out = segments(blocks, true);
    expect(out.every((s) => s.kind === "blocks")).toBe(true);
    expect(out.flatMap((s) => s.blocks).some((b) => b.type === "solution")).toBe(false);
  });
});
