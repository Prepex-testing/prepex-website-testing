// @vitest-environment jsdom
import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChapterPicker } from "@/components/onboarding/ChapterPicker";
import { filterSections, groupByClass, type OnboardingSubject } from "@/lib/onboarding/chapters";

const SUBJECTS: OnboardingSubject[] = [
  {
    id: 1,
    code: "PHY",
    name: "Physics",
    chapters: [
      { id: "p1", name: "Units and Measurements", class: 11, subjectId: 1, sequenceOrder: 1 },
      { id: "p2", name: "Kinematics", class: 11, subjectId: 1, sequenceOrder: 2 },
      { id: "p3", name: "Optics", class: 12, subjectId: 1, sequenceOrder: 3 },
    ],
  },
  { id: 4, code: "BIO", name: "Biology", chapters: [{ id: "b1", name: "Genetics", class: 12, subjectId: 4, sequenceOrder: 1 }] },
];

function Harness({ query = "", initial = [] as string[] }: { query?: string; initial?: string[] }) {
  const [done, setDone] = useState<string[]>(initial);
  const sections = filterSections(groupByClass(SUBJECTS), query);
  return (
    <>
      <p data-testid="marked">{done.join(",")}</p>
      <ChapterPicker sections={sections} completed={done} onChange={setDone} expandAll={query.length > 0} />
    </>
  );
}

const chip = (name: string) => screen.getByRole("button", { name: new RegExp(name) });

describe("ChapterPicker", () => {
  it("groups by class, then subject, and opens only the first subject to start with", () => {
    render(<Harness />);
    expect(screen.getByRole("heading", { name: "Class 11" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Class 12" })).toBeInTheDocument();
    expect(screen.getByText("Kinematics")).toBeInTheDocument(); // Class 11 Physics is open
    expect(screen.queryByText("Optics")).not.toBeInTheDocument(); // Class 12 Physics is collapsed
  });

  it("shows Biology when the syllabus has it", () => {
    render(<Harness query="biology" />);
    expect(screen.getByText("Genetics")).toBeInTheDocument();
  });

  it("one tap marks a chapter complete and the next tap clears it — only two states, no partial", () => {
    render(<Harness />);
    const kin = chip("Kinematics");
    expect(kin).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(kin);
    expect(chip("Kinematics")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("marked")).toHaveTextContent("p2");
    fireEvent.click(chip("Kinematics"));
    expect(chip("Kinematics")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId("marked")).toHaveTextContent("");
  });

  it("tells a screen reader whether each chapter is complete", () => {
    render(<Harness initial={["p1"]} />);
    expect(within(chip("Units and Measurements")).getByText("Complete")).toBeInTheDocument();
    expect(within(chip("Kinematics")).getByText("Not complete")).toBeInTheDocument();
  });

  it("Mark all complete finishes a whole subject in one tap, and the same control undoes it", () => {
    render(<Harness />);
    const subject = screen.getByTestId("subject-11-1");
    expect(within(subject).getByTestId("subject-count")).toHaveTextContent("0 of 2 complete");

    fireEvent.click(within(subject).getByTestId("mark-all"));
    expect(screen.getByTestId("marked")).toHaveTextContent("p1,p2");
    expect(within(subject).getByTestId("subject-count")).toHaveTextContent("2 of 2 complete");
    expect(within(subject).getByTestId("mark-all")).toHaveTextContent("All complete");

    fireEvent.click(within(subject).getByTestId("mark-all"));
    expect(screen.getByTestId("marked")).toHaveTextContent("");
  });

  it("subjects open and close, and a search opens them all so no match hides behind a closed header", () => {
    const { rerender } = render(<Harness />);
    const header = within(screen.getByTestId("subject-12-1")).getByRole("button", { name: /Physics/ });
    expect(header).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(header);
    expect(screen.getByText("Optics")).toBeInTheDocument();
    expect(header).toHaveAttribute("aria-expanded", "true");

    rerender(<Harness query="gen" />);
    expect(screen.getByText("Genetics")).toBeInTheDocument();
  });

  it("pins each subject header so it stays in view while its chapters scroll past", () => {
    render(<Harness />);
    const stickyHeader = within(screen.getByTestId("subject-11-1")).getByRole("button", { name: /Physics/ }).parentElement!;
    expect(stickyHeader.className).toMatch(/sticky/);
    expect(stickyHeader.className).toMatch(/top-0/);
  });

  it("gives every control a tap target of at least 44px", () => {
    render(<Harness />);
    for (const el of [chip("Kinematics"), screen.getAllByTestId("mark-all")[0]!, screen.getAllByRole("button", { name: /Physics/ })[0]!]) {
      expect(el.className).toMatch(/min-h-11/);
    }
  });
});
