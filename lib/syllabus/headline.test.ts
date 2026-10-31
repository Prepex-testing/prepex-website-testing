import { describe, expect, it } from "vitest";
import { syllabusHeadline } from "@/lib/syllabus/headline";

describe("syllabusHeadline", () => {
  it("names the completed count and the leading subject", () => {
    expect(
      syllabusHeadline([
        { name: "Physics", total: 25, completed: 8 },
        { name: "Chemistry", total: 30, completed: 6 },
        { name: "Mathematics", total: 35, completed: 4 },
      ]),
    ).toBe("You've completed 18 of 90 chapters · Physics leads at 32%");
  });

  it("says nothing when nothing is complete or there is no syllabus", () => {
    expect(syllabusHeadline([{ name: "Physics", total: 25, completed: 0 }])).toBeNull();
    expect(syllabusHeadline([])).toBeNull();
  });

  it("does not crown a leader when only one subject has progress", () => {
    expect(syllabusHeadline([{ name: "Physics", total: 25, completed: 5 }, { name: "Chemistry", total: 30, completed: 0 }])).toBe("You've completed 5 of 55 chapters");
  });
});
