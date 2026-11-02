// @vitest-environment jsdom
import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BacklogSidePanel } from "@/components/logs/panels/BacklogSidePanel";
import { listBacklogItems, scheduleBacklogItem } from "@/lib/api/backlogItems";
import { ApiError } from "@/lib/api/http";

vi.mock("@/lib/api/backlogItems", async (orig) => ({
  ...(await orig<typeof import("@/lib/api/backlogItems")>()),
  listBacklogItems: vi.fn(),
  getBacklogAnalytics: vi.fn().mockRejectedValue(new Error("not needed")),
  scheduleBacklogItem: vi.fn(),
}));

const item = (id: string, day: number) => ({ id, subjectId: 1, chapterId: null, topic: id, createdAt: `2026-10-0${day}T00:00:00Z`, deadline: null, isOverdue: false });
const lookup = { subjectName: () => "Physics", chapterName: () => null };

/** QA pass: one item already planned elsewhere (409) must not block the others or keep the button failing on every tap. */
describe("Backlog: clear the next three", () => {
  it("adds the ones it can, drops the one that is no longer open, and the next tap moves on", async () => {
    vi.mocked(listBacklogItems).mockResolvedValue({ success: true, data: { items: [item("a", 1), item("b", 2), item("c", 3), item("d", 4)], nextCursor: null } } as never);
    vi.mocked(scheduleBacklogItem).mockImplementation(async (id: string) => {
      if (id === "a") throw new ApiError(409, "This item is scheduled.");
      return { success: true, data: {} } as never;
    });
    const onPlanned = vi.fn();
    render(<BacklogSidePanel lookup={lookup as never} onPlanned={onPlanned} />);
    const button = await screen.findByText("Clear next 3 to today's plan");
    await waitFor(() => expect(listBacklogItems).toHaveBeenCalled());
    await act(async () => button.click());
    await waitFor(() => expect(onPlanned).toHaveBeenCalledWith(2));
    expect(screen.queryByText("Couldn't add those to today's plan. Please try again.")).toBeNull();
    vi.mocked(scheduleBacklogItem).mockClear();
    await act(async () => screen.getByText("Clear next 3 to today's plan").click());
    await waitFor(() => expect(scheduleBacklogItem).toHaveBeenCalledWith("d", expect.anything()));
    expect(scheduleBacklogItem).not.toHaveBeenCalledWith("a", expect.anything());
  });
});
