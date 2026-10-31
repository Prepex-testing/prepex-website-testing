// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BlockEditor } from "@/components/timetable/BlockEditor";
import { fromApiBlocks, toApiBlocks, type GridBlock } from "@/lib/timetable/grid";

const block = (activityType: GridBlock["activityType"], mode: GridBlock["mode"] = null): GridBlock => ({ key: "k", dayOfWeek: 0, startMin: 540, endMin: 630, activityType, subjectId: null, label: null, mode });
const props = { blocks: [] as GridBlock[], subjects: [{ id: 1, name: "Physics" }], onChange: vi.fn(), onDelete: vi.fn(), onCopyDay: vi.fn(), onClose: vi.fn() };

describe("coaching blocks: Offline or Online", () => {
  it("a coaching block asks how it is attended; picking one and picking it again clears it", async () => {
    const onChange = vi.fn();
    const { rerender } = render(<BlockEditor {...props} onChange={onChange} block={block("COACHING")} />);
    expect(screen.getByTestId("coaching-mode")).toBeInTheDocument();
    await userEvent.click(screen.getByTestId("mode-online"));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ activityType: "COACHING", mode: "online" }));
    rerender(<BlockEditor {...props} onChange={onChange} block={block("COACHING", "online")} />);
    expect(screen.getByTestId("mode-online")).toHaveAttribute("aria-checked", "true");
    await userEvent.click(screen.getByTestId("mode-online"));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ mode: null }));
  });

  it("other blocks do not show it", () => {
    render(<BlockEditor {...props} block={block("SELF_STUDY")} />);
    expect(screen.queryByTestId("coaching-mode")).not.toBeInTheDocument();
  });

  it("the mode travels to the server only for coaching blocks and comes back on load", () => {
    const api = toApiBlocks([block("COACHING", "offline"), block("SCHOOL", "offline")]);
    expect(api.find((b) => b.activityType === "COACHING")).toMatchObject({ mode: "offline" });
    expect(api.find((b) => b.activityType === "SCHOOL")).not.toHaveProperty("mode");
    expect(fromApiBlocks(api).find((b) => b.activityType === "COACHING")?.mode).toBe("offline");
  });
});
