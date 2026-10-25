// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TaskRow } from "@/components/home/TaskRow";
import { inPlanOrder, planTaskToHomeTask, taskMeta, windowLabel } from "@/components/home/planTaskToHomeTask";
import { quickAccessItems, quickAccessSubtitles, type QuickAccessCounts } from "@/components/home/quickAccess";
import { plannerTaskIntent } from "@/components/home/focusIntent";
import type { PlanTask } from "@/lib/api/plannerV2";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
// The SVG assets the old card imports are build-time components; plain stand-ins are enough here.
vi.mock("@/assets/icons", () => ({ Book: () => <span />, Time: () => <span /> }));
vi.mock("@/components/home/TaskEditMenu", () => ({ TaskEditMenu: () => <span /> }));
vi.mock("@/components/home/CompleteTaskCheckbox", () => ({ CompleteTaskCheckbox: () => <span /> }));
vi.mock("@/components/ui/icons", () => ({ ClockIcon: () => <span />, SunIcon: () => <span />, FileIcon: () => <span />, CalendarIcon: () => <span /> }));

const EMOJI = /\p{Extended_Pictographic}/u;

const task = (over: Partial<PlanTask> = {}): PlanTask => ({
  id: "11111111-1111-4111-8111-111111111111", planId: "p", kind: "lecture", title: "Watch lecture — Kinematics", description: null, subjectId: 1, subject: "physics",
  chapterId: "22222222-2222-4222-8222-222222222222", chapterName: "Kinematics", topic: "Projectile motion", startMin: 10 * 60, endMin: 10 * 60 + 45, estimatedMinutes: 45, plannedUnits: 1,
  questionCount: null, status: "in_progress", origin: "goal", contentSource: "hcv", contentSourceLabel: "HCV", generatedBy: "engine", fixedSlot: false, weeklyGoalId: null, backlogItemId: null,
  secondsCompleted: 600, actualMinutes: null, linkedSessionLogId: null, linkedPracticeLogId: null, linkedRevisionLogId: null, linkedMockLogId: null, warning: null,
  ...over,
});

describe("Home task card shows the whole task", () => {
  it("renders subject, chapter, topic, source, minutes and status", () => {
    render(<TaskRow task={planTaskToHomeTask(task())} />);
    expect(screen.getByText("Physics")).toBeInTheDocument(); // subject
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("Kinematics"); // chapter
    const meta = screen.getByTestId("task-meta");
    expect(meta).toHaveTextContent("Projectile motion"); // topic
    expect(meta).toHaveTextContent("HCV"); // source
    expect(screen.getByText("45m")).toBeInTheDocument(); // estimated minutes
    expect(screen.getByTestId("task-status")).toHaveTextContent("In progress"); // status chip
    expect(screen.getByText("10:00 AM - 10:45 AM")).toBeInTheDocument();
  });

  it("the action says Resume once a session is under way, and Start otherwise", () => {
    expect(planTaskToHomeTask(task()).actionLabel).toBe("Resume Session");
    expect(planTaskToHomeTask(task({ status: "pending", secondsCompleted: 0 })).actionLabel).toBe("Start Session");
    expect(planTaskToHomeTask(task({ kind: "revision", status: "pending", secondsCompleted: 0 })).actionLabel).toBe("Start Revision");
    expect(planTaskToHomeTask(task({ kind: "practice", status: "pending", secondsCompleted: 0 })).actionLabel).toBe("Start Practice");
  });

  it("keeps every kind's own look: type, label and where its button goes", () => {
    expect(planTaskToHomeTask(task({ kind: "practice" })).type).toBe("practice");
    expect(planTaskToHomeTask(task({ kind: "revision" })).type).toBe("revision");
    expect(planTaskToHomeTask(task({ kind: "self_study" })).type).toBe("new-learning");
    const mock = planTaskToHomeTask(task({ kind: "mock", title: "Full mock (JEE Main)", status: "pending" }));
    expect(mock.type).toBe("mock");
    expect(mock.mockHref).toBe("/planner/mock?taskId=11111111-1111-4111-8111-111111111111");
    expect(mock.actionLabel).toBe("Upload Score");
  });

  it("a finished task is marked completed and a skipped one skipped", () => {
    expect(planTaskToHomeTask(task({ status: "done" })).isCompleted).toBe(true);
    expect(planTaskToHomeTask(task({ status: "skipped" })).status).toBe("SKIPPED");
  });

  it("falls back to the description, then to nothing, when there is no topic or source", () => {
    expect(taskMeta({ topic: null, contentSourceLabel: null, questionCount: null, description: "Daily review" })).toBe("Daily review");
    expect(taskMeta({ topic: "Vectors", contentSourceLabel: "PW", questionCount: 20, description: null })).toBe("Vectors · PW · 20 questions");
  });

  it("names the time of day and orders tasks by their slot", () => {
    expect(windowLabel(9 * 60)).toBe("Morning");
    expect(windowLabel(14 * 60)).toBe("Afternoon");
    expect(windowLabel(19 * 60)).toBe("Evening");
    expect(windowLabel(null)).toBe("Anytime");
    expect(inPlanOrder([task({ id: "b", startMin: 700 }), task({ id: "a", startMin: 600 }), task({ id: "m", status: "rolled_over" }), task({ id: "z", startMin: null })]).map((t) => t.id)).toEqual(["a", "b", "z"]);
  });
});

describe("Start hands the focus timer the whole task", () => {
  it("carries the plan task id, subject, chapter, topic, type and minutes", () => {
    const home = planTaskToHomeTask(task({ kind: "revision" }));
    expect(plannerTaskIntent(home)).toEqual({
      originSource: "planner",
      originId: "11111111-1111-4111-8111-111111111111",
      subject: "Physics",
      chapter: "22222222-2222-4222-8222-222222222222",
      topic: "Projectile motion",
      taskType: "revision",
      targetMinutes: 45,
    });
  });
});

describe("Quick Access", () => {
  const counts: QuickAccessCounts = { sessionsToday: 2, questionsThisWeek: 140, revisionsDue: 3, mistakesOpen: 15, mocksThisWeek: 1, };

  it("shows live counts on the six main rows", () => {
    const s = quickAccessSubtitles(counts);
    expect(s).toEqual({ focus: "2 sessions today", practice: "140 questions this week", revision: "3 due today", mistakes: "15 unresolved", mocks: "1 this week", analytics: "View deep insights" });
  });

  it("falls back to what the row does when a count is missing", () => {
    const s = quickAccessSubtitles({ sessionsToday: null, questionsThisWeek: null, revisionsDue: null, mistakesOpen: null, mocksThisWeek: null });
    expect(s.focus).toBe("Start a session");
    expect(s.mistakes).toBe("Review mistakes");
  });

  it("lists Focus, Practice, Revision, Mistakes, Mocks and Analytics first, each with a line icon", () => {
    const items = quickAccessItems(counts);
    expect(items.slice(0, 6).map((i) => i.label)).toEqual(["Focus", "Practice", "Revision", "Mistakes", "Mocks", "Analytics"]);
    for (const item of items) {
      const { container, unmount } = render(<div>{item.icon}</div>);
      expect(container.querySelector("svg"), `${item.label} has an svg icon`).not.toBeNull();
      unmount();
    }
  });

  it("has no emoji anywhere in what it renders", () => {
    const items = quickAccessItems(counts);
    const { container } = render(
      <ul>
        {items.map((i) => (
          <li key={i.key}>
            {i.icon}
            <span>{i.label}</span>
            <span>{i.subtitle}</span>
          </li>
        ))}
      </ul>,
    );
    expect(container.textContent ?? "").not.toMatch(EMOJI);
    expect(within(container).getAllByRole("listitem")).toHaveLength(items.length);
  });

  it("has no emoji in the source of the Home components either", () => {
    const root = path.resolve(import.meta.dirname, "..", "..");
    const files = ["components/home/quickAccess.tsx", "components/home/planTaskToHomeTask.ts", "app/(app)/home/page.tsx"];
    for (const f of files) {
      const text = readFileSync(path.join(root, f), "utf8");
      const hit = text.split("\n").findIndex((line) => EMOJI.test(line));
      expect(hit, `${f} line ${hit + 1} has an emoji`).toBe(-1);
    }
  });
});
