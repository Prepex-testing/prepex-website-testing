// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAutosave } from "@/components/notebooks/editor/useAutosave";
import { ApiError } from "@/lib/api/http";

/** QA pass: a save the server refuses (here 413) was retried every 3 s forever; a dropped network still retries. */
describe("useAutosave after a failed save", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("does not resend a refused value, and tries again once the student edits", async () => {
    const save = vi.fn().mockRejectedValue(new ApiError(413, "This is too large to save."));
    const { rerender, result } = renderHook(({ v }) => useAutosave(v, save), { initialProps: { v: { n: 0 } } });
    rerender({ v: { n: 1 } });
    await act(async () => vi.advanceTimersByTimeAsync(15_000));
    expect(save).toHaveBeenCalledTimes(1);
    expect(result.current.state).toBe("error");
    rerender({ v: { n: 2 } });
    await act(async () => vi.advanceTimersByTimeAsync(1_000));
    expect(save).toHaveBeenCalledTimes(2);
  });

  it("keeps retrying when the network drops", async () => {
    const save = vi.fn().mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValue(undefined);
    const { rerender, result } = renderHook(({ v }) => useAutosave(v, save), { initialProps: { v: { n: 0 } } });
    rerender({ v: { n: 1 } });
    await act(async () => vi.advanceTimersByTimeAsync(5_000));
    expect(save).toHaveBeenCalledTimes(2);
    expect(result.current.state).toBe("saved");
  });
});
