// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BOOTED_KEY } from "@/components/boot/BootSplash";
import { BOOT_MIN_MS, dismissBootSplash } from "@/components/boot/dismissBootSplash";
import { PageLoader, SKELETON_DELAY_MS } from "@/components/ui/PageLoader";

vi.mock("@/lib/api/xp", () => ({ getXpSummary: vi.fn(async () => ({})), getRewards: vi.fn(async () => ({})) }));
vi.mock("@/lib/api/streak", () => ({ getStreakInfo: vi.fn(async () => ({})) }));
vi.mock("@/lib/api/profile", () => ({ getProfileOverview: vi.fn(async () => ({})) }));
vi.mock("@/lib/api/studyLog", () => ({ getStudySummary: vi.fn(async () => ({})) }));
vi.mock("@/lib/api/masterAnalytics", () => ({ getMasterAnalytics: vi.fn(async () => ({})) }));
import { getXpSummary } from "@/lib/api/xp";
import { prefetchNavData } from "@/lib/prefetch/navData";

/** P6 part A: no spinners, a splash once per session, data fetched before the click. */
describe("P6 instant", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("a page that loads in under 300 ms shows nothing new; a slower one shows a skeleton, never a spinner", () => {
    render(<PageLoader label="Loading your day" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading your day");
    expect(document.querySelector(".skeleton")).toBeNull();
    act(() => vi.advanceTimersByTime(SKELETON_DELAY_MS + 1));
    expect(document.querySelectorAll(".skeleton").length).toBeGreaterThan(3);
    expect(document.querySelector(".animate-spin")).toBeNull();
  });

  it("the boot splash stays at least 700 ms, then fades out and is remembered for the session", () => {
    sessionStorage.clear();
    const el = document.createElement("div");
    el.id = "boot-splash";
    document.body.appendChild(el);
    (window as Window & { __prepexBootAt?: number }).__prepexBootAt = Date.now();
    dismissBootSplash();
    expect(sessionStorage.getItem(BOOTED_KEY)).toBe("1");
    act(() => vi.advanceTimersByTime(BOOT_MIN_MS - 50));
    expect(el.hasAttribute("data-leaving")).toBe(false);
    act(() => vi.advanceTimersByTime(100));
    expect(el.hasAttribute("data-leaving")).toBe(true);
    act(() => vi.advanceTimersByTime(400));
    expect(document.getElementById("boot-splash")).toBeNull();
  });

  it("hovering a nav item fetches that screen's data once, not on every hover", () => {
    prefetchNavData("/home");
    prefetchNavData("/home");
    expect(getXpSummary).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(16_000));
    prefetchNavData("/home");
    expect(getXpSummary).toHaveBeenCalledTimes(2);
    prefetchNavData("/somewhere-else");
  });
});
