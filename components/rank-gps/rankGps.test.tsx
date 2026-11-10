// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/profile/ProfileSubpageHeader", () => ({ ProfileSubpageHeader: ({ title }: { title: string }) => <h1>{title}</h1> }));
vi.mock("html-to-image", () => ({ toPng: vi.fn(async () => "data:image/png;base64,AAAA") }));
vi.mock("@/lib/api/rankGps", async (orig) => ({
  ...(await orig<typeof import("@/lib/api/rankGps")>()),
  getRankGps: vi.fn(),
  getRankGpsSnapshot: vi.fn(),
  waitForRankGps: vi.fn(),
  refreshRankGps: vi.fn(),
  setRankGpsTarget: vi.fn(async (p: number | null) => ({ targetPercentile: p })),
  addRankGpsMove: vi.fn(),
}));

import { RankGpsCard } from "@/components/rank-gps/RankGpsCard";
import { RankGpsScreen } from "@/components/rank-gps/RankGpsScreen";
import { ShareCard } from "@/components/rank-gps/ShareCards";
import { ShareSheet } from "@/components/rank-gps/ShareSheet";
import { whatIfCentre } from "@/components/rank-gps/WhatIf";
import { addRankGpsMove, getRankGps, refreshRankGps, waitForRankGps } from "@/lib/api/rankGps";
import { gateLocked, homeCardReady, makeOverview, makeReport, makeSnapshot } from "@/lib/rankGps/fixtures";
import { percentileBand } from "@/lib/rankGps/format";
import { COPY, HOW_STEPS } from "@/lib/rankGps/labels";
import { marksToPercentile } from "@/lib/rankGps/percentile";
import { squarify } from "@/lib/rankGps/treemap";

beforeEach(() => {
  vi.mocked(getRankGps).mockReset();
  vi.mocked(waitForRankGps).mockReset();
  vi.mocked(refreshRankGps).mockReset();
  vi.mocked(addRankGpsMove).mockReset();
  window.localStorage.clear();
  window.localStorage.setItem("prepex_user", JSON.stringify({ id: "u", fullName: "Aarav Sharma", email: "a@example.com" }));
});
afterEach(cleanup);

describe("treemap", () => {
  it("gives each item an area in proportion to its value and fills the box exactly", () => {
    const items = [{ id: "a", value: 6 }, { id: "b", value: 3 }, { id: "c", value: 2 }, { id: "d", value: 1 }];
    const cells = squarify(items, 100, 62);
    expect(cells).toHaveLength(4);
    const total = cells.reduce((a, c) => a + c.w * c.h, 0);
    expect(total).toBeCloseTo(100 * 62, 3);
    const a = cells.find((c) => c.id === "a")!;
    expect((a.w * a.h) / total).toBeCloseTo(6 / 12, 3);
    for (const c of cells) {
      expect(c.x).toBeGreaterThanOrEqual(-1e-9);
      expect(c.y).toBeGreaterThanOrEqual(-1e-9);
      expect(c.x + c.w).toBeLessThanOrEqual(100 + 1e-6);
      expect(c.y + c.h).toBeLessThanOrEqual(62 + 1e-6);
    }
  });

  it("ignores empty values and handles an empty list", () => {
    expect(squarify([], 100, 62)).toEqual([]);
    expect(squarify([{ value: 0 }], 100, 62)).toEqual([]);
  });
});

describe("What-If", () => {
  const w = makeReport().whatIf!;
  it("with no change the projection is the report's own centre", () => {
    expect(whatIfCentre(w, {}, 300)).toBeCloseTo(w.baseCentre, 5);
  });
  it("better accuracy or coverage never lowers the centre, and it is capped at the paper", () => {
    const up = whatIfCentre(w, { 1: { acc: 10, cov: 10 } }, 300);
    expect(up).toBeGreaterThan(w.baseCentre);
    expect(whatIfCentre(w, { 1: { acc: 30, cov: 30 }, 2: { acc: 30, cov: 30 }, 3: { acc: 30, cov: 30 } }, 300)).toBeLessThanOrEqual(300);
    expect(marksToPercentile(up)).toBeGreaterThan(marksToPercentile(w.baseCentre));
  });
});

describe("copy", () => {
  it("has no emoji and no Hinglish in the user-facing strings", () => {
    const all = [...Object.values(COPY), ...HOW_STEPS.flatMap((s) => [s.title, s.body])].join(" ");
    expect(all).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(all).not.toMatch(/\b(yaar|bhai|karo|padhai|kya)\b/i);
  });
});

describe("Rank GPS screen", () => {
  it("a new student sees the unlock state with progress, and no report", async () => {
    vi.mocked(getRankGps).mockResolvedValue(makeOverview({ gate: gateLocked, snapshot: null, refresh: { limit: 3, used: 0, left: 3, inWindow: true, windowEndsAt: "", canRefresh: false, reason: "Rank GPS unlocks after 7 days and 3 study days." } }));
    render(<RankGpsScreen />);
    expect(await screen.findByTestId("rank-gps-locked")).toHaveTextContent("2/3");
    expect(screen.queryByTestId("rank-gps-report")).toBeNull();
    expect(screen.getByTestId("rank-gps-refresh-btn")).toBeDisabled();
    expect(getRankGps).toHaveBeenCalledTimes(1);
    expect(waitForRankGps).not.toHaveBeenCalled();
  });

  it("the first (preview) report shows the score, a percentile range, rank in words, three moves and every section", async () => {
    vi.mocked(getRankGps).mockResolvedValue(makeOverview());
    render(<RankGpsScreen />);
    expect(await screen.findByTestId("rank-gps-score")).toHaveTextContent("62");
    const p = makeReport().projection.data!.percentile;
    expect(screen.getByTestId("rank-gps-percentile")).toHaveTextContent(percentileBand(p));
    expect(screen.getByTestId("rank-gps-rank")).toHaveTextContent("about 7,240 to 21,700");
    expect(screen.getByTestId("preview-badge")).toBeInTheDocument();
    for (const id of ["move-1", "move-2", "move-3", "opportunity-map", "rank-gps-autopsy", "rank-gps-effort", "rank-gps-whatif", "why-moved", "rank-gps-coach", "subject-gap"]) expect(screen.getByTestId(id), id).toBeInTheDocument();
    expect(screen.queryByTestId("pro-banner")).toBeNull();
    expect(screen.queryByTestId(/^pro-locked-/)).toBeNull();
    expect(getRankGps).toHaveBeenCalledTimes(1); // one request to view the page
    expect(waitForRankGps).not.toHaveBeenCalled(); // nothing is polled
  });

  it("a later free report locks the premium sections with a plain note, and the one banner can be dismissed for good", async () => {
    vi.mocked(getRankGps).mockResolvedValue(makeOverview({ snapshot: makeSnapshot("free", { showProBanner: true }) }));
    const { unmount } = render(<RankGpsScreen />);
    await screen.findByTestId("rank-gps-report");
    expect(screen.queryByTestId("preview-badge")).toBeNull();
    for (const s of ["fullOpportunityMap", "autopsyTrend", "whatIf"]) expect(screen.getByTestId(`pro-locked-${s}`)).toHaveTextContent("Part of Prepex Pro. Coming soon.");
    expect(screen.getByText(/Subject-level gap/)).toBeInTheDocument();
    expect(screen.getAllByTestId(/^map-cell-/)).toHaveLength(5); // the free top 5
    expect(document.body.textContent).not.toMatch(/₹|\$|price|pay now|subscribe/i);
    fireEvent.click(within(screen.getByTestId("pro-banner")).getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByTestId("pro-banner")).toBeNull();
    unmount();
    render(<RankGpsScreen />);
    await screen.findByTestId("rank-gps-report");
    expect(screen.queryByTestId("pro-banner")).toBeNull();
  });

  it("NEET has a readiness score and a route but no percentile, rank or What-If", async () => {
    vi.mocked(getRankGps).mockResolvedValue(makeOverview({ snapshot: makeSnapshot("preview", { track: "neet" }), track: "neet" }));
    render(<RankGpsScreen />);
    await screen.findByTestId("rank-gps-report");
    expect(screen.getByTestId("hero-no-percentile")).toHaveTextContent("not available for NEET");
    expect(screen.queryByTestId("rank-gps-percentile")).toBeNull();
    expect(screen.queryByTestId("rank-gps-whatif")).toBeNull();
    expect(screen.queryByTestId("target-picker")).toBeNull();
    expect(screen.getByTestId("move-1")).toBeInTheDocument();
  });

  it("with fewer than 2 full mocks the hero asks for them and Autopsy asks for mistakes", async () => {
    vi.mocked(getRankGps).mockResolvedValue(makeOverview({ snapshot: makeSnapshot("preview", { withMocks: false, withAutopsy: false }) }));
    render(<RankGpsScreen />);
    await screen.findByTestId("rank-gps-report");
    expect(screen.getByTestId("hero-needs-mocks")).toHaveTextContent("Log 2 full mocks to unlock your projected percentile");
    // one mock logged but no mistakes tagged: ask for the mistakes. With no mock at all, ask for the mock instead.
    expect(screen.getByTestId("autopsy-empty")).toHaveTextContent("Log mistakes from your latest mock");
  });

  it("Add to this week asks first, then adds once; a repeat is reported as already there", async () => {
    vi.mocked(getRankGps).mockResolvedValue(makeOverview());
    vi.mocked(addRankGpsMove).mockResolvedValueOnce({ added: true, alreadyThere: false });
    render(<RankGpsScreen />);
    await screen.findByTestId("move-1");
    fireEvent.click(screen.getByTestId("move-add-1"));
    expect(addRankGpsMove).not.toHaveBeenCalled();
    expect(screen.getByTestId("move-confirm-1")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("move-confirm-yes-1"));
    await waitFor(() => expect(screen.getByTestId("move-done-1")).toHaveTextContent("Added to this week"));
    expect(addRankGpsMove).toHaveBeenCalledTimes(1);
    expect(addRankGpsMove).toHaveBeenCalledWith("move:ch-0");
    vi.mocked(addRankGpsMove).mockResolvedValueOnce({ added: false, alreadyThere: true });
    fireEvent.click(screen.getByTestId("move-add-2"));
    fireEvent.click(screen.getByTestId("move-confirm-yes-2"));
    await waitFor(() => expect(screen.getByTestId("move-done-2")).toHaveTextContent("Already in your goals this week"));
  });

  it("Refresh enqueues, shows 'Preparing your report…' straight away, waits with ONE held request and then shows the new report", async () => {
    const before = makeOverview();
    const after = makeOverview({ snapshot: { ...makeSnapshot("preview"), id: "snap-new" } });
    vi.mocked(getRankGps).mockResolvedValueOnce(before).mockResolvedValue(after);
    vi.mocked(refreshRankGps).mockResolvedValue({ id: "snap-new", status: "queued", existing: false, left: 2 });
    let release!: () => void;
    vi.mocked(waitForRankGps).mockImplementation(() => new Promise((r) => (release = () => r({ status: "ready" }))));
    render(<RankGpsScreen />);
    await screen.findByTestId("rank-gps-report");
    expect(screen.getByTestId("rank-gps-refresh-btn")).toHaveTextContent("Refresh my GPS (3 left this month)");
    fireEvent.click(screen.getByTestId("rank-gps-refresh-btn"));
    expect(await screen.findByTestId("rank-gps-preparing")).toHaveTextContent("Preparing your report…");
    expect(document.querySelector(".animate-spin")).toBeNull(); // a skeleton, never a spinner
    release();
    await waitFor(() => expect(screen.queryByTestId("rank-gps-preparing")).toBeNull());
    expect(refreshRankGps).toHaveBeenCalledTimes(1);
    expect(waitForRankGps).toHaveBeenCalledTimes(1);
    expect(getRankGps).toHaveBeenCalledTimes(2);
  });

  it("a build that is slow says so once and does not poll", async () => {
    vi.mocked(getRankGps).mockResolvedValue(makeOverview({ snapshot: null, preparing: { id: "snap-q" } }));
    vi.mocked(waitForRankGps).mockResolvedValue({ status: "building" });
    render(<RankGpsScreen />);
    expect(await screen.findByTestId("rank-gps-slow")).toBeInTheDocument();
    expect(waitForRankGps).toHaveBeenCalledTimes(1);
  });
});

describe("Rank GPS card (Home, Dashboard, Sunday Review)", () => {
  it("ready: score, movement and the top move, linking to the screen", () => {
    render(<RankGpsCard card={homeCardReady} />);
    expect(screen.getByTestId("rank-gps-card")).toHaveAttribute("href", "/analytics/rank-gps");
    expect(screen.getByTestId("rank-gps-card-score")).toHaveTextContent("62");
    expect(screen.getByTestId("rank-gps-card-change")).toHaveTextContent("2.4");
    expect(screen.getByTestId("rank-gps-card")).toHaveTextContent("Top move: Rotational Motion");
  });
  it("locked and waiting say what is left; nothing renders when the card is missing", () => {
    const { rerender } = render(<RankGpsCard card={{ state: "locked", score: null, change: null, topMove: null, gate: gateLocked }} />);
    expect(screen.getByTestId("rank-gps-card")).toHaveTextContent("2/3");
    rerender(<RankGpsCard card={{ state: "waiting", score: null, change: null, topMove: null, gate: gateLocked }} />);
    expect(screen.getByTestId("rank-gps-card")).toHaveTextContent("ready to be built");
    rerender(<RankGpsCard card={null} />);
    expect(screen.queryByTestId("rank-gps-card")).toBeNull();
  });
});

describe("sharing", () => {
  const base = { score: 62, change: 2.4, percentile: { low: 92.4, high: 98.9 }, rank: { best: 9200, worst: 78000 }, topMove: "Rotational Motion", week: "9 Nov" };

  it("the card carries no percentile, rank or name unless they are passed in", () => {
    render(<ShareCard figures={{ ...base, percentile: null, rank: null, name: null }} format="story" />);
    const text = screen.getByTestId("rank-gps-share-story").textContent ?? "";
    expect(text).toContain("62");
    expect(text).not.toMatch(/percentile|rank about/i);
    expect(text).not.toContain("Aarav");
    expect(screen.getByTestId("rank-gps-share-story")).toHaveStyle({ width: "1080px", height: "1920px" });
  });

  it("the square card is 1080 × 1080", () => {
    render(<ShareCard figures={{ ...base, percentile: null, rank: null, name: null }} format="square" />);
    expect(screen.getByTestId("rank-gps-share-square")).toHaveStyle({ width: "1080px", height: "1080px" });
  });

  it("the sheet starts with percentile, rank and name all OFF, and turning them on puts them on the card", async () => {
    render(<ShareSheet open onClose={() => undefined} base={base} firstName="Aarav" />);
    const switches = screen.getAllByRole("switch");
    expect(switches).toHaveLength(3);
    for (const s of switches) expect(s).toHaveAttribute("aria-checked", "false");
    const card = () => screen.getByTestId("rank-gps-share-story").textContent ?? "";
    expect(card()).not.toMatch(/percentile/);
    fireEvent.click(screen.getByRole("switch", { name: "Show my percentile" }));
    fireEvent.click(screen.getByRole("switch", { name: "Show my first name" }));
    expect(card()).toMatch(/percentile/);
    expect(card()).toContain("Aarav");
    await waitFor(() => expect(screen.getByTestId("rank-gps-share-preview")).toBeInTheDocument());
  });
});
