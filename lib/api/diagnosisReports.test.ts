// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/http";
import { streamDiagnosisReport, type ReportStreamHandlers } from "@/lib/api/diagnosisReports";

const sse = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
const REPORT = { id: "r1", status: "complete", periodDays: 30, reportText: "## STRENGTHS\n- ok", resting: false, lastError: null, triggeredAt: "2026-10-19T10:00:00.000Z", completedAt: "2026-10-19T10:01:00.000Z" };

const streamOf = (...chunks: string[]) =>
  new Response(
    new ReadableStream<Uint8Array>({
      start(c) {
        const enc = new TextEncoder();
        for (const chunk of chunks) c.enqueue(enc.encode(chunk));
        c.close();
      },
    }),
    { status: 200, headers: { "content-type": "text/event-stream" } },
  );

const handlers = () => {
  const h = { onSnapshot: vi.fn(), onText: vi.fn(), onDone: vi.fn(), onFailed: vi.fn() } satisfies ReportStreamHandlers;
  return h;
};

beforeEach(() => {
  localStorage.setItem("prepex_access_token", "tok-123");
});
afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("streamDiagnosisReport", () => {
  it("opens the stream with the Authorization header (EventSource cannot), reports each event, and resolves true at done", async () => {
    const fetchMock = vi.fn().mockResolvedValue(streamOf(sse("snapshot", { report: { ...REPORT, status: "streaming" } }), sse("text", { text: "## STRENGTHS\n- o" }), sse("text", { text: "## STRENGTHS\n- ok" }), sse("done", { report: REPORT })));
    vi.stubGlobal("fetch", fetchMock);
    const h = handlers();
    const end = await streamDiagnosisReport("r1", h, new AbortController().signal);
    expect(end).toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, { headers: Record<string, string> }];
    expect(url).toMatch(/\/api\/diagnosis-reports\/r1\/stream$/);
    expect(init.headers.Authorization).toBe("Bearer tok-123");
    expect(init.headers.Accept).toBe("text/event-stream");
    expect(h.onSnapshot).toHaveBeenCalledWith(expect.objectContaining({ status: "streaming" }));
    expect(h.onText.mock.calls.map((c) => c[0])).toEqual(["## STRENGTHS\n- o", "## STRENGTHS\n- ok"]);
    expect(h.onDone).toHaveBeenCalledWith(REPORT);
    expect(h.onFailed).not.toHaveBeenCalled();
  });

  it("a failed event resolves true too", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(streamOf(sse("snapshot", { report: { ...REPORT, status: "streaming" } }), sse("failed", { report: { ...REPORT, status: "failed", resting: true, reportText: null } }))));
    const h = handlers();
    expect(await streamDiagnosisReport("r1", h, new AbortController().signal)).toBe(true);
    expect(h.onFailed).toHaveBeenCalledTimes(1);
  });

  it("events cut in the middle by the network are still read", async () => {
    const whole = sse("text", { text: "hello" }) + sse("done", { report: REPORT });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(streamOf(whole.slice(0, 11), whole.slice(11, 40), whole.slice(40))));
    const h = handlers();
    expect(await streamDiagnosisReport("r1", h, new AbortController().signal)).toBe(true);
    expect(h.onText).toHaveBeenCalledWith("hello");
  });

  it("a stream that ends without done or failed resolves false (the caller polls)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(streamOf(sse("snapshot", { report: { ...REPORT, status: "streaming" } }), sse("text", { text: "## STRENGTHS" }))));
    expect(await streamDiagnosisReport("r1", handlers(), new AbortController().signal)).toBe(false);
  });

  it("a non-200 is an ApiError (404 for someone else's report, 401 when the token is gone)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 404 })));
    await expect(streamDiagnosisReport("r1", handlers(), new AbortController().signal)).rejects.toBeInstanceOf(ApiError);
  });

  it("aborting stops the read", async () => {
    const controller = new AbortController();
    vi.stubGlobal(
      "fetch",
      vi.fn((_u: string, init: RequestInit) => new Promise((_r, reject) => init.signal!.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))))),
    );
    const promise = streamDiagnosisReport("r1", handlers(), controller.signal);
    controller.abort();
    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
  });
});
