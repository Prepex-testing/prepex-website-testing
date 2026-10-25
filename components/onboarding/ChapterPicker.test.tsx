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
    expect(within(subject).getByTestId("mark-all")).toHaveTextContent("Unmark all");

    fireEvent.click(within(subject).getByTestId("mark-all"));
    expect(screen.getByTestId("marked")).toHaveTextContent("");
    expect(within(subject).getByTestId("mark-all")).toHaveTextContent("Mark all complete");
  });

  it("tints the Unmark all pill like a selected chapter once a subject is fully ticked", () => {
    render(<Harness initial={["p1", "p2"]} />);
    const pill = within(screen.getByTestId("subject-11-1")).getByTestId("mark-all");
    expect(pill).toHaveTextContent("Unmark all");
    expect(pill.className).toContain("bg-[#818CF8]/[0.18]");
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
      expect(el.className).toMatch(/min-h-11|min-h-\[68px\]/); // 44px or taller
    }
  });

  it("lays chapters out in equal-height rows so a two-line name never leaves a gap beside a one-line one", () => {
    render(<Harness />);
    const list = screen.getByTestId("subject-11-1").querySelector("ul")!;
    expect(list.className).toMatch(/sm:grid-cols-2/);
    expect(list.className).toMatch(/sm:auto-rows-fr/);
    for (const item of list.querySelectorAll("li")) expect(item.className).toMatch(/\bflex\b/);
    const card = chip("Kinematics");
    expect(card.className).toMatch(/min-h-\[68px\]/);
    expect(card.className).toMatch(/items-center/);
    expect(card.className).toMatch(/leading-\[1\.3\]/);
  });

  it("never uses green, selected or not", () => {
    const { container } = render(<Harness initial={["p1", "p2"]} />);
    const classes = Array.from(container.querySelectorAll("[class]"), (el) => el.getAttribute("class") ?? "").join(" ");
    expect(classes).not.toMatch(/green|emerald|lime|teal/i);
    expect(greenHexes(classes)).toEqual([]);
    // ...and the selected look is the soft indigo tint.
    expect(chip("Units and Measurements").className).toMatch(/border-\[#818CF8\]\/60/);
    expect(chip("Units and Measurements").className).toMatch(/bg-\[#818CF8\]\/\[0\.18\]/);
  });
});

/** Every hex colour in `text` whose green channel clearly leads red and blue. */
function greenHexes(text: string): string[] {
  const found = text.match(/#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g) ?? [];
  return found.filter((hex) => {
    const full = hex.length === 4 ? `#${[...hex.slice(1)].map((c) => c + c).join("")}` : hex;
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
    return g > r + 24 && g > b + 24;
  });
}
