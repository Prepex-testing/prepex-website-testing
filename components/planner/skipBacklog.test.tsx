// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTaskActions } from "@/components/planner/useTaskActions";
import type { PlanTask } from "@/lib/api/plannerV2";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/components/planner/PracticeChoiceSheet", () => ({ PracticeChoiceSheet: () => null }));
vi.mock("@/components/planner/QuickLogSheet", () => ({ QuickLogSheet: () => null }));
vi.mock("@/lib/telemetry/planner", () => ({ trackPlanner: vi.fn() }));
vi.mock("@/lib/api/plannerV2", async (orig) => ({ ...(await orig<typeof import("@/lib/api/plannerV2")>()), skipPlanTask: vi.fn() }));
vi.mock("@/lib/api/backlogItems", () => ({ createBacklogItem: vi.fn() }));
import { skipPlanTask } from "@/lib/api/plannerV2";
import { createBacklogItem } from "@/lib/api/backlogItems";

const CH = "11111111-1111-4111-8111-111111111111";
const task = (over: Partial<PlanTask> = {}) => ({ id: "t1", kind: "practice", title: "Practice Kinematics", subjectId: 1, chapterId: CH, topic: "Projectile motion", estimatedMinutes: 45, ...over }) as PlanTask;

function Harness({ t, notify }: { t: PlanTask; notify: (m: string) => void }) {
  const actions = useTaskActions(async () => undefined, notify);
  return (
    <>
      <button type="button" onClick={() => void actions.skip(t)}>
        skip
      </button>
      {actions.overlays}
    </>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(skipPlanTask).mockResolvedValue({ success: true, data: null } as never);
  vi.mocked(createBacklogItem).mockResolvedValue({ success: true, data: {} } as never);
});

describe("skipping a task offers the backlog", () => {
  it("asks, and Move to backlog files it as a skipped_task with the task's chapter and minutes", async () => {
    const notify = vi.fn();
    render(<Harness t={task()} notify={notify} />);
    await userEvent.click(screen.getByText("skip"));
    expect(await screen.findByTestId("skip-backlog-prompt")).toHaveTextContent("Move to backlog?");
    await userEvent.click(screen.getByTestId("skip-backlog-yes"));
    await waitFor(() => expect(createBacklogItem).toHaveBeenCalledWith({ subjectId: 1, chapterId: CH, topic: "Projectile motion", estimatedMinutes: 45, source: "skipped_task" }));
    expect(notify).toHaveBeenCalledWith("Moved to your backlog.");
    await waitFor(() => expect(screen.queryByTestId("skip-backlog-prompt")).toBeNull());
  });

  it("Not now leaves the backlog alone", async () => {
    render(<Harness t={task()} notify={vi.fn()} />);
    await userEvent.click(screen.getByText("skip"));
    await userEvent.click(await screen.findByTestId("skip-backlog-no"));
    expect(createBacklogItem).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByTestId("skip-backlog-prompt")).toBeNull());
  });

  it("does not ask for a task with no chapter, or for a mock", async () => {
    const { rerender } = render(<Harness t={task({ chapterId: null })} notify={vi.fn()} />);
    await userEvent.click(screen.getByText("skip"));
    await waitFor(() => expect(skipPlanTask).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId("skip-backlog-prompt")).toBeNull();
    rerender(<Harness t={task({ kind: "mock" })} notify={vi.fn()} />);
    await userEvent.click(screen.getByText("skip"));
    await waitFor(() => expect(skipPlanTask).toHaveBeenCalledTimes(2));
    expect(screen.queryByTestId("skip-backlog-prompt")).toBeNull();
  });
});
