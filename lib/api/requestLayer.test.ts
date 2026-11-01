import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  getAccessToken: vi.fn(() => "access"),
  getRefreshToken: vi.fn(() => "refresh"),
  saveTokens: vi.fn(),
  clearSession: vi.fn(),
}));
vi.mock("@/lib/api/auth", () => ({ refreshAccessToken: vi.fn() }));

import { refreshAccessToken } from "@/lib/api/auth";
import { authenticatedRequest, setRequestCacheEnabled } from "@/lib/api/authRequest";
import { ApiError, apiRequest, REQUEST_TIMEOUT_MS } from "@/lib/api/http";
import { clearSession } from "@/lib/auth/session";

/** QA pass: the request layer behind every screen. Each case here failed on the old layer. */
const json = (status: number, body: unknown, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });
const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.mocked(clearSession).mockClear();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("window", { dispatchEvent: vi.fn(), location: { pathname: "/home", assign: vi.fn() } });
  vi.stubGlobal("CustomEvent", class { constructor(public type: string) {} });
  setRequestCacheEnabled(true);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  setRequestCacheEnabled(false);
});

describe("request layer", () => {
  it("a request that never answers gives up after the time limit instead of hanging (the stuck Pause button)", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation((_url, init) => new Promise((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")))));
    const pending = apiRequest("https://api/x").catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS + 10);
    const err = await pending;
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(408);
  });

  it("a write refused with 429 waits as long as the server asks and goes through", async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValueOnce(json(429, { message: "Too many requests, please try again later." }, { "Retry-After": "2" })).mockResolvedValueOnce(json(200, { success: true, data: { status: "PAUSED" } }));
    const pending = authenticatedRequest<{ data: { status: string } }>("https://api/focus/1/pause", { method: "POST" });
    await vi.advanceTimersByTimeAsync(2_100);
    await expect(pending).resolves.toMatchObject({ data: { status: "PAUSED" } });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("screens asking for the same thing at once share one request, and a revisit within seconds is answered from memory", async () => {
    fetchMock.mockImplementation(async () => json(200, { success: true, data: 1 }));
    await Promise.all([authenticatedRequest("https://api/xp"), authenticatedRequest("https://api/xp"), authenticatedRequest("https://api/xp")]);
    await authenticatedRequest("https://api/xp");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("a write makes every remembered read stale, so a change shows at once", async () => {
    fetchMock.mockImplementation(async () => json(200, { success: true, data: 1 }));
    await authenticatedRequest("https://api/plan");
    await authenticatedRequest("https://api/tasks/1/done", { method: "POST" });
    await authenticatedRequest("https://api/plan");
    expect(fetchMock.mock.calls.filter(([u]) => u === "https://api/plan")).toHaveLength(2);
  });

  it("a read refused with 429 keeps showing the last copy instead of an error screen", async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValueOnce(json(200, { success: true, data: "old" })).mockResolvedValue(json(429, { message: "Too many requests, please try again later." }, { "Retry-After": "60" }));
    await authenticatedRequest("https://api/streak");
    await vi.advanceTimersByTimeAsync(20_000);
    await expect(authenticatedRequest("https://api/streak")).resolves.toMatchObject({ data: "old" });
  });

  it("a busy auth server during a token refresh does not sign the student out", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(async () => json(401, { message: "expired" }));
    vi.mocked(refreshAccessToken).mockRejectedValue(new ApiError(429, "Too many requests, please try again later."));
    const pending = authenticatedRequest("https://api/x", { method: "POST" }).catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(await pending).toBeInstanceOf(ApiError);
    expect(clearSession).not.toHaveBeenCalled();
  });

  it("a revoked refresh token still signs the student out", async () => {
    fetchMock.mockResolvedValueOnce(json(401, { message: "expired" }));
    vi.mocked(refreshAccessToken).mockReset().mockRejectedValueOnce(new ApiError(401, "Refresh token has been revoked"));
    await expect(authenticatedRequest("https://api/y", { method: "POST" })).rejects.toBeInstanceOf(ApiError);
    expect(clearSession).toHaveBeenCalled();
  });
});
