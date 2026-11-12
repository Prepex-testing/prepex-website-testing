// @vitest-environment jsdom
import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/http";
import { isTransient, retryDelayMs, withRetry } from "@/lib/api/retry";
import { forgetResources, useResource } from "@/lib/home/useResource";
import { formatDayLabel } from "@/lib/home/useServerToday";
import { InlineRetry } from "@/components/home/InlineRetry";

afterEach(() => {
  forgetResources();
  vi.useRealTimers();
});

const noWait = () => Promise.resolve();

describe("withRetry (A1)", () => {
  it("retries a busy or failing server and returns the first real answer", async () => {
    const load = vi.fn().mockRejectedValueOnce(new ApiError(503, "down")).mockRejectedValueOnce(new ApiError(429, "busy", 2000)).mockResolvedValue("ok");
    await expect(withRetry(load, { wait: noWait })).resolves.toBe("ok");
    expect(load).toHaveBeenCalledTimes(3);
  });

  it("does not retry a real answer like 404 or 401", async () => {
    const load = vi.fn().mockRejectedValue(new ApiError(404, "nope"));
    await expect(withRetry(load, { wait: noWait })).rejects.toThrow("nope");
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("gives up after the last attempt", async () => {
    const load = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(withRetry(load, { attempts: 3, wait: noWait })).rejects.toThrow("Failed to fetch");
    expect(load).toHaveBeenCalledTimes(3);
  });

  it("honours Retry-After and backs off otherwise", () => {
    expect(retryDelayMs(new ApiError(429, "busy", 3000), 0)).toBe(3000);
    expect(retryDelayMs(new ApiError(503, "x"), 0)).toBe(600);
    expect(retryDelayMs(new ApiError(503, "x"), 2)).toBe(2400);
    expect(isTransient(new ApiError(408, "slow"))).toBe(true);
    expect(isTransient(new ApiError(400, "bad"))).toBe(false);
  });
});

describe("useResource (A1)", () => {
  it("stays loading (never a made-up value) until the data arrives", async () => {
    let resolve!: (v: number) => void;
    const { result } = renderHook(() => useResource("t:a", () => new Promise<number>((r) => (resolve = r))));
    expect(result.current).toMatchObject({ status: "loading", data: null });
    await act(async () => resolve(7));
    expect(result.current).toMatchObject({ status: "ready", data: 7 });
  });

  it("shows the last good copy while a later load fails", async () => {
    const first = renderHook(() => useResource("t:b", async () => 5));
    await waitFor(() => expect(first.result.current.data).toBe(5));
    first.unmount();
    const second = renderHook(() => useResource("t:b", async () => Promise.reject(new ApiError(404, "gone"))));
    expect(second.result.current).toMatchObject({ status: "ready", data: 5 });
    await waitFor(() => expect(second.result.current.status).toBe("ready"));
    expect(second.result.current.data).toBe(5);
  });

  it("reports an error only when every try failed and there is no copy, and Retry loads again", async () => {
    const load = vi.fn().mockRejectedValueOnce(new ApiError(404, "x")).mockResolvedValue(9);
    const { result } = renderHook(() => useResource("t:c", load));
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.data).toBeNull();
    act(() => result.current.retry());
    await waitFor(() => expect(result.current).toMatchObject({ status: "ready", data: 9 }));
  });

  it("forgets everything when the session is cleared", async () => {
    const first = renderHook(() => useResource("t:d", async () => 1));
    await waitFor(() => expect(first.result.current.data).toBe(1));
    first.unmount();
    window.dispatchEvent(new CustomEvent("prepex:session-cleared"));
    const second = renderHook(() => useResource("t:d", () => new Promise<number>(() => undefined)));
    expect(second.result.current).toMatchObject({ status: "loading", data: null });
  });
});

describe("InlineRetry", () => {
  it("names what failed and offers Retry", async () => {
    const onRetry = vi.fn();
    render(<InlineRetry what="your streak" onRetry={onRetry} />);
    expect(screen.getByRole("alert").textContent).toContain("Couldn't load your streak.");
    screen.getByRole("button", { name: "Retry" }).click();
    expect(onRetry).toHaveBeenCalledOnce();
  });
});

describe("server date (A3)", () => {
  it("formats the server's IST date label the same in every device time zone", () => {
    expect(formatDayLabel("2026-11-12")).toBe("Thursday 12 November");
  });
});
