// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// the URL keeps the page being left until the router catches up (that lag caused the snap-back)
let search = new URLSearchParams("page=m1");
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace }), usePathname: () => "/notebooks/b1", useSearchParams: () => search, useParams: () => ({ id: "b1" }) }));
vi.mock("@/components/study/StudyShell", () => ({ StudyShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/components/study/useSubjects", () => ({ useSubjects: () => ({ status: "ready", lookup: { subjectName: () => "Physics", chapterName: () => null }, subjects: [] }) }));
vi.mock("@/components/notebooks/EntryPage", () => ({ EntryPage: ({ entryId }: { entryId: string }) => <div data-testid="entry-page">{entryId}</div> }));
vi.mock("@/components/notebooks/StatsPanel", () => ({ StatsPanel: () => null }));
vi.mock("@/components/notebooks/ShareModal", () => ({ ShareModal: () => null }));
vi.mock("@/components/ui/ConfirmModal", () => ({ ConfirmModal: () => null }));
const mistake = { id: "m1", notebookId: "b1", entryType: "mistake", title: "A mistake", blocks: [], tags: [], status: "new", thumbUrl: null, createdAt: "2026-11-01T00:00:00Z", updatedAt: "2026-11-01T00:00:00Z" };
vi.mock("@/lib/api/notebooks", async (orig) => ({
  ...(await orig<typeof import("@/lib/api/notebooks")>()),
  listNotebooks: vi.fn(async () => ({ notebooks: [{ id: "b1", title: "Kinematics", subjectId: 1, chapterId: "c1", kind: "chapter", mistakes: 1, notes: 0, due: 0, mastered: 0, masteredPercent: 0, needSolution: 0, createdAt: "" }], dueTotal: 0, usage: { images: 0, bytes: 0, maxImages: 500, maxBytes: 1, share: 0, warn: false, full: false } })),
  // a notebook with only mistakes: the Notes tab is empty
  listEntries: vi.fn(async (q: { entryType?: string }) => ({ items: q.entryType === "note" ? [] : [mistake], total: q.entryType === "note" ? 0 : 1 })),
}));
import NotebookPage from "@/app/(app)/notebooks/[id]/page";

describe("notebook tabs", () => {
  it("a notebook with only mistakes opens its (empty) Notes tab and stays there (it snapped back to Mistakes, 2 Nov)", async () => {
    search = new URLSearchParams("page=m1");
    render(<NotebookPage />);
    await screen.findByTestId("entry-page");
    await act(async () => void fireEvent.click(screen.getByTestId("tab-notes")));
    // the router has not caught up yet: the URL still names the mistake being left
    await act(async () => new Promise((r) => setTimeout(r, 50)));
    await waitFor(() => expect(screen.getByTestId("tab-notes")).toHaveAttribute("aria-current", "page"));
    expect(screen.getByTestId("tab-mistakes")).not.toHaveAttribute("aria-current");
    expect(replace).toHaveBeenCalledWith("/notebooks/b1");
  });
});

describe("fixed overlays", () => {
  it("no entry animation keeps a transform after it ends (popups and the focus timer were placed against the page, not the screen)", () => {
    const css = readFileSync(join(__dirname, "..", "..", "app", "globals.css"), "utf-8");
    for (const cls of [".motion-page", ".stagger > *", ".motion-sheet", ".motion-pop", ".motion-toast", ".motion-fade-in", ".nav-pop", ".study-fade-in"]) {
      const rule = css.slice(css.indexOf(`${cls} {`)).split("}")[0]!;
      const anim = /animation:([^;]+);/.exec(rule)?.[1] ?? "";
      expect(anim, cls).not.toMatch(/\b(both|forwards)\b/);
    }
    const page = css.slice(css.indexOf(".motion-page {")).split("}")[0]!;
    expect(page).toContain("motion-fade");
  });
});
