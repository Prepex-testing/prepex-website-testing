// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/home", useSearchParams: () => new URLSearchParams(), useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock("@/lib/api/xp", () => ({ onXpSummary: vi.fn(() => () => undefined), getXpSummary: vi.fn(async () => ({})), sendHeartbeat: vi.fn() }));
vi.mock("@/lib/api/pexo", async (orig) => ({
  ...(await orig<typeof import("@/lib/api/pexo")>()),
  getPexoSocial: vi.fn(),
  answerTogether: vi.fn(),
  inviteTogether: vi.fn(),
  endTogether: vi.fn(),
  challengeDuel: vi.fn(),
  answerDuel: vi.fn(),
  claimInvite: vi.fn(),
  joinFriendSession: vi.fn(),
}));
vi.mock("@/lib/api/social", async (orig) => ({ ...(await orig<typeof import("@/lib/api/social")>()), listFollowing: vi.fn(async () => [{ userId: "f9", name: "Kabir", username: "kabir", avatarUrl: null }]) }));

import { FocusDesk } from "@/components/pexo/FocusPexo";
import { PexoLayer } from "@/components/pexo/PexoLayer";
import { BatchRank, ClimbTogether, Duels, resetSocial } from "@/components/pexo/SocialPexo";
import { answerTogether, claimInvite, getPexoSocial, inviteTogether, joinFriendSession, type PexoSocial, type PexoState } from "@/lib/api/pexo";
import { claimPendingInvite, readPendingInvite, savePendingInvite } from "@/lib/pexo/invite";
import { setPendingJoin } from "@/lib/pexo/join";
import { reactAllTasksDone, reactStreak } from "@/lib/pexo/reactions";
import { offerShare } from "@/lib/pexo/share";
import { primePexo, resetPexo, takePexoBatch } from "@/lib/pexo/store";

const TODAY = "2026-11-12";
const on = (over: Partial<PexoState> = {}): PexoState => ({ enabled: true, cohort: "existing", libraryVersion: 1, language: "en", bubbles: "normal", notifications: true, accessories: [], shown: {}, firstVisits: ["planner", "goals", "logs", "analytics", "leaderboard"], marks: {}, today: TODAY, daysSinceSignup: 30, home: null, quests: null, nudge: null, care: { active: false, reason: null, distress: false }, ...over });
const friend = (name: string, id = name.toLowerCase()) => ({ userId: id, name, username: id, avatarUrl: null });
const social = (over: Partial<PexoSocial> = {}): PexoSocial => ({
  together: [
    { id: "t1", friend: friend("Asha"), status: "active", streak: 6, best: 9, freezes: 1, today: { me: false, friend: true }, line: { trigger: "together.partner_done", context: { friend: "Asha" } } },
    { id: "t2", friend: friend("Ravi"), status: "pending_in", streak: 0, best: 0, freezes: 0, today: { me: false, friend: false }, line: null },
  ],
  duels: [{ id: "d1", friend: friend("Kabir"), status: "active", me: 120, them: 80, endsAt: new Date(Date.now() + 3 * 86_400_000).toISOString(), result: null, line: { trigger: "duel.lead", context: { friend: "Kabir", xp: 40 } } }],
  invite: { code: "abc23xyz", joined: 0, rewarded: 0, recent: [] },
  batch: { rank: 3, coaching: "Allen" },
  care: false,
  ...over,
});

beforeEach(() => {
  resetPexo();
  resetSocial();
  document.documentElement.setAttribute("data-motion", "reduce");
  vi.mocked(getPexoSocial).mockReset();
  window.localStorage.clear();
  window.sessionStorage.clear();
});
afterEach(cleanup);

describe("Climb Together (D1)", () => {
  it("shows shared flames with Pexo's line as text, accepts an invite, and picks a friend to climb with", async () => {
    primePexo(on());
    vi.mocked(getPexoSocial).mockResolvedValue(social());
    vi.mocked(answerTogether).mockResolvedValue({ status: "active" });
    vi.mocked(inviteTogether).mockResolvedValue({ id: "t3" });
    const first = render(<ClimbTogether full />);
    const rows = await screen.findAllByTestId("together-row");
    expect(rows[0]).toHaveTextContent("Asha");
    expect(rows[0]).toHaveTextContent("6");
    // the first time a flame shows as shared, Pexo says it started; after that, the day's line
    expect(screen.getAllByTestId("together-line")[0]).toHaveTextContent("You and Asha now share a flame. It grows when you both study.");
    // next visit: the day's line
    first.unmount();
    resetSocial();
    render(<ClimbTogether full />);
    await waitFor(() => expect(screen.getAllByTestId("together-line")[0]).toHaveTextContent("Asha already studied today. Your turn to keep the flame alive."));
    fireEvent.click(screen.getByTestId("together-accept"));
    await waitFor(() => expect(answerTogether).toHaveBeenCalledWith("t2", true));
    fireEvent.click(screen.getByTestId("together-pick"));
    fireEvent.click(await screen.findByText("Kabir"));
    await waitFor(() => expect(inviteTogether).toHaveBeenCalledWith("f9"));
  });

  it("the invite sheet carries Pexo's invite message with the link, in the student's language", async () => {
    primePexo(on({ language: "hi" }));
    vi.mocked(getPexoSocial).mockResolvedValue(social({ together: [] }));
    render(<ClimbTogether />);
    expect(await screen.findByTestId("together-invite-line")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("invite-open"));
    expect(screen.getByTestId("invite-message")).toHaveTextContent("/join/abc23xyz");
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    fireEvent.click(screen.getByTestId("invite-whatsapp"));
    expect(open.mock.calls[0]![0]).toMatch(/^https:\/\/wa\.me\/\?text=.*join%2Fabc23xyz/);
    expect(takePexoBatch()!.events).toEqual([{ name: "invite_sent", props: { via: "whatsapp" } }]);
  });

  it("nothing at all when Pexo is off", () => {
    primePexo(on({ enabled: false }));
    render(<ClimbTogether />);
    expect(screen.queryByTestId("climb-together")).toBeNull();
    expect(getPexoSocial).not.toHaveBeenCalled();
  });
});

describe("duels and the batch line (D3, D4)", () => {
  it("shows the score and Pexo's line; hidden in care mode", async () => {
    primePexo(on());
    vi.mocked(getPexoSocial).mockResolvedValue(social());
    const { unmount } = render(<Duels />);
    expect(await screen.findByTestId("duel-row")).toHaveTextContent("120 : 80 XP");
    expect(screen.getByTestId("duel-line")).toHaveTextContent("You're 40 XP ahead of Kabir.");
    unmount();
    resetSocial();
    vi.mocked(getPexoSocial).mockResolvedValue(social({ care: true }));
    render(<Duels />);
    await waitFor(() => expect(getPexoSocial).toHaveBeenCalledTimes(2));
    expect(screen.queryByTestId("duels")).toBeNull();
  });

  it("the batch rank: always on the leaderboard, once a week on Home", async () => {
    primePexo(on());
    vi.mocked(getPexoSocial).mockResolvedValue(social());
    const { unmount } = render(<BatchRank weekly />);
    expect(await screen.findByTestId("batch-rank")).toHaveTextContent("You're #3 in your Allen batch on Prepex this month.");
    unmount();
    resetSocial();
    render(
      <>
        <BatchRank weekly />
        <BatchRank />
      </>,
    );
    await waitFor(() => expect(screen.getAllByTestId("batch-rank")).toHaveLength(1));
  });
});

describe("invite links (D2)", () => {
  it("remembers the link with its UTM tags, claims it once after sign-in", async () => {
    savePendingInvite("abc23xyz", new URLSearchParams("utm_source=whatsapp&utm_campaign=friends"));
    expect(readPendingInvite()).toMatchObject({ code: "abc23xyz", utm: { source: "whatsapp", campaign: "friends" } });
    vi.mocked(claimInvite).mockResolvedValue({ claimed: true });
    expect(await claimPendingInvite()).toBe(true);
    expect(claimInvite).toHaveBeenCalledWith("abc23xyz", { source: "whatsapp", campaign: "friends" });
    expect(readPendingInvite()).toBeNull();
    expect(await claimPendingInvite()).toBe(false);
  });
});

describe("share at high points (D5)", () => {
  it("one offer a day, after the reaction bubble; never in care mode", async () => {
    primePexo(on());
    render(<PexoLayer />);
    act(() => reactAllTasksDone(TODAY));
    // the celebration speaks first
    expect(screen.getByTestId("pexo-transient")).toHaveAttribute("data-line", "task.done.all#1");
    expect(screen.queryByTestId("pexo-share-bubble")).toBeNull();
    act(() => screen.getByTestId("pexo-transient").querySelector<HTMLButtonElement>("button[aria-label='Dismiss']")?.click());
    await waitFor(() => expect(screen.getByTestId("pexo-share-bubble")).toHaveTextContent("That's worth sharing. Want a card?"));
    fireEvent.click(screen.getByTestId("pexo-share-make"));
    expect(await screen.findByTestId("pexo-share-sheet")).toBeInTheDocument();
    // a second high point the same day: no second offer
    expect(offerShare({ kind: "streak", title: "7-day streak", mood: "celebrating" })).toBe(false);
    cleanup();
    resetPexo();
    primePexo(on({ care: { active: true, reason: "low_mood", distress: false } }));
    expect(offerShare({ kind: "level_up", title: "Level 4", mood: "celebrating" })).toBe(false);
    act(() => reactStreak(30));
  });
});

describe("Studying now: join a friend (D6)", () => {
  it("the new session is marked as studying with the friend", async () => {
    primePexo(on());
    vi.mocked(joinFriendSession).mockResolvedValue({ joined: true });
    setPendingJoin("f1", "Asha");
    render(<FocusDesk sessionId="s9" onBreak={false} subject="Physics" />);
    expect(await screen.findByTestId("focus-with")).toHaveTextContent("Studying with Asha");
    expect(joinFriendSession).toHaveBeenCalledWith("s9", "f1");
  });
});
