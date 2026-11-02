// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BlockEditor } from "@/components/notebooks/editor/BlockEditor";
import type { Block } from "@/lib/api/notebooks";

const props = (blocks: Block[], onChange = vi.fn()) => ({ entryId: "e1", blocks, onChange, assets: {}, onAssetsChanged: vi.fn(), notify: vi.fn() });

describe("the + under a page", () => {
  it("adds a new text card at the end of the page and puts the cursor in it", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const blocks: Block[] = [{ id: "a", type: "text", text: "first" }, { id: "s", type: "solution", text: "" }];
    const { rerender } = render(<BlockEditor {...props(blocks, onChange)} />);
    await user.click(screen.getByTestId("add-below-open"));
    await user.click(screen.getByTestId("below-text"));
    const next = onChange.mock.calls.at(-1)![0] as Block[];
    expect(next.map((b) => b.type)).toEqual(["text", "solution", "text"]);
    rerender(<BlockEditor {...props(next, onChange)} />);
    const areas = screen.getAllByPlaceholderText("Write here. Use $x^2$ for a formula.");
    expect(document.activeElement).toBe(areas.at(-1));
  });

  it("offers the same choices as the toolbar and is not shown on an empty page", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<BlockEditor {...props([{ id: "a", type: "text", text: "x" }])} />);
    await user.click(screen.getByTestId("add-below-open"));
    for (const id of ["below-text", "below-image", "below-camera", "below-pen", "below-solution"]) expect(screen.getByTestId(id)).toBeInTheDocument();
    unmount();
    render(<BlockEditor {...props([])} emptyHint="Write your notes here." />);
    expect(screen.queryByTestId("add-below")).toBeNull();
    expect(screen.getByText("Write your notes here.")).toBeInTheDocument();
  });
});
