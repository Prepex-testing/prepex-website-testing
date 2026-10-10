// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { SubjectChapters } from "@/lib/api/dashboard";
import type { Mistake, MistakeStats } from "@/lib/api/mistakes";
import { MistakeForm } from "@/components/mistakes/MistakeForm";
import { MistakeList } from "@/components/mistakes/MistakeList";
import { MistakeStatsPanel } from "@/components/mistakes/MistakeStatsPanel";
import { ReviewCard } from "@/components/mistakes/ReviewCard";
import { makeSubjectLookup } from "@/lib/study/subjects";

const SUBJECTS: SubjectChapters[] = [
  { subjectId: 1, subjectCode: "PHY", subjectName: "Physics", chapters: [{ id: "11111111-1111-4111-8111-111111111111", subjectId: 1, name: "Kinematics", sequenceOrder: 1, isActive: true }] },
  { subjectId: 2, subjectCode: "CHEM", subjectName: "Chemistry", chapters: [] },
];
const lookup = makeSubjectLookup(SUBJECTS);

const mistake = (over: Partial<Mistake> = {}): Mistake => ({
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  subjectId: 1,
  chapterId: "11111111-1111-4111-8111-111111111111",
  topic: "Units",
  questionText: "What is the SI unit of force?",
  correctAnswer: "newton",
  studentAnswer: "joule",
  explanation: "F = ma, so kg m/s^2",
  imageUrl: null,
  tags: ["silly"],
  difficulty: 3,
  reviewCount: 0,
  lastReviewedAt: null,
  nextReviewAt: new Date(Date.now() + 86_400_000).toISOString(),
  masteredAt: null,
  isMastered: false,
  createdAt: new Date().toISOString(),
  ...over,
});

describe("ReviewCard", () => {
  it("hides the answer until asked, then shows correct / yours / why", async () => {
    const user = userEvent.setup();
    render(<ReviewCard mistake={mistake()} lookup={lookup} busy={false} onRate={vi.fn()} onMaster={vi.fn()} />);

    expect(screen.getByTestId("review-question")).toHaveTextContent("SI unit of force");
    expect(screen.queryByTestId("review-answer")).not.toBeInTheDocument();
    expect(screen.queryByTestId("rate-good")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("reveal-answer"));
    const answer = screen.getByTestId("review-answer");
    expect(answer).toHaveTextContent("newton");
    expect(answer).toHaveTextContent("joule");
    expect(answer).toHaveTextContent("kg m/s");
  });

  it("each button sends the right difficulty and remembered flag", async () => {
    const user = userEvent.setup();
    const onRate = vi.fn();
    render(<ReviewCard mistake={mistake()} lookup={lookup} busy={false} onRate={onRate} onMaster={vi.fn()} />);
    await user.click(screen.getByTestId("reveal-answer"));

    await user.click(screen.getByTestId("rate-hard"));
    await user.click(screen.getByTestId("rate-good"));
    await user.click(screen.getByTestId("rate-easy"));
    expect(onRate.mock.calls.map(([r]) => [r.label, r.difficulty, r.remembered])).toEqual([
      ["Still Hard", 5, false],
      ["Got It", 3, true],
      ["Easy", 1, true],
    ]);
  });

  it("'Mastered' retires it, and the buttons lock while saving", async () => {
    const user = userEvent.setup();
    const onMaster = vi.fn();
    const { rerender } = render(<ReviewCard mistake={mistake()} lookup={lookup} busy={false} onRate={vi.fn()} onMaster={onMaster} />);
    await user.click(screen.getByTestId("reveal-answer"));
    await user.click(screen.getByTestId("rate-mastered"));
    expect(onMaster).toHaveBeenCalledTimes(1);

    rerender(<ReviewCard mistake={mistake()} lookup={lookup} busy error="Couldn't save that review." onRate={vi.fn()} onMaster={onMaster} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't save/i);
    for (const id of ["rate-hard", "rate-good", "rate-easy", "rate-mastered"]) expect(screen.getByTestId(id)).toBeDisabled();
  });

  it("shows an image only as an img with no referrer; offers Skip only before the answer", async () => {
    const user = userEvent.setup();
    const onSkip = vi.fn();
    render(<ReviewCard mistake={mistake({ imageUrl: "https://cdn.example.test/q.png" })} lookup={lookup} busy={false} onRate={vi.fn()} onMaster={vi.fn()} onSkip={onSkip} />);
    const img = screen.getByAltText("Question");
    expect(img).toHaveAttribute("src", "https://cdn.example.test/q.png");
    expect(img).toHaveAttribute("referrerpolicy", "no-referrer");
    await user.click(screen.getByRole("button", { name: /skip for now/i }));
    expect(onSkip).toHaveBeenCalled();
    await user.click(screen.getByTestId("reveal-answer"));
    expect(screen.queryByRole("button", { name: /skip for now/i })).not.toBeInTheDocument();
  });

  it("renders question text as text, never as HTML", () => {
    render(<ReviewCard mistake={mistake({ questionText: '<img src=x onerror="alert(1)"> and <b>bold</b>' })} lookup={lookup} busy={false} onRate={vi.fn()} onMaster={vi.fn()} />);
    const q = screen.getByTestId("review-question");
    expect(q.querySelector("img")).toBeNull();
    expect(q.querySelector("b")).toBeNull();
    expect(q).toHaveTextContent("<b>bold</b>");
  });
});

describe("MistakeForm", () => {
  const fill = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.selectOptions(screen.getByTestId("mistake-subject"), "1");
    await user.type(screen.getByTestId("mistake-question"), "  Why is g constant?  ");
    await user.type(screen.getByTestId("mistake-correct"), "9.8 m/s^2");
    await user.type(screen.getByTestId("mistake-mine"), "9.8 kg");
  };

  it("won't submit without the essentials", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<MistakeForm subjects={SUBJECTS} busy={false} error={null} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.click(screen.getByTestId("mistake-submit"));
    expect(screen.getByRole("alert")).toHaveTextContent(/choose a subject/i);
    await user.selectOptions(screen.getByTestId("mistake-subject"), "1");
    await user.click(screen.getByTestId("mistake-submit"));
    expect(screen.getByRole("alert")).toHaveTextContent(/write the question/i);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects an image link that is not https", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<MistakeForm subjects={SUBJECTS} busy={false} error={null} onSubmit={onSubmit} onCancel={vi.fn()} />);
    await fill(user);
    await user.type(screen.getByLabelText(/image link/i), "http://insecure.test/a.png");
    await user.click(screen.getByTestId("mistake-submit"));
    expect(screen.getByRole("alert")).toHaveTextContent(/https/i);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("sends a clean payload: trimmed text, parsed tags, chosen difficulty", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<MistakeForm subjects={SUBJECTS} busy={false} error={null} onSubmit={onSubmit} onCancel={vi.fn()} />);
    await fill(user);
    await user.type(screen.getByTestId("mistake-tags"), "Silly, units ,silly");
    await user.click(screen.getByRole("radio", { name: /4/ }));
    await user.click(screen.getByTestId("mistake-submit"));

    expect(onSubmit).toHaveBeenCalledWith({
      subjectId: 1,
      chapterId: null,
      topic: null,
      questionText: "Why is g constant?",
      correctAnswer: "9.8 m/s^2",
      studentAnswer: "9.8 kg",
      explanation: null,
      imageUrl: null,
      tags: ["silly", "units"],
      difficulty: 4,
    });
  });

  it("prefills when editing", () => {
    render(<MistakeForm subjects={SUBJECTS} busy={false} error={null} initial={mistake({ tags: ["a", "b"], difficulty: 5 })} submitLabel="Save changes" onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByTestId("mistake-question")).toHaveValue("What is the SI unit of force?");
    expect(screen.getByTestId("mistake-tags")).toHaveValue("a, b");
    expect(screen.getByTestId("mistake-submit")).toHaveTextContent("Save changes");
    expect(screen.getByRole("radio", { name: /5/ })).toHaveAttribute("aria-checked", "true");
  });
});

describe("MistakeList", () => {
  const handlers = () => ({ onReview: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn(), onMaster: vi.fn(), onReopen: vi.fn() });

  it("shows an empty state", () => {
    render(<MistakeList items={[]} lookup={lookup} {...handlers()} />);
    expect(screen.getByTestId("mistakes-empty")).toBeInTheDocument();
  });

  it("an active mistake offers Review now / Edit / Mark mastered / Delete and says when it is next due", async () => {
    const user = userEvent.setup();
    const h = handlers();
    const m = mistake();
    render(<MistakeList items={[m]} lookup={lookup} now={new Date()} {...h} />);
    const row = screen.getByTestId("mistake-row");
    expect(within(row).getByTestId("next-review")).toHaveTextContent(/next review tomorrow/i);
    expect(within(row).getByText("silly")).toBeInTheDocument();

    await user.click(within(row).getByTestId("review-now"));
    await user.click(within(row).getByTestId("master"));
    await user.click(within(row).getByRole("button", { name: "Edit" }));
    await user.click(within(row).getByRole("button", { name: "Delete" }));
    expect(h.onReview).toHaveBeenCalledWith(m);
    expect(h.onMaster).toHaveBeenCalledWith(m);
    expect(h.onEdit).toHaveBeenCalledWith(m);
    expect(h.onDelete).toHaveBeenCalledWith(m);
  });

  it("a mastered mistake can be reopened, not reviewed", async () => {
    const user = userEvent.setup();
    const h = handlers();
    const m = mistake({ isMastered: true, masteredAt: new Date().toISOString(), nextReviewAt: null });
    render(<MistakeList items={[m]} lookup={lookup} {...h} />);
    const row = screen.getByTestId("mistake-row");
    expect(row).toHaveAttribute("data-mastered", "true");
    expect(within(row).queryByTestId("review-now")).not.toBeInTheDocument();
    expect(within(row).getByTestId("next-review")).toHaveTextContent(/^Mastered/);
    await user.click(within(row).getByTestId("reopen"));
    expect(h.onReopen).toHaveBeenCalledWith(m);
  });

  it("shortens a very long question", () => {
    render(<MistakeList items={[mistake({ questionText: "word ".repeat(100) })]} lookup={lookup} {...handlers()} />);
    expect(screen.getByTestId("mistake-row").textContent).toContain("…");
  });
});

describe("MistakeStatsPanel", () => {
  const stats: MistakeStats = {
    total: 8, active: 6, mastered: 2, masteredPercent: 25, dueNow: 3, dueNext7Days: 2, reviewedToday: 1, reviewStreak: 1, longestReviewStreak: 4,
    bySubject: [{ subjectId: 1, total: 5, mastered: 2 }, { subjectId: 2, total: 3, mastered: 0 }],
  };

  it("shows the headline numbers and per-subject progress", () => {
    render(<MistakeStatsPanel stats={stats} lookup={lookup} />);
    expect(screen.getByTestId("stat-total")).toHaveTextContent("8");
    expect(screen.getByTestId("stat-mastered-pct")).toHaveTextContent("25%");
    expect(screen.getByTestId("stat-due")).toHaveTextContent("3");
    expect(screen.getByTestId("stat-streak")).toHaveTextContent("1 day");
    expect(screen.getByRole("progressbar", { name: /physics mastered/i })).toHaveAttribute("aria-valuenow", "40");
    expect(screen.getByText("2 of 5 mastered")).toBeInTheDocument();
  });

  it("copes with nothing saved yet", () => {
    render(<MistakeStatsPanel stats={{ ...stats, total: 0, active: 0, mastered: 0, masteredPercent: 0, bySubject: [] }} lookup={lookup} />);
    expect(screen.getByText("Nothing saved yet.")).toBeInTheDocument();
  });
});
