// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/http";

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@/lib/api/plannerV2", () => ({ getPlanDay: vi.fn(), buildPlan: vi.fn() }));

import * as Sentry from "@sentry/nextjs";
import { buildPlan, getPlanDay } from "@/lib/api/plannerV2";
import { failureReason, usePlanDay } from "@/components/planner/usePlanDay";

const day = { date: "2026-11-12", tasks: [], summary: { plannedMinutes: 0 } } as never;

afterEach(() => vi.clearAllMocks());

describe("Couldn't build your plan (A2)", () => {
  it("retries once on its own before showing the error", async () => {
    vi.mocked(getPlanDay).mockRejectedValueOnce(new ApiError(503, "busy")).mockResolvedValue({ success: true, data: day } as never);
    const { result } = renderHook(() => usePlanDay(undefined));
    await waitFor(() => expect(result.current.status).toBe("ready"), { timeout: 4000 });
    expect(getPlanDay).toHaveBeenCalledTimes(2);
  });

  it("shows the error after the second failure and logs both with the reason", async () => {
    vi.mocked(getPlanDay).mockRejectedValue(new ApiError(500, "planner exploded"));
    const { result } = renderHook(() => usePlanDay(undefined));
    await waitFor(() => expect(result.current.status).toBe("error"), { timeout: 4000 });
    expect(getPlanDay).toHaveBeenCalledTimes(2);
    expect(Sentry.captureException).toHaveBeenCalledTimes(2);
    expect(vi.mocked(Sentry.captureException).mock.calls[1]![1]).toMatchObject({ tags: { area: "planner", step: "load", attempt: "2" }, extra: { reason: "500 planner exploded" } });
  });

  it("does not retry a 4xx answer", async () => {
    vi.mocked(getPlanDay).mockRejectedValue(new ApiError(404, "no profile"));
    const { result } = renderHook(() => usePlanDay(undefined));
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(getPlanDay).toHaveBeenCalledTimes(1);
  });

  it("building retries once too", async () => {
    vi.mocked(getPlanDay).mockResolvedValue({ success: true, data: day } as never);
    vi.mocked(buildPlan).mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValue({ success: true, data: { day } } as never);
    const { result } = renderHook(() => usePlanDay(undefined));
    await waitFor(() => expect(result.current.status).toBe("ready"));
    await expect(result.current.build("SCHEDULED")).resolves.toBeNull();
    expect(buildPlan).toHaveBeenCalledTimes(2);
  });

  it("describes a failure in a few words", () => {
    expect(failureReason(new ApiError(503, "busy"))).toBe("503 busy");
    expect(failureReason(new TypeError("Failed to fetch"))).toBe("TypeError: Failed to fetch");
  });
});
