// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NotebooksPage from "@/app/(app)/notebooks/page";
import { StatsPanel } from "@/components/notebooks/StatsPanel";
import { StorageBanner } from "@/components/notebooks/StorageBanner";
import type { Insights, Notebook, Usage } from "@/lib/api/notebooks";

// The real header pulls in an SVG asset the test runner cannot load; a heading stand-in is enough here.
vi.mock("@/components/profile/ProfileSubpageHeader", () => ({ ProfileSubpageHeader: ({ title }: { title: string }) => <h1>{title}</h1> }));
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: push }), usePathname: () => "/notebooks", useSearchParams: () => new URLSearchParams(), useParams: () => ({}) }));
vi.mock("@/components/study/useSubjects", () => ({
  useSubjects: () => ({
    status: "ready",
    lookup: { subjectName: (id: number) => (id === 1 ? "Physics" : `Subject ${id}`), chapterName: (id: string | null) => (id === "c1" ? "Kinematics" : null) },
    subjects: [{ subjectId: 1, subjectName: "Physics", chapters: [{ id: "c1", name: "Kinematics", sequenceOrder: 1 }] }],
  }),
}));
vi.mock("@/lib/api/notebooks", async (orig) => ({ ...(await orig<typeof import("@/lib/api/notebooks")>()), listNotebooks: vi.fn(), listEntries: vi.fn(), createNotebook: vi.fn(), getInsights: vi.fn() }));
import { createNotebook, getInsights, listEntries, listNotebooks } from "@/lib/api/notebooks";

const usage = (over: Partial<Usage> = {}): Usage => ({ images: 3, bytes: 1_000_000, maxImages: 500, maxBytes: 1_073_741_824, share: 0.01, warn: false, full: false, ...over });
const nb = (over: Partial<Notebook> = {}): Notebook => ({ id: "n1", title: "Kinematics", subjectId: 1, chapterId: "c1", kind: "chapter", mistakes: 12, notes: 2, due: 3, mastered: 3, masteredPercent: 25, needSolution: 2, createdAt: "2026-10-01T00:00:00Z", ...over });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("StorageBanner", () => {
  it("is absent below 80%, a gentle notice at 80%, an alert when full", () => {
    const { rerender } = render(<StorageBanner usage={usage()} />);
    expect(screen.queryByTestId("storage-warn")).not.toBeInTheDocument();
    rerender(<StorageBanner usage={usage({ warn: true, share: 0.82, images: 410 })} />);
    expect(screen.getByTestId("storage-warn")).toHaveTextContent("82%");
    rerender(<StorageBanner usage={usage({ full: true, share: 1, images: 500 })} />);
    expect(screen.getByTestId("storage-full")).toHaveTextContent("Storage limit reached");
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});

describe("My Notebooks shelf", () => {
  it("shows covers with counts, a due badge, mastered share and the due-for-review button", async () => {
    vi.mocked(listNotebooks).mockResolvedValue({ notebooks: [nb(), nb({ id: "n2", title: "Optics", due: 0, mistakes: 4, notes: 0, masteredPercent: 0, needSolution: 0 })], dueTotal: 3, usage: usage() });
    render(<NotebooksPage />);
    const covers = await screen.findAllByTestId("notebook-cover");
    expect(covers).toHaveLength(2);
    expect(covers[0]).toHaveTextContent("Kinematics");
    expect(covers[0]).toHaveTextContent("12 mistakes · 2 notes");
    expect(screen.getByTestId("due-badge")).toHaveTextContent("3 due");
    expect(covers[0]).toHaveTextContent("25% mastered");
    expect(covers[0]).toHaveTextContent("2 pages need a solution");
    expect(screen.getByTestId("due-for-review")).toHaveTextContent("Due for review: 3");
    expect(screen.getByTestId("due-for-review")).toHaveAttribute("href", "/notebooks/review");
  });

  it("puts the notebook with due pages first and leaves out the due button when nothing is due", async () => {
    vi.mocked(listNotebooks).mockResolvedValue({ notebooks: [nb({ id: "a", title: "Alpha", due: 0, mistakes: 50 }), nb({ id: "b", title: "Beta", due: 1, mistakes: 1 })], dueTotal: 0, usage: usage() });
    render(<NotebooksPage />);
    const covers = await screen.findAllByTestId("notebook-cover");
    expect(covers[0]).toHaveTextContent("Beta");
    expect(screen.queryByTestId("due-for-review")).not.toBeInTheDocument();
  });

  it("an empty shelf invites the first mistake", async () => {
    vi.mocked(listNotebooks).mockResolvedValue({ notebooks: [], dueTotal: 0, usage: usage() });
    render(<NotebooksPage />);
    expect(await screen.findByTestId("shelf-empty")).toHaveTextContent("first mistake");
  });

  it("searching switches to page results and sends the words and filters to the server", async () => {
    vi.mocked(listNotebooks).mockResolvedValue({ notebooks: [nb()], dueTotal: 0, usage: usage() });
    vi.mocked(listEntries).mockResolvedValue({ total: 1, items: [{ id: "e1", notebookId: "n1", entryType: "mistake", title: "Pulley", blocks: [], subjectId: 1, chapterId: "c1", topic: null, source: null, sourceRef: null, reason: "misread", fix: "units", starred: false, difficulty: null, tags: [], status: "new", reviewStep: 0, nextReviewAt: null, correctStreak: 0, correctDays: 0, reviewCount: 0, lastReviewedAt: null, masteredAt: null, practiceQuestionId: null, mockId: null, sessionId: null, needsSolution: false, createdAt: "", updatedAt: "", thumbUrl: null }] });
    render(<NotebooksPage />);
    await screen.findByTestId("shelf-grid");
    await userEvent.type(screen.getByTestId("shelf-search"), "units");
    await userEvent.selectOptions(screen.getByTestId("filter-reason"), "misread");
    const hit = await screen.findByTestId("search-result");
    expect(hit).toHaveTextContent("Pulley");
    expect(hit).toHaveAttribute("href", "/notebooks/n1?page=e1");
    expect(listEntries).toHaveBeenLastCalledWith(expect.objectContaining({ q: "units", reason: "misread" }));
    expect(screen.queryByTestId("shelf-grid")).not.toBeInTheDocument();
  });

  it("makes a notebook of the student's own", async () => {
    vi.mocked(listNotebooks).mockResolvedValue({ notebooks: [], dueTotal: 0, usage: usage() });
    vi.mocked(createNotebook).mockResolvedValue(nb({ id: "new1", title: "Formula sheet" }));
    render(<NotebooksPage />);
    await screen.findByTestId("shelf-empty");
    await userEvent.click(screen.getByTestId("new-notebook"));
    await userEvent.type(screen.getByTestId("new-notebook-title"), "Formula sheet");
    await userEvent.click(screen.getByTestId("new-notebook-save"));
    await waitFor(() => expect(createNotebook).toHaveBeenCalledWith("Formula sheet", null));
    expect(push).toHaveBeenCalledWith("/notebooks/new1");
  });

  it("shows the storage banner when the student is near the limit", async () => {
    vi.mocked(listNotebooks).mockResolvedValue({ notebooks: [nb()], dueTotal: 0, usage: usage({ warn: true, share: 0.9, images: 450 }) });
    render(<NotebooksPage />);
    expect(await screen.findByTestId("storage-warn")).toHaveTextContent("90%");
  });
});

describe("StatsPanel", () => {
  const lookup = { subjectName: (id: number) => (id === 1 ? "Physics" : "Chemistry"), chapterName: (id: string | null) => (id === "c1" ? "Kinematics" : null) };
  const insights = (over: Partial<Insights> = {}): Insights => ({ total: 12, mastered: 3, masteredPercent: 25, dueNow: 4, needSolution: 2, reasonBySubject: [{ subjectId: 1, total: 12, reasons: { silly_calculation: 6, concept_gap: 2 } }], topChapters: [{ chapterId: "c1", mistakes: 9, open: 6 }], sources: { mock: 7, coaching_dpp: 5 }, ...over });

  it("shows the tiles, a plain-language sentence, top chapters and the source split", async () => {
    vi.mocked(getInsights).mockResolvedValue(insights());
    render(<StatsPanel lookup={lookup} />);
    expect(await screen.findByTestId("stats-panel")).toBeInTheDocument();
    expect(screen.getByTestId("stat-total")).toHaveTextContent("12");
    expect(screen.getByTestId("stat-mastered")).toHaveTextContent("25%");
    expect(screen.getByTestId("stat-solution")).toHaveTextContent("2");
    expect(screen.getByTestId("stats-insight")).toHaveTextContent("75% of your Physics mistakes");
    expect(screen.getByTestId("stats-chapters")).toHaveTextContent("Kinematics");
    expect(screen.getByTestId("stats-sources")).toHaveTextContent("Mock");
  });

  it("hides the widgets that have too little data behind them", async () => {
    vi.mocked(getInsights).mockResolvedValue(insights({ total: 3, needSolution: 0, reasonBySubject: [{ subjectId: 1, total: 3, reasons: { guessed: 3 } }] }));
    render(<StatsPanel lookup={lookup} />);
    expect(await screen.findByTestId("stats-thin")).toHaveTextContent("2 more mistakes");
    expect(screen.queryByTestId("stats-reasons")).not.toBeInTheDocument();
    expect(screen.queryByTestId("stats-chapters")).not.toBeInTheDocument();
    expect(screen.queryByTestId("stat-solution")).not.toBeInTheDocument();
  });

  it("an empty notebook says so", async () => {
    vi.mocked(getInsights).mockResolvedValue(insights({ total: 0, reasonBySubject: [], topChapters: [], sources: {} }));
    render(<StatsPanel lookup={lookup} />);
    expect(await screen.findByTestId("stats-empty")).toBeInTheDocument();
  });
});
