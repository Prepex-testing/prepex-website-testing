"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api/http";
import { getDailyInsight, updateDailyInsight, type DailyOverview, type Insight } from "@/lib/api/insights";

/** "Later" hides one insight on this device until tomorrow; it is a per-device convenience, so storage may be missing. */
const LATER_KEY = "prepex_insight_later";

function today(): string {
  return new Date().toLocaleDateString("en-CA");
}

export function readLater(storage: Pick<Storage, "getItem"> | null): { id: string; day: string } | null {
  try {
    const raw = storage?.getItem(LATER_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && typeof (parsed as { id?: unknown }).id === "string" && typeof (parsed as { day?: unknown }).day === "string") {
      return parsed as { id: string; day: string };
    }
  } catch {
    // storage blocked or corrupt: behave as if nothing was snoozed
  }
  return null;
}

function snoozed(id: string): boolean {
  if (typeof window === "undefined") return false;
  let storage: Storage | null = null;
  try {
    storage = window.localStorage;
  } catch {
    storage = null;
  }
  const later = readLater(storage);
  return later !== null && later.id === id && later.day === today();
}

function snooze(id: string) {
  try {
    window.localStorage.setItem(LATER_KEY, JSON.stringify({ id, day: today() }));
  } catch {
    // ignore: the card just hides until the page is reloaded
  }
}

type Props = {
  /** Test seam / SSR: the overview to show instead of fetching. */
  initial?: DailyOverview | null;
};

/**
 * The daily AI insight at the top of Home: one honest observation about today, one nudge for tomorrow. Dismissible
 * ("Later" hides it for today, it resurfaces until read), thumbs up/down are the feedback. Quiet when there is nothing
 * to show; "AI is resting" when today's run could not reach the Brain.
 */
export function DailyInsightCard({ initial = null }: Props) {
  const [overview, setOverview] = useState<DailyOverview | null>(initial);
  const [hidden, setHidden] = useState(false);
  const [thanks, setThanks] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initial) return;
    let cancelled = false;
    getDailyInsight()
      .then((res) => {
        if (cancelled) return;
        setOverview(res.data);
        if (res.data.insight && snoozed(res.data.insight.id)) setHidden(true);
      })
      .catch(() => {
        // the card is a nicety: a failed load simply shows nothing
      });
    return () => {
      cancelled = true;
    };
  }, [initial]);

  const send = useCallback(
    async (insight: Insight, update: Parameters<typeof updateDailyInsight>[1], message: string) => {
      setBusy(true);
      setError(null);
      try {
        await updateDailyInsight(insight.id, update);
        setThanks(message);
        setOverview((o) => (o ? { ...o, insight: null } : o));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Couldn't save that. Please try again.");
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  if (thanks) {
    return (
      <p role="status" className="rounded-2xl border border-brand/10 bg-surface px-4 py-3 text-[13px] font-semibold text-muted" data-testid="insight-thanks">
        {thanks}
      </p>
    );
  }
  if (!overview) return null;

  const { insight, resting } = overview;
  if (!insight) {
    return resting ? (
      <p role="status" className="rounded-2xl border border-brand/10 bg-surface px-4 py-3 text-[13px] font-semibold text-muted" data-testid="insight-resting">
        AI resting, back soon.
      </p>
    ) : null;
  }
  if (hidden) return null;

  const BTN = "flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-brand/15 bg-surface px-3 text-[13px] font-bold text-ink hover:bg-tint-strong disabled:opacity-60";

  return (
    <section aria-label="Today's insight" className="flex flex-col gap-3 rounded-2xl border border-brand/10 bg-surface p-4 sm:p-5" data-testid="insight-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Your day, in one look</p>
          <h2 className="text-[16px] font-extrabold text-ink">Today&apos;s insight</h2>
        </div>
        <button
          type="button"
          aria-label="Hide for now"
          data-testid="insight-later"
          onClick={() => {
            snooze(insight.id);
            setHidden(true);
          }}
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-[20px] text-muted hover:bg-tint-strong"
        >
          ×
        </button>
      </div>

      <p className="text-[14px] leading-6 text-body-text dark:text-ink/90" data-testid="insight-observation">
        {insight.insight}
      </p>
      <div className="rounded-xl bg-tint-strong px-3 py-2 dark:bg-[#FAF7F214]">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted">For tomorrow</p>
        <p className="text-[14px] font-semibold leading-6 text-ink" data-testid="insight-nudge">
          {insight.nudge}
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger" data-testid="insight-error">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" aria-label="Helpful" data-testid="insight-up" disabled={busy} onClick={() => void send(insight, { feedback: "up" }, "Thanks, glad it helped.")} className={BTN}>
          👍
        </button>
        <button type="button" aria-label="Not helpful" data-testid="insight-down" disabled={busy} onClick={() => void send(insight, { feedback: "down" }, "Thanks, we'll aim better.")} className={BTN}>
          👎
        </button>
        <button type="button" data-testid="insight-read" disabled={busy} onClick={() => void send(insight, { dismissed: true }, "Noted.")} className={`${BTN} ml-auto`}>
          Got it
        </button>
      </div>
    </section>
  );
}
