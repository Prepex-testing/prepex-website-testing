// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/home/climb", useSearchParams: () => new URLSearchParams(), useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock("canvas-confetti", () => ({ default: vi.fn() }));
vi.mock("html-to-image", () => ({ toPng: vi.fn(async () => "data:image/png;base64,AAAA") }));
vi.mock("@/lib/api/xp", () => ({ onXpSummary: vi.fn(() => () => undefined), getXpSummary: vi.fn(async () => ({})), sendHeartbeat: vi.fn() }));
vi.mock("@/lib/api/pexo", async (orig) => ({ ...(await orig<typeof import("@/lib/api/pexo")>()), getClimbPage: vi.fn(), getClimbFriends: vi.fn(), askPexo: vi.fn(async () => null) }));
vi.mock("@/lib/focus/startFocusSession", () => ({ startFocusSession: vi.fn() }));

import { ClimbScreen, resetClimbMarks } from "@/components/climb/ClimbScreen";
import { climbCardData } from "@/components/climb/ClimbShare";
import { ClimbStrip } from "@/components/climb/ClimbStrip";
import { getClimbFriends, getClimbPage, type ClimbPage, type ClimbStep, type PexoState } from "@/lib/api/pexo";
import { startFocusSession } from "@/lib/focus/startFocusSession";
import { foldQuiet, todayTrigger } from "@/lib/pexo/climb";
import { primePexo, resetPexo } from "@/lib/pexo/store";

const summary = { steps: 3, todayStudied: false, form: "solver" as const, daysToExam: 71, rocksOpen: 1, gems: 1 };
const on = (over: Partial<PexoState> = {}): PexoState => ({ enabled: true, cohort: "existing", libraryVersion: 2, language: "en", bubbles: "normal", notifications: true, accessories: [], shown: {}, firstVisits: ["climb"], marks: { "climb.intro.seen": "2026-11-01", "climb.milestone.100": "2026-10-14" }, today: "2026-11-12", daysSinceSignup: 30, home: null, quests: null, nudge: null, care: { active: false, reason: null, distress: false }, form: "solver", climb: summary, ...over });
const step = (date: string, over: Partial<ClimbStep> = {}): ClimbStep => ({ date, minutes: 0, studied: false, planDone: false, landmarks: [], checkpoints: [], smashed: [], gems: 0, milestone: null, ...over });
const first = (over: Partial<ClimbPage> = {}): ClimbPage => ({
  month: "2026-11",
  steps: [
    step("2026-11-12"),
    step("2026-11-11", { minutes: 90, studied: true, gems: 1 }),
    step("2026-11-10", { minutes: 200, studied: true, planDone: true, landmarks: [{ chapterId: "c1", name: "Kinematics", subject: "Physics", subjectId: 1 }] }),
    step("2026-11-09", { minutes: 40, studied: true, smashed: [{ id: "b1", chapter: "Work, Energy and Power" }] }),
    step("2026-11-08", { checkpoints: [{ id: "m1", testType: "full_mock", examPattern: "jee_main", score: { total: 150, max: 300 } }] }),
    step("2026-11-07"),
    step("2026-11-06"),
    step("2026-11-05"),
  ],
  nextCursor: "2026-10",
  base: null,
  upcoming: { peak: { examDate: "2027-01-22", daysLeft: 71 }, milestones: [{ days: 100, date: "2026-10-14", reached: true }, { days: 50, date: "2026-12-03", reached: false }], rocks: [{ key: "c2", chapterId: "c2", chapter: "Laws of Motion", subjectId: 1, hoursLeft: 6, size: "medium", lane: "must", backlogId: "b9" }] },
  totals: { start: "2026-10-01", day: 43, steps: 3, chapters: 2, mocks: 1, rocksSmashed: 1, gems: 1, form: "solver", daysToExam: 71, todayStudied: false, todayMinutes: 0 },
  ...over,
});
const oct: ClimbPage = { month: "2026-10", steps: [step("2026-10-02", { minutes: 20, studied: true }), step("2026-10-01", { minutes: 40, studied: true })], nextCursor: null, base: { n: 1, chapters: [{ name: "Mole Concept", subject: "Chemistry", subjectId: 2 }] }, upcoming: null, totals: null };

beforeEach(() => {
  resetPexo();
  resetClimbMarks();
  document.documentElement.setAttribute("data-motion", "reduce");
  vi.mocked(getClimbPage).mockReset();
  vi.mocked(getClimbPage).mockImplementation(async (cursor) => (cursor === "2026-10" ? oct : first()));
});
afterEach(cleanup);

describe("pure helpers", () => {
  it("folds 3+ quiet days into one group, keeps a quiet day that has a marker, and picks today's line", () => {
    const items = foldQuiet(first().steps.slice(1));
    expect(items.map((i) => (i.kind === "quiet" ? `quiet:${i.count}` : i.step.date))).toEqual(["2026-11-11", "2026-11-10", "2026-11-09", "2026-11-08", "quiet:3"]);
    expect(todayTrigger({ todayStudied: false, todayMinutes: 0, steps: 3 })).toEqual({ trigger: "climb.step.pending", context: {} });
    expect(todayTrigger({ todayStudied: true, todayMinutes: 50, steps: 4 })).toEqual({ trigger: "climb.step.today", context: { steps: 4 } });
    expect(todayTrigger({ todayStudied: true, todayMinutes: 400, steps: 4 })).toEqual({ trigger: "climb.step.big", context: { hours: 6.7 } });
  });

  it("the share card shows no name and no mock score unless the student switches them on", () => {
    const off = climbCardData(first().totals!, [first()], { name: null, showMock: false });
    expect(off).toMatchObject({ name: null, lastMock: null });
    expect(climbCardData(first().totals!, [first()], { name: "Aarav", showMock: true })).toMatchObject({ name: "Aarav", lastMock: "150/300" });
  });
});

describe("the Climb screen", () => {
  it("peak, milestones ahead, rocks, today with Pexo in its form, markers on their days, quiet stones, and the base at the start", async () => {
    primePexo(on());
    render(<ClimbScreen />);
    expect(await screen.findByTestId("climb-peak")).toHaveTextContent("71 days away");
    expect(await screen.findByTestId("climb-peak-line")).toHaveTextContent("That's JEE, at the top. 71 days away.");
    expect(screen.getAllByTestId("climb-milestone-ahead")).toHaveLength(1);
    expect(await screen.findByTestId("climb-rocks-line")).toHaveTextContent("1 rocks on the path.");
    expect(screen.getByTestId("climb-rock")).toHaveAttribute("data-size", "medium");
    expect(await screen.findByTestId("climb-today-bubble")).toHaveTextContent("Today's step is waiting. One session puts it on the map.");
    expect(screen.getByTestId("climb-today").querySelector("svg.pexo")).toHaveAttribute("data-form", "solver");
    expect(screen.getByTestId("climb-landmark")).toHaveTextContent("Kinematics");
    expect(screen.getByTestId("climb-checkpoint")).toHaveTextContent("Full mock");
    expect(screen.getByTestId("climb-rubble")).toHaveTextContent("Work, Energy and Power");
    expect(screen.getByTestId("climb-quiet")).toHaveTextContent("3 quiet days");
    expect(await screen.findByTestId("climb-gap-line")).toHaveTextContent("A few quiet days here. That's okay, the climb continues.");
    // no red, no shame: quiet stones are neutral
    expect(screen.getByTestId("climb-quiet").innerHTML).not.toMatch(/danger|red/);
    fireEvent.click(screen.getByTestId("climb-more"));
    expect(await screen.findByTestId("climb-base")).toHaveTextContent("Mole Concept");
    expect(await screen.findByTestId("climb-base-line")).toHaveTextContent("These 1 chapters were done before we met.");
  });

  it("markers open their detail with Pexo's line; a rock starts the pre-filled timer", async () => {
    primePexo(on());
    render(<ClimbScreen />);
    fireEvent.click(await screen.findByTestId("climb-checkpoint"));
    expect(await screen.findByTestId("climb-detail-line")).toHaveTextContent("Mock checkpoint: 150/300. Flag planted.");
    fireEvent.click(screen.getByTestId("climb-landmark"));
    await waitFor(() => expect(screen.getByTestId("climb-detail-line")).toHaveTextContent("Kinematics is now a landmark on your climb."));
    fireEvent.click(screen.getByTestId("climb-gems"));
    await waitFor(() => expect(screen.getByTestId("climb-detail-line")).toHaveTextContent("Another gem. 1 mastered mistakes in your bag."));
    fireEvent.click(screen.getByTestId("climb-rock"));
    fireEvent.click(await screen.findByTestId("climb-rock-start"));
    expect(startFocusSession).toHaveBeenCalledWith({ originSource: "backlog_tab", originId: "b9", subject: "1", chapter: "c2" });
  });

  it("a brand-new student sees the empty line", async () => {
    primePexo(on());
    vi.mocked(getClimbPage).mockResolvedValue(first({ steps: [step("2026-11-12")], nextCursor: null, base: { n: 0, chapters: [] }, upcoming: { peak: null, milestones: [], rocks: [] }, totals: { ...first().totals!, steps: 0, chapters: 0, mocks: 0, rocksSmashed: 0, gems: 0 } }));
    render(<ClimbScreen />);
    expect(await screen.findByTestId("climb-today-bubble")).toHaveTextContent("Your climb starts with your first study day. Let's take it.");
    expect(screen.getByTestId("climb-rocks-line")).toHaveTextContent("No rocks on the path. Clear road ahead.");
  });

  it("friends lane: their Pexo in their form, steps and today, and the climb.friend line", async () => {
    primePexo(on());
    vi.mocked(getClimbFriends).mockResolvedValue([{ userId: "f1", name: "Asha", username: "asha", avatarUrl: null, form: "topper", steps: 40, studiedToday: true }]);
    render(<ClimbScreen />);
    fireEvent.click(await screen.findByTestId("climb-friends-toggle"));
    const row = await screen.findByTestId("climb-friend");
    expect(row).toHaveTextContent("40 steps · studied today");
    expect(row.querySelector("svg.pexo")).toHaveAttribute("data-form", "topper");
    fireEvent.click(row);
    await waitFor(() => expect(screen.getByTestId("climb-detail-line")).toHaveTextContent("Asha is on step 40, climbing beside you."));
  });

  it("list view shows the same data in words", async () => {
    primePexo(on());
    render(<ClimbScreen />);
    fireEvent.click(await screen.findByTestId("climb-view-toggle"));
    const list = screen.getByTestId("climb-list");
    expect(list).toHaveTextContent("10 Nov: 3h 20m, plan done, landmark Kinematics");
    expect(list).toHaveTextContent("8 Nov: Quiet day, Full mock 150/300");
  });

  it("Hinglish: only Pexo's lines change", async () => {
    primePexo(on({ language: "hi" }));
    render(<ClimbScreen />);
    expect(await screen.findByTestId("climb-today-bubble")).toHaveTextContent("Aaj ka step baaki hai. Ek session aur ye map pe.");
    expect(screen.getByText("Your climb")).toBeInTheDocument();
  });

  it("flag off: no Climb, no strip, no request", () => {
    primePexo(on({ climb: null }));
    render(
      <>
        <ClimbScreen />
        <ClimbStrip />
      </>,
    );
    expect(screen.getByTestId("climb-off")).toBeInTheDocument();
    expect(screen.queryByTestId("home-climb-strip")).toBeNull();
    expect(getClimbPage).not.toHaveBeenCalled();
  });

  it("the Home strip reads the summary that rides the XP call", () => {
    primePexo(on());
    render(<ClimbStrip />);
    expect(screen.getByTestId("home-climb-strip")).toHaveTextContent("3 steps climbed · today waiting · 71 days to JEE");
    expect(screen.getByTestId("home-climb-strip")).toHaveAttribute("href", "/home/climb");
  });
});
