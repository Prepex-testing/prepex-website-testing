// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MockSidePanel } from "@/components/logs/panels/MockSidePanel";
import { PracticeSidePanel } from "@/components/logs/panels/PracticeSidePanel";

vi.mock("@/lib/api/practiceLogs", async (orig) => ({ ...(await orig<typeof import("@/lib/api/practiceLogs")>()), getPracticeAnalytics: vi.fn().mockRejectedValue(new Error("down")) }));
vi.mock("@/lib/api/mocks", async (orig) => ({ ...(await orig<typeof import("@/lib/api/mocks")>()), getMockAnalytics: vi.fn().mockRejectedValue(new Error("down")) }));

/** QA pass: when the analytics call fails, no section of the side panel may keep saying "Loading". */
describe("Logs side panels after a failed load", () => {
  for (const [name, Panel] of [["Practice", PracticeSidePanel], ["Mocks", MockSidePanel]] as const) {
    it(`${name}: every section says it couldn't load, none stays on Loading`, async () => {
      render(<Panel onLog={() => undefined} />);
      expect((await screen.findAllByText("Couldn't load this.")).length).toBe(2);
      expect(screen.queryByText("Loading")).toBeNull();
    });
  }
});
