// @vitest-environment jsdom
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HomeTop } from "@/components/home/HomeTop";
import { cleanUsername, usernameProblem } from "@/components/social/ProfileSocialSettings";
import { heatLevel, heatmapGrid, initialsOf, ProfileAvatar, StudyingNowStrip, YearHeatmap } from "@/components/social/social";
import LeaderboardPage from "@/app/(app)/home/leaderboard/page";
import PublicProfilePage from "@/app/(app)/u/[ref]/page";
import type { BoardResult, PublicProfile } from "@/lib/api/social";
import { presenceLabel, profileHref } from "@/lib/api/social";
import { clockText, daysLeftText, subjectKey } from "@/lib/home/top";
import { BOARDS, boardCaption, FILTERS, formatHours, gapText } from "@/lib/social/board";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), usePathname: () => "/home", useParams: () => ({ ref: "aarav_s" }) }));
vi.mock("@/components/profile/ProfileSubpageHeader", () => ({ ProfileSubpageHeader: ({ title }: { title: string }) => <h1>{title}</h1> }));
vi.mock("@/components/ui/PageLoader", () => ({ PageLoader: () => <p>loading</p> }));
vi.mock("@/lib/focus/startFocusSession", () => ({ startFocusSession: vi.fn() }));
vi.mock("@/lib/api/social", async (orig) => ({
  ...(await orig<typeof import("@/lib/api/social")>()),
  getBoard: vi.fn(),
  getBoardRules: vi.fn(),
  getHall: vi.fn(),
  getSocialSettings: vi.fn(),
  updateSocialSettings: vi.fn(),
  searchStudents: vi.fn(),
  getStudyingNow: vi.fn(),
  getProfile: vi.fn(),
  followStudent: vi.fn(),
  unfollowStudent: vi.fn(),
  blockStudent: vi.fn(),
  reportStudent: vi.fn(),
  sendKudos: vi.fn(),
}));
vi.mock("@/lib/api/focus", () => ({ getActiveFocusSession: vi.fn() }));
vi.mock("@/lib/api/profile", () => ({ getProfileOverview: vi.fn() }));
vi.mock("@/lib/api/streak", async (orig) => ({ ...(await orig<typeof import("@/lib/api/streak")>()), getStreakInfo: vi.fn() }));
vi.mock("@/lib/api/xp", async (orig) => ({ ...(await orig<typeof import("@/lib/api/xp")>()), getXpSummary: vi.fn(), getRewards: vi.fn() }));
vi.mock("@/components/study/useSubjects", () => ({
  useSubjects: () => ({ status: "ready", lookup: {}, subjects: [{ subjectId: 1, subjectName: "Physics", chapters: [] }, { subjectId: 2, subjectName: "Chemistry", chapters: [] }, { subjectId: 3, subjectName: "Mathematics", chapters: [] }] }),
}));
import { getActiveFocusSession } from "@/lib/api/focus";
import { getProfileOverview } from "@/lib/api/profile";
import { blockStudent, followStudent, getBoard, getBoardRules, getHall, getProfile, getSocialSettings, getStudyingNow, searchStudents, sendKudos, updateSocialSettings } from "@/lib/api/social";
import { getStreakInfo } from "@/lib/api/streak";
import { getRewards, getXpSummary } from "@/lib/api/xp";
import { startFocusSession } from "@/lib/focus/startFocusSession";

const row = (rank: number, name: string, xp: number, over: Partial<BoardResult["rows"][number]> = {}) => ({ rank, userId: `u${rank}`, name, username: null, avatarUrl: null, level: 3, title: "Aspirant", xp, hours: 1.5, isMe: false, ...over });
const board = (over: Partial<BoardResult> = {}): BoardResult => ({
  board: "today", filter: "india", from: "2026-10-07", to: "2026-10-07", resetsOn: "2026-10-08", total: 3,
  rows: [row(1, "Asha", 300), row(2, "Bhav", 210), row(3, "Me", 172, { isMe: true })],
  me: { rank: 3, xp: 172, hours: 1.5, hidden: false, gapToAbove: { xp: 38, rank: 2, name: "Bhav" } },
  ...over,
});
const xp = { level: 6, title: "Grinder", totalXp: 1480, currentThreshold: 1214, nextThreshold: 1699, progressPct: 54, todayXp: 112, monthXp: 940, todayMinutes: 190, todayStudyMinutes: 190 };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getBoardRules).mockResolvedValue({ earn: [{ label: "Focus timer", value: "0.5 XP a minute" }], resets: { today: "Midnight IST every day", month: "The 1st of every month, IST", improved: "The 1st of every month, IST" }, caps: ["XP from study minutes stops after 10 hours in an IST day."] });
  vi.mocked(getHall).mockResolvedValue({ months: [], month: null, boards: [] });
  vi.mocked(getSocialSettings).mockResolvedValue({ username: "me_1", displayName: "Me", leaderboardHidden: false, showAccuracy: false, showMockScores: false });
  vi.mocked(getStudyingNow).mockResolvedValue([]);
});

describe("pure helpers", () => {
  it("board wording: the gap line, hours and the caption", () => {
    expect(gapText({ rank: 7, xp: 100, hours: 1, hidden: false, gapToAbove: { xp: 38, rank: 6, name: "A" } })).toBe("38 XP behind #6");
    expect(gapText({ rank: 1, xp: 100, hours: 1, hidden: false, gapToAbove: null })).toBe("You are first");
    expect(gapText({ rank: null, xp: 0, hours: 0, hidden: false, gapToAbove: null })).toBeNull();
    expect(gapText({ rank: null, xp: 50, hours: 0, hidden: true, gapToAbove: null })).toMatch(/Hidden/);
    expect([0, 0.25, 1, 1.5, 10].map(formatHours)).toEqual(["0h", "15m", "1h", "1h 30m", "10h"]);
    expect(boardCaption({ board: "month", from: "", to: "", resetsOn: "2026-11-01", total: 1 })).toBe("This month · 1 student ranked · resets 2026-11-01");
    expect(BOARDS.map((b) => b.label)).toEqual(["Today", "This month", "Most improved"]);
    expect(FILTERS.map((f) => f.label)).toEqual(["Following", "My coaching", "My target year", "All India"]);
  });

  it("home top wording", () => {
    expect([0, 59, 3661, 9047, 100_000].map(clockText)).toEqual(["0:00:00", "0:00:59", "1:01:01", "2:30:47", "27:46:40"]);
    expect(daysLeftText(79)).toEqual({ big: "79", small: "days to go" });
    expect(daysLeftText(1).small).toBe("day to go");
    expect(daysLeftText(0).big).toBe("Today");
    expect(daysLeftText(-3).big).toBe("Done");
    expect([subjectKey("Physics"), subjectKey("Mathematics"), subjectKey("Biology")]).toEqual(["physics", "maths", "biology"]);
  });

  it("presence, profile links and usernames", () => {
    expect(presenceLabel({ subjectName: "Physics", minutes: 72, onBreak: false })).toBe("Physics · 1h 12m");
    expect(presenceLabel({ subjectName: "Physics", minutes: 40, onBreak: true })).toBe("On break");
    expect(profileHref({ userId: "x", username: "aarav_s" })).toBe("/u/aarav_s");
    expect(profileHref({ userId: "abc", username: null })).toBe("/u/abc");
    expect(cleanUsername(" @Aarav_S ")).toBe("aarav_s");
    expect(usernameProblem("ab")).toMatch(/3 to 20/);
    expect(usernameProblem("has space")).toMatch(/3 to 20/);
    expect(usernameProblem("aarav_s")).toBeNull();
    expect(initialsOf("Aarav Sharma")).toBe("AS");
    expect(initialsOf("@topper_1")).toBe("T");
  });

  it("the year heatmap is whole weeks, newest on the right, with real minutes only", () => {
    const today = new Date("2026-10-07T00:00:00Z");
    const grid = heatmapGrid([{ date: "2026-10-07", minutes: 90 }, { date: "2026-10-01", minutes: 0 }], today);
    expect(grid.every((c) => c.length === 7)).toBe(true);
    const cells = grid.flat().filter(Boolean);
    expect(cells).toHaveLength(365);
    expect(cells.at(-1)).toEqual({ date: "2026-10-07", minutes: 90 });
    expect([0, 30, 100, 200, 400].map(heatLevel)).toEqual([0, 1, 2, 3, 4]);
  });
});

describe("tapping an avatar opens that profile", () => {
  it("links to the @username profile, or to the id when there is no username", () => {
    render(
      <>
        <ProfileAvatar who={{ userId: "u1", username: "aarav_s", name: "Aarav", avatarUrl: null }} />
        <ProfileAvatar who={{ userId: "u2", username: null, name: "Bhav K", avatarUrl: null }} />
      </>,
    );
    const links = screen.getAllByTestId("profile-avatar");
    expect(links[0]).toHaveAttribute("href", "/u/aarav_s");
    expect(links[1]).toHaveAttribute("href", "/u/u2");
    expect(links[1]).toHaveTextContent("BK");
  });

  it("the heatmap says how many hours the year holds", () => {
    render(<YearHeatmap days={[{ date: "2026-10-07", minutes: 120 }]} today={new Date("2026-10-07T00:00:00Z")} />);
    expect(screen.getByRole("img")).toHaveAccessibleName(/1 study days in the last year, 2 hours/);
  });
});

describe("leaderboard page", () => {
  it("shows the rows, pins my position with the gap, and switches board and filter", async () => {
    vi.mocked(getBoard).mockResolvedValue(board());
    render(<LeaderboardPage />);
    expect(await screen.findAllByTestId("board-row")).toHaveLength(3);
    expect(screen.getByTestId("my-rank")).toHaveTextContent("#3");
    expect(screen.getByTestId("my-gap")).toHaveTextContent("38 XP behind #2");
    expect(screen.getAllByTestId("board-row")[2]).toHaveAttribute("data-me", "true");

    await userEvent.click(screen.getByTestId("board-month"));
    await waitFor(() => expect(getBoard).toHaveBeenLastCalledWith({ board: "month", filter: "india", limit: 50 }));
    await userEvent.click(screen.getByTestId("filter-following"));
    await waitFor(() => expect(getBoard).toHaveBeenLastCalledWith({ board: "month", filter: "following", limit: 50 }));
  });

  it("still shows my position when I am outside the visible rows, and hidden students are told so", async () => {
    vi.mocked(getBoard).mockResolvedValue(board({ rows: [row(1, "Asha", 300)], total: 80, me: { rank: 61, xp: 12, hours: 0.5, hidden: false, gapToAbove: { xp: 3, rank: 60, name: "Zed" } } }));
    render(<LeaderboardPage />);
    expect(await screen.findByTestId("my-rank")).toHaveTextContent("#61");
    expect(screen.getByTestId("my-gap")).toHaveTextContent("3 XP behind #60");
    vi.mocked(getBoard).mockResolvedValue(board({ rows: [], total: 0, me: { rank: null, xp: 999, hours: 2, hidden: true, gapToAbove: null } }));
    await userEvent.click(screen.getByTestId("board-month"));
    await waitFor(() => expect(screen.getByTestId("my-rank")).toHaveTextContent("Hidden"));
    expect(screen.getByTestId("my-position")).toHaveTextContent("999 XP");
  });

  it("an empty Following board says what to do", async () => {
    vi.mocked(getBoard).mockResolvedValue(board({ rows: [], total: 0, me: { rank: null, xp: 0, hours: 0, hidden: false, gapToAbove: null } }));
    render(<LeaderboardPage />);
    await userEvent.click(await screen.findByTestId("filter-following"));
    expect(await screen.findByTestId("board-empty")).toHaveTextContent("Follow a few students");
  });

  it("the info sheet explains what earns XP, the resets and the caps from the server's rules", async () => {
    vi.mocked(getBoard).mockResolvedValue(board());
    render(<LeaderboardPage />);
    await userEvent.click(await screen.findByTestId("rules-open"));
    const sheet = await screen.findByTestId("rules-sheet");
    await waitFor(() => expect(sheet).toHaveTextContent("0.5 XP a minute"));
    expect(sheet).toHaveTextContent("Midnight IST every day");
    expect(sheet).toHaveTextContent("stops after 10 hours");
  });

  it("the hide switch saves and reloads the board", async () => {
    vi.mocked(getBoard).mockResolvedValue(board());
    vi.mocked(updateSocialSettings).mockResolvedValue({ username: "me_1", displayName: "Me", leaderboardHidden: true, showAccuracy: false, showMockScores: false });
    render(<LeaderboardPage />);
    await userEvent.click(await screen.findByTestId("settings-open"));
    await userEvent.click(await screen.findByRole("switch", { name: "Hide me from leaderboards" }));
    await waitFor(() => expect(updateSocialSettings).toHaveBeenCalledWith({ leaderboardHidden: true }));
  });

  it("search by name or @username lists display identities that link to profiles", async () => {
    vi.mocked(getBoard).mockResolvedValue(board());
    vi.mocked(searchStudents).mockResolvedValue([{ userId: "x1", name: "Aarav", username: "aarav_s", avatarUrl: null }]);
    render(<LeaderboardPage />);
    await userEvent.type(await screen.findByTestId("student-search"), "aar");
    const results = await screen.findByTestId("search-results", undefined, { timeout: 2000 });
    expect(results).toHaveTextContent("Aarav");
    expect(results.querySelector("a[href='/u/aarav_s']")).not.toBeNull();
  });
});

describe("home top", () => {
  afterEach(() => vi.useRealTimers());
  beforeEach(() => {
    vi.mocked(getXpSummary).mockResolvedValue(xp);
    vi.mocked(getStreakInfo).mockResolvedValue({ currentStreak: 12 } as never);
    vi.mocked(getProfileOverview).mockResolvedValue({ success: true, data: { daysUntilExam: 79, exam: { id: "e", name: "JEE Main" } } } as never);
    vi.mocked(getRewards).mockResolvedValue({ lifetime: { questions: 3420, hours: 212.5, chaptersCompleted: 14 }, badges: [], unseen: [], records: [], brokenRecords: [] });
    vi.mocked(getBoard).mockResolvedValue(board({ me: { rank: 8, xp: 112, hours: 3, hidden: false, gapToAbove: null } }));
  });

  it("shows today's real total, days left, streak, level, rank and a start button per subject", async () => {
    vi.mocked(getActiveFocusSession).mockResolvedValue({ success: true, data: { session: null, serverTime: "" } } as never);
    render(<HomeTop />);
    await waitFor(() => expect(screen.getByTestId("today-total")).toHaveTextContent("3:10:00"));
    expect(screen.getByTestId("days-left")).toHaveTextContent("79");
    expect(screen.getByTestId("days-left")).toHaveTextContent("JEE Main");
    expect(screen.getByTestId("home-streak")).toHaveTextContent("12");
    expect(screen.getByTestId("home-level")).toHaveTextContent("Level 6, Grinder");
    expect(screen.getByTestId("today-rank")).toHaveTextContent("#8");
    expect(await screen.findByTestId("lifetime-counters")).toBeInTheDocument();
    expect(screen.getAllByRole("button").filter((b) => b.dataset["testid"]?.startsWith("start-")).map((b) => b.textContent)).toEqual(["Physics", "Chemistry", "Mathematics"]);
  });

  it("one tap on a subject starts the timer for it", async () => {
    vi.mocked(getActiveFocusSession).mockResolvedValue({ success: true, data: { session: null, serverTime: "" } } as never);
    render(<HomeTop />);
    await userEvent.click(await screen.findByTestId("start-maths"));
    expect(startFocusSession).toHaveBeenCalledWith({ originSource: "home_quick_tile", subject: "maths" });
  });

  it("the number keeps climbing while a session runs, from the server's elapsed seconds", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(getActiveFocusSession).mockResolvedValue({ success: true, data: { session: { elapsedSeconds: 600, status: "ACTIVE" }, serverTime: "" } } as never);
    render(<HomeTop />);
    await waitFor(() => expect(screen.getByTestId("today-total")).toHaveTextContent("3:20:00"));
    expect(screen.getByTestId("timer-running")).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(screen.getByTestId("today-total")).toHaveTextContent("3:20:0");
    expect(screen.getByTestId("today-total").textContent).not.toBe("3:20:00");
  });
});

describe("studying now", () => {
  it("lists followed students with their subject and time, or on break; nothing when nobody is", async () => {
    vi.mocked(getStudyingNow).mockResolvedValue([
      { userId: "a", name: "Asha", username: "asha", avatarUrl: null, subjectName: "Physics", minutes: 72, onBreak: false },
      { userId: "b", name: "Bhav", username: null, avatarUrl: null, subjectName: "Chemistry", minutes: 20, onBreak: true },
    ]);
    const { unmount } = render(<StudyingNowStrip pollMs={60000} />);
    const items = await screen.findAllByTestId("studying-now-item");
    expect(items[0]).toHaveTextContent("Physics · 1h 12m");
    expect(items[1]).toHaveTextContent("On break");
    unmount();
    vi.mocked(getStudyingNow).mockResolvedValue([]);
    render(<StudyingNowStrip pollMs={60000} />);
    await waitFor(() => expect(getStudyingNow).toHaveBeenCalledTimes(2));
    expect(screen.queryByTestId("studying-now")).not.toBeInTheDocument();
  });
});

describe("public profile", () => {
  const profile = (over: Partial<PublicProfile> = {}): PublicProfile => ({
    userId: "u9", isSelf: false, name: "Aarav", username: "aarav_s", avatarUrl: null, classLabel: "12", exam: "JEE Main", examYear: 2027, coaching: "Allen", city: "Kota", level: 6, title: "Grinder", totalXp: 1480,
    streak: { current: 12, longest: 20 }, heatmap: [{ date: new Date(Date.now() + 19_800_000).toISOString().slice(0, 10), minutes: 90 }], allTimeHours: 212.5, questions: 3420, chaptersCompleted: 14,
    subjectSplit: [{ subjectId: 1, name: "Physics", minutes: 600 }, { subjectId: 2, name: "Chemistry", minutes: 400 }], badges: [{ key: "streak_7", title: "streak_7" }], followers: 5, following: 3, isFollowing: true, blockedByMe: false, ...over,
  });

  it("shows the profile, hides accuracy and mock scores the student did not turn on, and never shows contact details", async () => {
    vi.mocked(getProfile).mockResolvedValue(profile());
    render(<PublicProfilePage />);
    expect(await screen.findByTestId("profile-name")).toHaveTextContent("Aarav");
    expect(screen.getByTestId("profile-username")).toHaveTextContent("@aarav_s");
    expect(screen.getByTestId("public-profile")).toHaveTextContent("Class 12 · JEE Main 2027 · Allen · Kota");
    expect(screen.getByTestId("stat-level")).toHaveTextContent("Level 6");
    expect(screen.getByTestId("stat-streak")).toHaveTextContent("12 day streak");
    expect(screen.getByTestId("total-hours")).toHaveTextContent("212.5h");
    expect(screen.queryByTestId("total-accuracy")).not.toBeInTheDocument();
    expect(screen.queryByTestId("total-mock")).not.toBeInTheDocument();
    expect(screen.getByTestId("subject-split")).toHaveTextContent("Physics 60%");
    expect(screen.getByTestId("public-profile").textContent).not.toMatch(/@.*\.(com|io)|phone/i);
  });

  it("shows accuracy and the mock score when the student allowed them", async () => {
    vi.mocked(getProfile).mockResolvedValue(profile({ accuracy: 71, latestMockPercent: 58 }));
    render(<PublicProfilePage />);
    expect(await screen.findByTestId("total-accuracy")).toHaveTextContent("71%");
    expect(screen.getByTestId("total-mock")).toHaveTextContent("58%");
  });

  it("follow, block and kudos go through the API; kudos only for someone I follow", async () => {
    // the first load says "not following"; after the follow the page reloads and the server says "following"
    vi.mocked(getProfile).mockResolvedValueOnce(profile({ isFollowing: false })).mockResolvedValue(profile({ isFollowing: true }));
    vi.mocked(followStudent).mockResolvedValue({ following: true });
    render(<PublicProfilePage />);
    expect(screen.queryByTestId("kudos-day")).not.toBeInTheDocument();
    await userEvent.click(await screen.findByTestId("follow"));
    expect(followStudent).toHaveBeenCalledWith("u9");

    vi.mocked(sendKudos).mockResolvedValue({ sent: true });
    vi.mocked(blockStudent).mockResolvedValue({ blocked: true });
    await waitFor(() => expect(screen.getByTestId("unfollow")).toBeInTheDocument());
    await userEvent.click(screen.getByTestId("kudos-day"));
    expect(sendKudos).toHaveBeenCalledWith("u9", "day", expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
    await userEvent.click(screen.getByTestId("block"));
    expect(blockStudent).toHaveBeenCalledWith("u9");
  });

  it("my own profile has no follow button and no block or report", async () => {
    vi.mocked(getProfile).mockResolvedValue(profile({ isSelf: true, accuracy: 71, settings: { showAccuracy: true, showMockScores: false, leaderboardHidden: false } }));
    render(<PublicProfilePage />);
    await screen.findByTestId("profile-name");
    expect(screen.queryByTestId("follow")).not.toBeInTheDocument();
    expect(screen.queryByTestId("block")).not.toBeInTheDocument();
    expect(screen.getByTestId("total-accuracy")).toBeInTheDocument();
  });

  it("a student who cannot be found says so", async () => {
    vi.mocked(getProfile).mockRejectedValue(new Error("404"));
    render(<PublicProfilePage />);
    expect(await screen.findByTestId("profile-missing")).toBeInTheDocument();
  });
});
