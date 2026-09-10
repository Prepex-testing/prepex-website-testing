"use client";

import { useCallback, useEffect, useState } from "react";
import { XIcon } from "@/components/ui/icons";
import {
  getCoachState,
  markCoachStepSeen,
  setCoachDisabled,
  type CoachState,
  type CoachStep,
} from "@/lib/api/coach";

/**
 * Section 16 — the Onboarding Coach, rendered by AppShell so it can point at
 * anything on the current screen.
 *
 * Each step is a coachmark: a backdrop dims the page, the target element is
 * spotlit through a cut-out, and a bubble with a caret sits beside it. One
 * step is due per schedule day, so there's a single action — "Got it" retires
 * it and the next arrives on its day. The × switches coaching off for good.
 *
 * Palette: light mode is the amber notice (#D68910 on #D689101A, pre-composited
 * as --coach-surface so the bubble stays opaque over the backdrop). Dark mode
 * drops the amber — it reads as a warning against the navy UI — for the dark
 * theme's own surface/brand blues, and the badge is the cream chip (#FAF7F2 on
 * #FAF7F214) used across the profile/plan/onboarding screens.
 *
 * Not a tutorial in the 16.7 sense: it never gates a feature, every step is
 * skippable, and dismissing the tour is one tap.
 */

const BUBBLE_W = 320;
const GAP = 12;
const EDGE = 12;

type Rect = { top: number; left: number; width: number; height: number };

/**
 * Anchors can appear more than once — the sidebar and the mobile bottom nav
 * both carry `nav-practice` — so take the first one actually laid out.
 */
function findAnchor(anchor: string): HTMLElement | null {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>(`[data-coach="${anchor}"]`));
  return nodes.find((node) => node.getBoundingClientRect().width > 0) ?? null;
}

export function OnboardingCoach() {
  const [state, setState] = useState<CoachState | null>(null);
  const [busy, setBusy] = useState(false);
  const [noticeHidden, setNoticeHidden] = useState(false);
  // Null while the target is being located; a missing anchor renders the
  // bubble centred rather than dropping the step.
  const [rect, setRect] = useState<Rect | null>(null);

  const step: CoachStep | null = state?.active ? state.step : null;
  const anchor = step?.anchor ?? null;

  useEffect(() => {
    const controller = new AbortController();
    getCoachState()
      .then(({ data }) => {
        if (!controller.signal.aborted) setState(data);
      })
      .catch(() => {
        // Coaching is additive — if it can't load, the app carries on without it.
      });
    return () => controller.abort();
  }, []);

  // Track the target's position. Everything that writes state runs in a
  // callback (rAF, listener, observer) rather than the effect body.
  useEffect(() => {
    if (!anchor) return;

    let frame = 0;
    const measure = () => {
      const el = findAnchor(anchor);
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };

    // One frame's delay lets the step's own layout settle before measuring.
    frame = requestAnimationFrame(() => {
      findAnchor(anchor)?.scrollIntoView({ block: "center", behavior: "smooth" });
      frame = requestAnimationFrame(measure);
    });

    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      observer.disconnect();
    };
  }, [anchor]);

  const advance = useCallback(async (stepId: string) => {
    setBusy(true);
    try {
      const { data } = await markCoachStepSeen(stepId);
      setRect(null);
      setState(data);
    } catch {
      // Leave the coachmark up rather than pretending it was recorded.
    } finally {
      setBusy(false);
    }
  }, []);

  const skipTour = useCallback(async () => {
    setBusy(true);
    try {
      const { data } = await setCoachDisabled(true);
      setState(data);
    } catch {
      // Same as above — a failed write shouldn't look like a success.
    } finally {
      setBusy(false);
    }
  }, []);

  // Recovery Week (PRD 16.6): a plain notice, no spotlight, no step consumed.
  if (state?.active && state.paused && state.notice && !noticeHidden) {
    return (
      <div className="px-4 pt-4 sm:px-6 lg:px-8">
        <section className="flex items-start gap-3 rounded-2xl border border-warning/25 bg-warning-bg px-4 py-3.5 dark:border-brand/10 dark:bg-surface sm:px-5">
          <p className="min-w-0 flex-1 text-[14px] font-medium leading-6 text-warning dark:text-ink">
            {state.notice}
          </p>
          <button
            type="button"
            onClick={() => setNoticeHidden(true)}
            aria-label="Dismiss"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-warning transition-colors hover:bg-warning/10 dark:text-muted dark:hover:bg-[#FAF7F2]/8 dark:hover:text-ink"
          >
            <XIcon className="h-3.5 w-3.5" />
          </button>
        </section>
      </div>
    );
  }

  if (!step) return null;

  const viewportH = typeof window === "undefined" ? 0 : window.innerHeight;
  const viewportW = typeof window === "undefined" ? 0 : window.innerWidth;

  // Prefer sitting below the target; flip above when there isn't room.
  const below = !rect || rect.top + rect.height + GAP + 200 < viewportH;
  const bubbleTop = rect
    ? below
      ? rect.top + rect.height + GAP
      : undefined
    : Math.max(EDGE, viewportH / 2 - 120);
  const bubbleBottom = rect && !below ? viewportH - rect.top + GAP : undefined;
  const bubbleLeft = rect
    ? Math.min(
        Math.max(EDGE, rect.left + rect.width / 2 - BUBBLE_W / 2),
        Math.max(EDGE, viewportW - BUBBLE_W - EDGE),
      )
    : Math.max(EDGE, viewportW / 2 - BUBBLE_W / 2);

  // Caret sits on the bubble's edge, horizontally over the target's centre.
  const caretLeft = rect
    ? Math.min(Math.max(16, rect.left + rect.width / 2 - bubbleLeft - 6), BUBBLE_W - 28)
    : BUBBLE_W / 2 - 6;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60]" role="dialog" aria-modal="false">
      {/* Backdrop + spotlight. The huge spread on a box-shadow paints
          everything except the target's own box, so the cut-out tracks the
          element without needing an SVG mask. */}
      {rect ? (
        <div
          className="pointer-events-auto absolute rounded-xl ring-2 ring-warning/70 transition-all duration-200 dark:ring-[#FAF7F2]/70"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: "0 0 0 9999px rgba(6, 6, 24, 0.6)",
          }}
        />
      ) : (
        <div className="pointer-events-auto absolute inset-0 bg-[#060618]/60" />
      )}

      <div
        className="pointer-events-auto absolute rounded-2xl bg-coach-surface shadow-modal"
        style={{
          top: bubbleTop,
          bottom: bubbleBottom,
          left: bubbleLeft,
          width: BUBBLE_W,
        }}
      >
        {rect && (
          <span
            aria-hidden="true"
            className="absolute h-3 w-3 rotate-45 bg-coach-surface"
            style={{ left: caretLeft, ...(below ? { top: -6 } : { bottom: -6 }) }}
          />
        )}

        <div className="relative rounded-2xl border border-warning/25 p-4 dark:border-brand/10">
          <div className="flex items-start justify-between gap-3">
            <p className="inline-flex w-fit items-center rounded-full text-[12px] font-bold uppercase tracking-[0.6px] text-warning dark:bg-[#FAF7F2]/8 dark:px-2.5 dark:py-1 dark:text-[#FAF7F2]">
              {step.feature}
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={skipTour}
              aria-label="Dismiss walkthrough"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-warning transition-colors hover:bg-warning/10 disabled:opacity-50 dark:text-muted dark:hover:bg-[#FAF7F2]/8 dark:hover:text-ink"
            >
              <XIcon className="h-3 w-3" />
            </button>
          </div>

          <p className="mt-2 text-[14px] font-medium leading-6 text-warning dark:text-ink">
            {step.message}
          </p>

          {/* One coachmark a day, so a single action: "Got it" retires today's
              step and the next one arrives on its own day. Turning the coach
              off entirely is the × above. */}
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-[12px] font-semibold text-warning/70 dark:text-muted">
              {step.index} of {step.total}
            </span>

            <button
              type="button"
              disabled={busy}
              onClick={() => advance(step.id)}
              className="h-8 rounded-lg bg-warning px-4 text-[13px] font-bold text-warning-fg transition-opacity hover:opacity-90 disabled:opacity-50 dark:bg-[#FAF7F2] dark:text-[#0D0D2B]"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
