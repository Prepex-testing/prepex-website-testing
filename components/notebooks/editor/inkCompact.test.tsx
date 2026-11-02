import { describe, expect, it } from "vitest";
import { compactStroke, MAX_POINTS } from "@/components/notebooks/editor/InkLayer";

describe("compactStroke", () => {
  it("rounds what is saved and keeps a long stroke within the server's point limit", () => {
    const raw = { tool: "pen" as const, color: "#111", width: 3, points: Array.from({ length: 9000 }, (_, i) => [i * 0.123456789, 5.987654321, 0.512345] as [number, number, number]) };
    const out = compactStroke(raw);
    expect(out.points).toHaveLength(MAX_POINTS);
    expect(out.points[0]).toEqual([0, 6, 0.51]);
    expect(out.points.at(-1)![0]).toBeCloseTo(8999 * 0.123456789, 1);
    expect(JSON.stringify(out).length).toBeLessThan(JSON.stringify(raw).length / 2);
  });
});
