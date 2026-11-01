// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CapturePage from "@/app/(app)/notebooks/capture/page";
import SharedNotebookPage from "@/app/shared/[token]/page";
import { ApiError } from "@/lib/api/http";
import { setPending } from "@/lib/notebooks/pendingCapture";

vi.mock("@/components/profile/ProfileSubpageHeader", () => ({ ProfileSubpageHeader: ({ title }: { title: string }) => <h1>{title}</h1> }));
vi.mock("@/components/ui/Logo", () => ({ Logo: () => <span>Prepex</span> }));
let query = "";
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: push }), useSearchParams: () => new URLSearchParams(query), useParams: () => ({ token: "tok" }) }));
vi.mock("@/components/study/useSubjects", () => ({
  useSubjects: () => ({ status: "ready", lookup: {}, subjects: [{ subjectId: 1, subjectName: "Physics", chapters: [{ id: "c1", name: "Kinematics" }, { id: "c2", name: "Laws of Motion" }] }] }),
}));
vi.mock("@/lib/api/plannerV2", async (orig) => ({ ...(await orig<typeof import("@/lib/api/plannerV2")>()), getPlanDay: vi.fn() }));
vi.mock("@/lib/notebooks/saveCapture", () => ({ saveCapturedBatch: vi.fn() }));
vi.mock("@/lib/api/notebooks", async (orig) => ({ ...(await orig<typeof import("@/lib/api/notebooks")>()), getEntry: vi.fn(), getShared: vi.fn() }));
import { getEntry, getShared } from "@/lib/api/notebooks";
import { getPlanDay } from "@/lib/api/plannerV2";
import { saveCapturedBatch } from "@/lib/notebooks/saveCapture";

const photo = (name: string) => new File([name], name, { type: "image/png" });

beforeEach(() => {
  vi.clearAllMocks();
  query = "";
  URL.createObjectURL = vi.fn(() => "blob:x");
  URL.revokeObjectURL = vi.fn();
  vi.mocked(getPlanDay).mockResolvedValue({ data: { tasks: [{ chapterId: "c2", status: "pending" }] } } as never);
  vi.mocked(getEntry).mockResolvedValue({ id: "e1", notebookId: "n1" } as never);
});

describe("capture", () => {
  it("one photo, one reason chip, Save: the chapter comes from today's planner task", async () => {
    setPending([photo("a.png")]);
    vi.mocked(saveCapturedBatch).mockResolvedValue({ saved: ["e1"], failed: [] });
    render(<CapturePage />);
    expect(await screen.findAllByTestId("capture-item")).toHaveLength(1);
    await waitFor(() => expect(screen.getByTestId("pick-chapter")).toHaveValue("c2"));
    await userEvent.click(screen.getByTestId("capture-reason-misread"));
    await userEvent.click(screen.getByTestId("capture-save"));
    await waitFor(() => expect(saveCapturedBatch).toHaveBeenCalled());
    const [items, target] = vi.mocked(saveCapturedBatch).mock.calls[0]!;
    expect(items).toEqual([expect.objectContaining({ reason: "misread" })]);
    expect(target).toMatchObject({ chapterId: "c2" });
    await waitFor(() => expect(push).toHaveBeenCalledWith("/notebooks/n1?page=e1"));
  });

  it("a chapter in the link wins over the planner, and the mock link rides along", async () => {
    query = "chapter=c1&mock=m9&source=mock";
    setPending([photo("a.png")]);
    vi.mocked(saveCapturedBatch).mockResolvedValue({ saved: ["e1"], failed: [] });
    render(<CapturePage />);
    await screen.findByTestId("capture-item");
    expect(screen.getByTestId("pick-chapter")).toHaveValue("c1");
    expect(screen.getByTestId("capture-source")).toHaveValue("mock");
    await userEvent.click(screen.getByTestId("capture-save"));
    await waitFor(() => expect(saveCapturedBatch).toHaveBeenCalled());
    expect(vi.mocked(saveCapturedBatch).mock.calls[0]![1]).toMatchObject({ chapterId: "c1", source: "mock", mockId: "m9" });
  });

  it("several photos get batch tagging: one tap sets the reason for all, then each can change", async () => {
    setPending([photo("a.png"), photo("b.png"), photo("c.png")]);
    render(<CapturePage />);
    expect(await screen.findAllByTestId("capture-item")).toHaveLength(3);
    const batch = screen.getByTestId("batch-tagging");
    await userEvent.click(batch.querySelector('[data-testid="capture-reason-guessed"]')!);
    const first = screen.getAllByTestId("capture-item")[0]!;
    expect(first.querySelector('[data-testid="capture-reason-guessed"]')).toHaveAttribute("aria-checked", "true");
    await userEvent.click(first.querySelector('[data-testid="capture-reason-misread"]')!);
    expect(first.querySelector('[data-testid="capture-reason-misread"]')).toHaveAttribute("aria-checked", "true");
    expect(screen.getAllByTestId("capture-item")[1]!.querySelector('[data-testid="capture-reason-guessed"]')).toHaveAttribute("aria-checked", "true");
    expect(screen.getByTestId("capture-save")).toHaveTextContent("Save 3 mistakes");
  });

  it("photos that fail to save stay on screen to try again, the saved ones are not duplicated", async () => {
    setPending([photo("a.png"), photo("b.png")]);
    vi.mocked(saveCapturedBatch).mockResolvedValue({ saved: ["e1"], failed: [1] });
    render(<CapturePage />);
    await screen.findAllByTestId("capture-item");
    await userEvent.click(screen.getByTestId("capture-save"));
    await waitFor(() => expect(screen.getAllByTestId("capture-item")).toHaveLength(1));
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByTestId("capture-save")).toHaveTextContent("Save mistake");
  });

  it("with nothing picked it explains how to add a photo", async () => {
    render(<CapturePage />);
    expect(await screen.findByTestId("capture-empty")).toHaveTextContent("Ctrl+V");
    expect(screen.queryByTestId("capture-save")).not.toBeInTheDocument();
  });
});

describe("shared page", () => {
  it("shows the pages read-only with a sign-up call to action and nothing about the owner", async () => {
    vi.mocked(getShared).mockResolvedValue({ title: "Kinematics", pages: [{ id: "p1", title: "Pulley", entryType: "mistake", reason: "misread", fix: "Check units", source: "mock", blocks: [{ id: "t", type: "text", text: "A block slides down" }], assets: [] }] });
    render(<SharedNotebookPage />);
    expect(await screen.findByTestId("shared-title")).toHaveTextContent("Kinematics");
    expect(screen.getByTestId("shared-page")).toHaveTextContent("A block slides down");
    expect(screen.getByTestId("shared-page")).toHaveTextContent("Fix: Check units");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByTestId("shared-cta")).toHaveAttribute("href", "/create-account");
    expect(screen.getByTestId("shared-view")).toHaveTextContent("Read only");
  });

  it("a revoked link says so", async () => {
    vi.mocked(getShared).mockRejectedValue(new ApiError(404, "gone"));
    render(<SharedNotebookPage />);
    expect(await screen.findByTestId("shared-error")).toHaveTextContent("no longer shared");
  });
});
