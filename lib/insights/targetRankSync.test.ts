// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getProfile, updateTargetRank } from "@/lib/api/auth";
import { planTargetRankSync, readTargetRank, syncTargetRankAfterLogin, writeTargetRank } from "@/lib/insights/targetRank";

vi.mock("@/lib/api/auth", () => ({ getProfile: vi.fn(), updateTargetRank: vi.fn() }));

const profile = (targetRank: number | null | undefined) => ({ success: true as const, data: { targetRank } }) as never;

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
});

describe("planTargetRankSync", () => {
  it("a rank on the device is written to the profile when the profile differs", () => {
    expect(planTargetRankSync(5000, null)).toEqual({ action: "push", rank: 5000 });
    expect(planTargetRankSync(5000, undefined)).toEqual({ action: "push", rank: 5000 });
    expect(planTargetRankSync(5000, 9000)).toEqual({ action: "push", rank: 5000 });
  });

  it("nothing to do when both agree or both are empty", () => {
    expect(planTargetRankSync(5000, 5000)).toEqual({ action: "none" });
    expect(planTargetRankSync(null, null)).toEqual({ action: "none" });
    expect(planTargetRankSync(null, undefined)).toEqual({ action: "none" });
  });

  it("with nothing on the device, the profile's rank is pulled down", () => {
    expect(planTargetRankSync(null, 7000)).toEqual({ action: "pull", rank: 7000 });
  });
});

describe("syncTargetRankAfterLogin", () => {
  it("writes the device rank to the profile at login", async () => {
    writeTargetRank(4200);
    vi.mocked(getProfile).mockResolvedValue(profile(null));
    vi.mocked(updateTargetRank).mockResolvedValue({ success: true });
    await syncTargetRankAfterLogin("token-1");
    expect(getProfile).toHaveBeenCalledWith("token-1");
    expect(updateTargetRank).toHaveBeenCalledWith("token-1", 4200);
    expect(readTargetRank()).toBe(4200);
  });

  it("does not write when the profile already has the same rank", async () => {
    writeTargetRank(4200);
    vi.mocked(getProfile).mockResolvedValue(profile(4200));
    await syncTargetRankAfterLogin("t");
    expect(updateTargetRank).not.toHaveBeenCalled();
  });

  it("on a fresh device it pulls the profile's rank into local storage", async () => {
    vi.mocked(getProfile).mockResolvedValue(profile(3100));
    await syncTargetRankAfterLogin("t");
    expect(updateTargetRank).not.toHaveBeenCalled();
    expect(readTargetRank()).toBe(3100);
  });

  it("never throws: a failed profile call or a failed write leaves the device value alone", async () => {
    writeTargetRank(4200);
    vi.mocked(getProfile).mockRejectedValue(new Error("offline"));
    await expect(syncTargetRankAfterLogin("t")).resolves.toBeUndefined();
    vi.mocked(getProfile).mockResolvedValue(profile(null));
    vi.mocked(updateTargetRank).mockRejectedValue(new Error("500"));
    await expect(syncTargetRankAfterLogin("t")).resolves.toBeUndefined();
    expect(readTargetRank()).toBe(4200);
  });

  it("with nothing anywhere, it does nothing", async () => {
    vi.mocked(getProfile).mockResolvedValue(profile(null));
    await syncTargetRankAfterLogin("t");
    expect(updateTargetRank).not.toHaveBeenCalled();
    expect(readTargetRank()).toBeNull();
  });
});
