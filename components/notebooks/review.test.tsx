// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ReviewPage from "@/app/(app)/notebooks/review/page";
import { ShareModal } from "@/components/notebooks/ShareModal";
import type { Entry, EntryWithAssets, Share } from "@/lib/api/notebooks";

vi.mock("@/components/profile/ProfileSubpageHeader", () => ({ ProfileSubpageHeader: ({ title }: { title: string }) => <h1>{title}</h1> }));
let query = "";
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: push }), usePathname: () => "/notebooks/review", useSearchParams: () => new URLSearchParams(query) }));
vi.mock("@/components/study/useSubjects", () => ({
  useSubjects: () => ({ status: "ready", subjects: [], lookup: { subjectName: () => "Physics", chapterName: () => "Kinematics" } }),
}));
vi.mock("@/lib/rewards/events", () => ({ refreshXp: vi.fn(async () => 0) }));
vi.mock("canvas-confetti", () => ({ default: vi.fn() }));
vi.mock("@/lib/api/notebooks", async (orig) => ({ ...(await orig<typeof import("@/lib/api/notebooks")>()), getDue: vi.fn(), getMistakeTest: vi.fn(), getEntry: vi.fn(), reviewEntry: vi.fn(), listShares: vi.fn(), createShare: vi.fn(), revokeShare: vi.fn() }));
import { createShare, getDue, getEntry, getMistakeTest, listShares, reviewEntry, revokeShare } from "@/lib/api/notebooks";

const entry = (id: string, over: Partial<Entry> = {}): Entry => ({ id, notebookId: "n1", entryType: "mistake", title: `Question ${id}`, blocks: [{ id: "q", type: "text", text: `Find the speed in ${id}` }, { id: "s", type: "solution", text: "Divide distance by time" }], subjectId: 1, chapterId: "c1", topic: null, source: "mock", sourceRef: null, reason: "silly_calculation", fix: "Check units", starred: false, difficulty: null, tags: [], status: "reviewing", reviewStep: 1, nextReviewAt: "2026-11-01T00:00:00Z", correctStreak: 0, correctDays: 0, reviewCount: 1, lastReviewedAt: null, masteredAt: null, practiceQuestionId: null, mockId: null, sessionId: null, needsSolution: false, createdAt: "", updatedAt: "", ...over });
const full = (e: Entry): EntryWithAssets => ({ ...e, assets: [] });

beforeEach(() => {
  vi.clearAllMocks();
  query = "";
  vi.mocked(getEntry).mockImplementation(async (id: string) => full(entry(id)));
});

describe("review mode", () => {
  it("shows the question with the solution hidden until Reveal, then Got it moves the page up the ladder", async () => {
    vi.mocked(getDue).mockResolvedValue({ items: [entry("a"), entry("b")], total: 2 });
    vi.mocked(reviewEntry).mockResolvedValue(entry("a", { nextReviewAt: new Date(Date.now() + 3.2 * 86_400_000).toISOString(), reviewStep: 2 }));
    render(<ReviewPage />);
    expect(await screen.findByTestId("review-card")).toHaveTextContent("Find the speed in a");
    expect(screen.queryByTestId("review-solution")).not.toBeInTheDocument();
    expect(screen.getByTestId("review-progress")).toHaveTextContent("1 of 2");
    expect(screen.queryByTestId("review-gotit")).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId("review-reveal"));
    expect(screen.getByTestId("review-solution")).toHaveTextContent("Divide distance by time");
    expect(screen.getByTestId("review-solution")).toHaveTextContent("Fix: Check units");

    await userEvent.click(screen.getByTestId("review-gotit"));
    await waitFor(() => expect(reviewEntry).toHaveBeenCalledWith("a", "correct", undefined));
    expect(await screen.findByTestId("review-feedback")).toHaveTextContent("Got it. Back due in 3 days");
  });

  it("Not yet sends the page back tomorrow", async () => {
    vi.mocked(getDue).mockResolvedValue({ items: [entry("a")], total: 1 });
    vi.mocked(reviewEntry).mockResolvedValue(entry("a", { reviewStep: 0 }));
    render(<ReviewPage />);
    await userEvent.click(await screen.findByTestId("review-reveal"));
    await userEvent.click(screen.getByTestId("review-notyet"));
    await waitFor(() => expect(reviewEntry).toHaveBeenCalledWith("a", "wrong", undefined));
    expect(await screen.findByTestId("review-feedback")).toHaveTextContent("comes back tomorrow");
  });

  it("the third solve on a third day is celebrated and the summary counts it", async () => {
    vi.mocked(getDue).mockResolvedValue({ items: [entry("a", { correctDays: 2 })], total: 1 });
    vi.mocked(reviewEntry).mockResolvedValue(entry("a", { masteredAt: "2026-11-01T10:00:00Z", status: "mastered", nextReviewAt: null }));
    render(<ReviewPage />);
    await userEvent.click(await screen.findByTestId("review-reveal"));
    await userEvent.click(screen.getByTestId("review-gotit"));
    expect(await screen.findByTestId("review-feedback")).toHaveTextContent("Mastered");
    await userEvent.click(screen.getByTestId("review-next"));
    expect(await screen.findByTestId("review-mastered")).toHaveTextContent("1 mistake mastered");
    expect(screen.getByTestId("review-score")).toHaveTextContent("1 of 1");
  });

  it("an optional timer sends the seconds spent", async () => {
    vi.mocked(getDue).mockResolvedValue({ items: [entry("a")], total: 1 });
    vi.mocked(reviewEntry).mockResolvedValue(entry("a"));
    render(<ReviewPage />);
    await userEvent.click(await screen.findByTestId("timer-toggle"));
    expect(screen.getByTestId("timer")).toHaveTextContent("0:0");
    await userEvent.click(screen.getByTestId("review-reveal"));
    await userEvent.click(screen.getByTestId("review-gotit"));
    await waitFor(() => expect(reviewEntry).toHaveBeenCalledWith("a", "correct", expect.any(Number)));
  });

  it("scopes to a chapter when opened from a revision task, and a notebook from its page", async () => {
    query = "chapter=c1&notebook=n1";
    vi.mocked(getDue).mockResolvedValue({ items: [], total: 0 });
    render(<ReviewPage />);
    expect(await screen.findByTestId("review-empty")).toHaveTextContent("Nothing is due");
    expect(getDue).toHaveBeenCalledWith({ notebookId: "n1", chapterId: "c1" });
  });

  it("the Mistake Test asks for ten interleaved pages", async () => {
    query = "test=1";
    vi.mocked(getMistakeTest).mockResolvedValue([entry("a"), entry("b")]);
    render(<ReviewPage />);
    expect(await screen.findByTestId("review-progress")).toHaveTextContent("Mistake Test: 1 of 2");
    expect(getMistakeTest).toHaveBeenCalledWith(10);
    expect(getDue).not.toHaveBeenCalled();
  });
});

describe("ShareModal", () => {
  const share = (over: Partial<Share> = {}): Share => ({ id: "s1", token: "tok", notebookId: "n1", entryId: null, path: "/shared/tok", createdAt: "", ...over });

  it("makes a read-only link, then stops sharing", async () => {
    vi.mocked(listShares).mockResolvedValue([]);
    vi.mocked(createShare).mockResolvedValue({ id: "s1", token: "tok", path: "/shared/tok" });
    vi.mocked(revokeShare).mockResolvedValue({ revoked: true });
    render(<ShareModal open onClose={() => undefined} target={{ notebookId: "n1" }} what="notebook" />);
    await userEvent.click(await screen.findByTestId("share-make"));
    expect(createShare).toHaveBeenCalledWith({ notebookId: "n1" });
    expect(await screen.findByTestId("share-url")).toHaveValue(`${window.location.origin}/shared/tok`);
    await userEvent.click(screen.getByTestId("share-stop"));
    await waitFor(() => expect(revokeShare).toHaveBeenCalledWith("s1"));
    expect(await screen.findByTestId("share-message")).toHaveTextContent("no longer opens");
    expect(screen.getByTestId("share-make")).toBeInTheDocument();
  });

  it("shows the link a page already has instead of making another", async () => {
    vi.mocked(listShares).mockResolvedValue([share({ id: "s9", notebookId: null, entryId: "e1", path: "/shared/zzz" })]);
    render(<ShareModal open onClose={() => undefined} target={{ entryId: "e1" }} what="page" />);
    expect(await screen.findByTestId("share-url")).toHaveValue(`${window.location.origin}/shared/zzz`);
    expect(createShare).not.toHaveBeenCalled();
  });
});
