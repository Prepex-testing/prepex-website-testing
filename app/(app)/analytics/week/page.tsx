"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { InsightsTabs } from "@/components/insights/InsightsTabs";
import { WeeklyDiagnosisCard } from "@/components/diagnosis/WeeklyDiagnosisCard";
import { ProfileSubpageHeader } from "@/components/profile/ProfileSubpageHeader";
import { PageLoader } from "@/components/ui/PageLoader";
import { ApiError } from "@/lib/api/http";
import { getWeeklyOverview, runWeeklyDiagnosis, type WeeklyOverview } from "@/lib/api/diagnosis";

/** How often to check on a run in the background, and when to stop waiting (the Brain's accurate mode takes 1–2 minutes). */
const POLL_MS = 5000;
const GIVE_UP_MS = 8 * 60_000;

export default function ThisWeekPage() {
  const [overview, setOverview] = useState<WeeklyOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [gaveUp, setGaveUp] = useState(false);
  const waitingSince = useRef<number | null>(null);

  const load = useCallback(async () => {
    try {
      setOverview((await getWeeklyOverview()).data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "We couldn't load your weekly diagnosis. Please try again.");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load once on arrival
    void load();
  }, [load]);

  const running = overview?.current?.status === "running";

  // while a run is under way, check on it; stop after a while so a stuck run does not poll for ever
  useEffect(() => {
    if (!running) {
      waitingSince.current = null;
      return;
    }
    waitingSince.current ??= Date.now();
    const timer = setInterval(() => {
      if (waitingSince.current !== null && Date.now() - waitingSince.current > GIVE_UP_MS) {
        clearInterval(timer);
        setGaveUp(true);
        return;
      }
      void load();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [running, load]);

  async function run() {
    setStarting(true);
    setRunError(null);
    setGaveUp(false);
    try {
      const res = await runWeeklyDiagnosis();
      setOverview((o) => (o ? { ...o, current: res.data.diagnosis } : o));
      await load();
    } catch (err) {
      setRunError(err instanceof ApiError ? err.message : "We couldn't start that. Please try again.");
      await load();
    } finally {
      setStarting(false);
    }
  }

  if (!overview && !error) return <PageLoader label="Loading your week…" />;

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 lg:mx-auto lg:max-w-4xl lg:p-8" data-testid="week-page">
      <ProfileSubpageHeader title="This week" backHref="/home" />
      <InsightsTabs current="/analytics/week" />

      {error && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
          {error}{" "}
          <button type="button" className="font-bold underline" onClick={() => void load()}>
            Try again
          </button>
        </p>
      )}

      {overview && <WeeklyDiagnosisCard overview={overview} starting={starting} runError={runError} gaveUp={gaveUp} onRun={() => void run()} />}
    </div>
  );
}
