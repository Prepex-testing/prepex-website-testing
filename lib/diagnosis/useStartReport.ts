"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api/http";
import { startDiagnosisReport } from "@/lib/api/diagnosisReports";
import { readTargetRank } from "@/lib/insights/targetRank";

/** "Diagnose me now": starts a report and opens its page, which then shows it being written. */
export function useStartReport(replace = false) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async () => {
    if (starting) return;
    setStarting(true);
    setError(null);
    try {
      const res = await startDiagnosisReport({ targetRank: readTargetRank() });
      const href = `/diagnosis/${res.data.report.id}`;
      if (replace) router.replace(href);
      else router.push(href);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't start your diagnosis. Please try again.");
      setStarting(false);
    }
  }, [starting, replace, router]);

  return { start, starting, error };
}
