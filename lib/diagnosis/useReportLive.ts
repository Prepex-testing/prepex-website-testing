"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api/http";
import { getDiagnosisReport, streamDiagnosisReport, type DiagnosisReport } from "@/lib/api/diagnosisReports";

export const POLL_EVERY_MS = 2000;
/** We stop waiting for a report that has been "being written" for this long (the server gives up on it after five minutes). */
export const GIVE_UP_AFTER_MS = 6 * 60_000;

export type LiveReport = {
  report: DiagnosisReport | null;
  /** The report could not be loaded at all (not found, offline). */
  loadError: string | null;
  /** The report has taken too long: it will be marked failed by the server shortly. */
  tooLong: boolean;
};

const finished = (r: DiagnosisReport) => r.status === "complete" || r.status === "failed";

/**
 * One report, kept up to date: loaded once, then followed live (server-sent events). If the live connection cannot be
 * opened or drops before the end, the report is polled every two seconds instead, so the page never sticks on a half
 * report. Everything stops when the page is left.
 */
export function useReportLive(id: string): LiveReport {
  const [state, setState] = useState<LiveReport>({ report: null, loadError: null, tooLong: false });

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const startedAt = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const set = (patch: Partial<LiveReport>) => {
      if (!signal.aborted) setState((s) => ({ ...s, ...patch }));
    };
    const setReport = (report: DiagnosisReport) => set({ report, loadError: null });
    // a report that is still unfinished after this long: say so (the server fails it on its own soon after)
    const giveUp = setTimeout(() => {
      if (!signal.aborted) setState((s) => (s.report && finished(s.report) ? s : { ...s, tooLong: true }));
    }, GIVE_UP_AFTER_MS);

    async function poll() {
      for (;;) {
        if (signal.aborted) return;
        try {
          const report = (await getDiagnosisReport(id)).data.report;
          setReport(report);
          if (finished(report)) return;
        } catch (err) {
          if (err instanceof ApiError && err.status === 404) return set({ loadError: "We couldn't find that diagnosis." });
        }
        if (Date.now() - startedAt > GIVE_UP_AFTER_MS) return set({ tooLong: true });
        await new Promise<void>((resolve) => {
          timer = setTimeout(resolve, POLL_EVERY_MS);
        });
      }
    }

    void (async () => {
      let first: DiagnosisReport;
      try {
        first = (await getDiagnosisReport(id)).data.report;
      } catch (err) {
        return set({ loadError: err instanceof ApiError && err.status === 404 ? "We couldn't find that diagnosis." : "We couldn't load that diagnosis. Please refresh." });
      }
      setReport(first);
      if (finished(first)) return;
      try {
        const reachedEnd = await streamDiagnosisReport(
          id,
          {
            onSnapshot: setReport,
            // the server sends the whole visible text each time, and it only ever grows
            onText: (text) => {
              if (!signal.aborted) setState((s) => (s.report ? { ...s, report: { ...s.report, status: "streaming", reportText: text } } : s));
            },
            onDone: setReport,
            onFailed: setReport,
          },
          signal,
        );
        if (reachedEnd || signal.aborted) return;
      } catch {
        if (signal.aborted) return;
      }
      await poll();
    })();

    return () => {
      controller.abort();
      clearTimeout(giveUp);
      if (timer) clearTimeout(timer);
    };
  }, [id]);

  return state;
}
