// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({ pathname: "/home", search: new URLSearchParams() }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname, useSearchParams: () => nav.search, useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock("@/lib/api/xp", () => ({ onXpSummary: vi.fn(() => () => undefined), getXpSummary: vi.fn(async () => ({})), sendHeartbeat: vi.fn() }));
vi.mock("@/lib/api/pexo", async (orig) => ({ ...(await orig<typeof import("@/lib/api/pexo")>()), askPexo: vi.fn(), getPexoTeaser: vi.fn() }));
vi.mock("@/lib/api/profile", () => ({ getProfileOverview: vi.fn(async () => ({ data: { daysUntilExam: 180 } })) }));
vi.mock("@/lib/focus/startFocusSession", () => ({ startFocusSession: vi.fn() }));
const draft = vi.hoisted(() => ({ value: { about: { currentLevel: "CLASS_12" }, chapters: { completedIds: [] as string[] } } }));
vi.mock("@/lib/onboarding/draft-context", () => ({ useOnboardingDraft: () => ({ draft: draft.value, ready: true }) }));

import { DayClosePexo, rewardTrigger } from "@/components/pexo/DayClosePexo";
import { HomePexo, OPEN_DAY_CLOSE_EVENT } from "@/components/pexo/HomePexo";
import { OnboardingPexo } from "@/components/pexo/OnboardingPexo";
import { PexoEmpty } from "@/components/pexo/PexoEmpty";
import { firstVisitScreen, PexoLayer } from "@/components/pexo/PexoLayer";
import { PexoTour, TOUR_CARDS } from "@/components/pexo/PexoTour";
import { PrepexMap } from "@/components/pexo/PrepexMap";
import { askPexo, getPexoTeaser, type PexoState } from "@/lib/api/pexo";
import { startFocusSession } from "@/lib/focus/startFocusSession";
import { PEXO_LIBRARY, primePexo, resetPexo, takePexoBatch } from "@/lib/pexo/store";

const TODAY = "2026-11-12";
const on = (over: Partial<PexoState> = {}): PexoState => ({ enabled: true, cohort: "existing", libraryVersion: 1, language: "en", bubbles: "normal", notifications: true, accessories: [], shown: {}, firstVisits: [], marks: {}, today: TODAY, daysSinceSignup: 30, home: null, quests: null, nudge: null, care: { active: false, reason: null, distress: false }, ...over });
const text = (id: string) => PEXO_LIBRARY.lines.find((l) => l.id === id)!.en;

beforeEach(() => {
  resetPexo();
  document.documentElement.setAttribute("data-motion", "reduce");
  nav.pathname = "/home";
  nav.search = new URLSearchParams();
  vi.mocked(askPexo).mockReset();
  vi.mocked(getPexoTeaser).mockReset();
  vi.mocked(startFocusSession).mockReset();
});
afterEach(cleanup);

describe("Home Pexo (B6, B7, B8)", () => {
  const home = (over = {}) => ({ key: "midday:1", triggers: ["home.midday", "home.morning"], context: { n: 4, done: 1, left: 3 }, exclude: ["home.midday#2", "home.midday#3", "home.morning#1"], actions: [], ...over });

  it("says one Home line from the family the server chose, never an excluded (untrue) one", () => {
    primePexo(on({ home: home() }));
    render(<HomePexo />);
    expect(screen.getByTestId("home-pexo-bubble")).toHaveAttribute("data-line", "home.midday#1");
    expect(screen.getByTestId("pexo-text")).toHaveTextContent("1 of 4 done. Keep the rhythm.");
  });

  it("care mode: a calm care line, and no nudge beside it", () => {
    primePexo(on({ home: home({ key: "care.low_mood", triggers: ["care.low_mood"], context: {}, exclude: [] }), care: { active: true, reason: "low_mood", distress: false }, nudge: { trigger: "nudge.lecture_heavy", context: {}, action: null } }));
    render(<HomePexo />);
    expect(screen.getByTestId("home-pexo")).toHaveAttribute("data-care", "on");
    expect(screen.getByTestId("home-pexo-bubble").getAttribute("data-line")).toMatch(/^care\.low_mood#/);
    expect(screen.queryByTestId("home-pexo-nudge")).toBeNull();
  });

  it("the distress line is recorded so it is not repeated within the week", () => {
    primePexo(on({ home: home({ key: "care.distress", triggers: ["care.distress"], context: {}, exclude: [] }), care: { active: true, reason: "low_mood", distress: true } }));
    render(<HomePexo />);
    expect(screen.getByTestId("pexo-text")).toHaveTextContent("Tele-MANAS (14416)");
    expect(takePexoBatch()!.marks).toContain("care.distress");
  });

  it("a nudge sits below as a soft, dismissible card", () => {
    primePexo(on({ home: home(), nudge: { trigger: "nudge.revision_skipped", context: {}, action: { label: "Edit timetable", href: "/timetable" } } }));
    render(<HomePexo />);
    expect(screen.getByTestId("home-pexo-nudge")).toHaveTextContent(text("nudge.revision_skipped#1"));
    expect(screen.getByRole("link", { name: "Edit timetable" })).toHaveAttribute("href", "/timetable");
    fireEvent.click(screen.getByTestId("pexo-dismiss"));
    expect(screen.queryByTestId("home-pexo-nudge")).toBeNull();
  });

  it("the Day Close state's button opens the Day Close flow", () => {
    primePexo(on({ home: home({ key: "day_close", triggers: ["dayclose.prompt"], context: {}, exclude: [], actions: [{ label: "Close my day", href: "/home#day-close" }] }) }));
    const opened = vi.fn();
    window.addEventListener(OPEN_DAY_CLOSE_EVENT, opened);
    render(<HomePexo />);
    fireEvent.click(screen.getByTestId("home-pexo-action"));
    expect(opened).toHaveBeenCalled();
    window.removeEventListener(OPEN_DAY_CLOSE_EVENT, opened);
  });

  it('"What should I do now?" asks once, shows the answer with Start, the playbook and quick links', async () => {
    primePexo(on({ home: home() }));
    vi.mocked(askPexo).mockResolvedValue({ trigger: "ask.next.task", context: { task: "Practice: Kinematics" }, action: { kind: "focus", label: "Start", taskId: "t1", subjectId: 1, chapterId: "c1", taskType: "practice", minutes: 45 } });
    render(<HomePexo />);
    fireEvent.click(screen.getByTestId("home-pexo-ask"));
    expect(await screen.findByTestId("ask-answer")).toHaveTextContent("Next up: Practice: Kinematics. Shall I start the timer?");
    expect(askPexo).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("ask-playbook")).toHaveTextContent(text("playbook.4#1"));
    expect(screen.getByRole("link", { name: "Log a mock" })).toHaveAttribute("href", "/logs/mocks");
    fireEvent.click(screen.getByTestId("ask-go"));
    expect(startFocusSession).toHaveBeenCalledWith({ originSource: "planner", originId: "t1", subject: "1", chapter: "c1", taskType: "practice", targetMinutes: 45 });
  });

  it("tap waves with an easter line; nothing renders when Pexo is off", () => {
    primePexo(on({ home: home() }));
    const { unmount } = render(<HomePexo />);
    fireEvent.click(screen.getByRole("button", { name: "Pexo" }));
    expect(screen.getByTestId("home-pexo-bubble").getAttribute("data-line")).toMatch(/^easter\.tap#/);
    unmount();
    resetPexo();
    primePexo(on({ enabled: false, home: home() }));
    render(<HomePexo />);
    expect(screen.queryByTestId("home-pexo")).toBeNull();
  });
});

describe("Your Prepex map (B3)", () => {
  it("7 tiles, the recommended one highlighted with its line, done ones ticked", () => {
    primePexo(on({ quests: { done: ["focus", "friend"], justDone: [], recommend: "dayclose", allDone: false } }));
    render(<PrepexMap />);
    expect(screen.getByTestId("prepex-map-count")).toHaveTextContent("2 of 7");
    expect(screen.getAllByRole("listitem")).toHaveLength(7);
    expect(screen.getByTestId("quest-focus")).toHaveAttribute("data-done", "true");
    expect(screen.getByTestId("quest-dayclose")).toHaveAttribute("data-recommended", "true");
    expect(screen.getByTestId("prepex-map-recommend")).toHaveTextContent(text("quest.dayclose.recommend#1"));
    expect(screen.getByRole("heading", { name: "Your Prepex map" })).toBeInTheDocument();
  });

  it("all 7 done: celebrated once, then the card is gone for good", () => {
    primePexo(on({ quests: { done: ["focus", "dayclose", "revision", "mistake", "practice", "backlog", "friend"], justDone: ["friend"], recommend: null, allDone: true } }));
    const { unmount } = render(<PrepexMap />);
    expect(screen.getByTestId("prepex-map")).toBeInTheDocument();
    unmount();
    render(<PrepexMap />);
    expect(screen.queryByTestId("prepex-map")).toBeNull();
    expect(takePexoBatch()!.marks).toContain("quest.all_done");
  });
});

describe("first-visit bubbles (B4)", () => {
  it("maps paths to screens, longest prefix first; the timer is never one", () => {
    expect(firstVisitScreen("/analytics/rank-gps")).toBe("rank_gps");
    expect(firstVisitScreen("/analytics")).toBe("analytics");
    expect(firstVisitScreen("/logs/revision")).toBe("revision");
    expect(firstVisitScreen("/logs/practice")).toBe("logs");
    expect(firstVisitScreen("/home/leaderboard")).toBe("leaderboard");
    expect(firstVisitScreen("/notebooks/abc")).toBe("notebooks");
    expect(firstVisitScreen("/focus/start")).toBeNull();
    expect(firstVisitScreen("/home")).toBeNull();
  });

  it("shows once per student, then never again; muted while focusing", () => {
    nav.pathname = "/planner";
    primePexo(on());
    const { rerender, unmount } = render(<PexoLayer />);
    expect(screen.getByTestId("pexo-transient")).toHaveAttribute("data-line", "first_visit.planner#1");
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    rerender(<PexoLayer />);
    unmount();
    render(<PexoLayer />);
    expect(screen.queryByTestId("pexo-transient")).toBeNull();
    expect(takePexoBatch()!.firstVisits).toEqual(["planner"]);
    cleanup();
    resetPexo();
    primePexo(on());
    nav.pathname = "/goals";
    render(<PexoLayer muted />);
    expect(screen.queryByTestId("pexo-transient")).toBeNull();
    expect(takePexoBatch()).toBeNull(); // not recorded when it was not shown
  });

  it("right after onboarding, the goals screen says the onboarding goals line", () => {
    nav.pathname = "/goals";
    nav.search = new URLSearchParams("welcome=1");
    primePexo(on());
    render(<PexoLayer />);
    expect(screen.getByTestId("pexo-transient")).toHaveAttribute("data-line", "onb.goals#1");
  });
});

describe("empty states (B5)", () => {
  it("Pexo's line and one action; the old text when Pexo is off", () => {
    primePexo(on());
    const { unmount } = render(<PexoEmpty trigger="empty.sessions" action={{ label: "Start a focus session", href: "/focus/start?origin=standalone" }}>Nothing logged yet</PexoEmpty>);
    expect(screen.getByTestId("pexo-empty")).toHaveTextContent(text("empty.sessions#1"));
    expect(screen.getByTestId("pexo-empty-action")).toHaveAttribute("href", "/focus/start?origin=standalone");
    expect(screen.queryByText("Nothing logged yet")).toBeNull();
    unmount();
    resetPexo();
    primePexo(on({ enabled: false }));
    render(<PexoEmpty trigger="empty.sessions">Nothing logged yet</PexoEmpty>);
    expect(screen.getByText("Nothing logged yet")).toBeInTheDocument();
    expect(screen.queryByTestId("pexo-empty")).toBeNull();
  });
});

describe("the 60-second tour and first session (B2)", () => {
  it("six cards, the finale with real days to the exam, then a 15-minute first session pre-filled", async () => {
    primePexo(on({ daysSinceSignup: 0 }));
    render(<PexoTour firstSubject="Physics" />);
    for (const card of TOUR_CARDS) {
      expect(screen.getByTestId("pexo-tour-text")).toHaveTextContent(text(`${card.trigger}#1`));
      fireEvent.click(screen.getByTestId("pexo-tour-next"));
    }
    expect(screen.getByTestId("pexo-tour-text")).toHaveTextContent(text("tour.end#1"));
    await waitFor(() => undefined);
    fireEvent.click(screen.getByTestId("pexo-tour-next"));
    await waitFor(() => expect(screen.getByTestId("pexo-tour-text")).toHaveTextContent("180 days to JEE"));
    fireEvent.click(screen.getByTestId("pexo-tour-next"));
    expect(screen.getByTestId("pexo-tour-text")).toHaveTextContent(text("onb.first_session#1"));
    fireEvent.click(screen.getByTestId("pexo-first-start"));
    expect(startFocusSession).toHaveBeenCalledWith({ originSource: "home_quick_tile", targetMinutes: 15, taskType: "self_study", subject: "physics" });
    const batch = takePexoBatch()!;
    expect(batch.marks).toEqual(expect.arrayContaining(["tour", "first_session.offered"]));
    expect(batch.events).toEqual([{ name: "tour_completed", props: { at: "first" } }]);
  });

  it("skippable at any card; not shown after the first week or once done", () => {
    primePexo(on({ daysSinceSignup: 1 }));
    const { unmount } = render(<PexoTour firstSubject={null} />);
    fireEvent.click(screen.getByTestId("pexo-tour-skip"));
    expect(screen.queryByTestId("pexo-tour")).toBeNull();
    expect(takePexoBatch()!.events).toEqual([{ name: "tour_skipped", props: { at: 0 } }]);
    unmount();
    render(<PexoTour firstSubject={null} />);
    expect(screen.queryByTestId("pexo-tour")).toBeNull();
    cleanup();
    resetPexo();
    primePexo(on({ daysSinceSignup: 8 }));
    render(<PexoTour firstSubject={null} />);
    expect(screen.queryByTestId("pexo-tour")).toBeNull();
  });

  it("Later says the skip line and closes", () => {
    primePexo(on({ daysSinceSignup: 0 }));
    render(<PexoTour firstSubject={null} />);
    for (let i = 0; i < TOUR_CARDS.length + 2; i += 1) fireEvent.click(screen.getByTestId("pexo-tour-next"));
    fireEvent.click(screen.getByTestId("pexo-first-later"));
    expect(screen.getByTestId("pexo-tour-text")).toHaveTextContent(text("onb.first_session.skip#1"));
    fireEvent.click(screen.getByTestId("pexo-tour-done"));
    expect(screen.queryByTestId("pexo-tour")).toBeNull();
    expect(startFocusSession).not.toHaveBeenCalled();
  });
});

describe("onboarding narration (B1)", () => {
  it("hello 1-3 on the first step, then nothing there again", () => {
    nav.pathname = "/onboarding/preparing-for";
    primePexo(on());
    const { unmount } = render(<OnboardingPexo />);
    expect(screen.getByTestId("onboarding-pexo-bubble")).toHaveAttribute("data-line", "onb.hello.1#1");
    fireEvent.click(screen.getByTestId("onboarding-pexo-next"));
    expect(screen.getByTestId("onboarding-pexo-bubble")).toHaveAttribute("data-line", "onb.hello.2#1");
    fireEvent.click(screen.getByTestId("onboarding-pexo-next"));
    expect(screen.getByTestId("onboarding-pexo-bubble")).toHaveAttribute("data-line", "onb.hello.3#1");
    fireEvent.click(screen.getByTestId("onboarding-pexo-next"));
    unmount();
    render(<OnboardingPexo />);
    expect(screen.queryByTestId("onboarding-pexo")).toBeNull();
  });

  it("the class step replies to the class picked; the chapters step counts what was ticked", () => {
    primePexo(on());
    nav.pathname = "/onboarding/tell-us-about-you";
    const { rerender } = render(<OnboardingPexo />);
    expect(screen.getByTestId("onboarding-pexo-bubble")).toHaveAttribute("data-line", "onb.class.12#1");
    draft.value = { ...draft.value, about: { currentLevel: "DROPPER_1" } };
    rerender(<OnboardingPexo />);
    expect(screen.getByTestId("onboarding-pexo-bubble")).toHaveAttribute("data-line", "onb.class.dropper#1");
    nav.pathname = "/onboarding/which-chapters-have-you-studied";
    rerender(<OnboardingPexo />);
    expect(screen.getByTestId("onboarding-pexo-bubble")).toHaveAttribute("data-line", "onb.chapters#1");
    draft.value = { ...draft.value, chapters: { completedIds: ["a", "b", "c"] } };
    rerender(<OnboardingPexo />);
    expect(screen.getByTestId("pexo-text")).toHaveTextContent("3 chapters done already. That's 3 steps climbed");
    expect(takePexoBatch()!.events).toEqual([{ name: "onboarding_step_completed", props: { step: "about" } }]);
  });
});

describe("Day Close ends with Pexo (B9)", () => {
  it("picks the reward line from the real day", () => {
    expect(rewardTrigger({ minutes: 0, tasksDone: 0, tasksTotal: 4 }).trigger).toBe("dayclose.reward.zero");
    expect(rewardTrigger({ minutes: 240, tasksDone: 5, tasksTotal: 6 })).toEqual({ trigger: "dayclose.reward.great", context: { hours: 4, tasks: 5 } });
    expect(rewardTrigger({ minutes: 90, tasksDone: 3, tasksTotal: 3 }).trigger).toBe("dayclose.reward.great");
    expect(rewardTrigger({ minutes: 50, tasksDone: 1, tasksTotal: 5 }).trigger).toBe("dayclose.reward.ok");
  });

  it("shows the reward line and tomorrow's teaser", async () => {
    primePexo(on());
    vi.mocked(getPexoTeaser).mockResolvedValue({ trigger: "dayclose.teaser", context: { task: "Watch lecture: Optics" } });
    render(<DayClosePexo summary={{ minutes: 240, tasksDone: 5, tasksTotal: 6 }} />);
    expect(screen.getByTestId("day-close-pexo-reward")).toHaveTextContent("4h, 5 tasks. That's a step up.");
    expect(await screen.findByTestId("day-close-pexo-teaser")).toHaveTextContent("Tomorrow starts with Watch lecture: Optics. Sleep well.");
    await act(async () => undefined);
  });
});
