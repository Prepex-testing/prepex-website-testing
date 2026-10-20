"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getTourState, markTourSeen } from "@/lib/api/tour";
import { TOUR_STEPS, findAnchor, placeBubble, type Placement, type Rect } from "@/lib/tour/tour";

/** How long a step waits for its target to appear (the plan loads after the page) before it is skipped. */
export const ANCHOR_WAIT_MS = 8000;

type Shown = { step: number; placement: Placement };

/**
 * The Day-1 tour: three tooltips on Home for a student who has never seen it (the server decides; `PILOT_TOUR` flag, off by
 * default). "Got it" moves to the next tooltip, "Skip" (or Esc) ends the tour for good. The server is told the moment the
 * first tooltip is on screen, so the tour is offered once per student, on any device.
 *
 * Plain absolutely-positioned elements, no library. It marks itself as a modal dialog, which makes the Onboarding Coach
 * stand down while the tour is up (the coach already does that for every pop-up).
 */
export function DayOneTour() {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [shown, setShown] = useState<Shown | null>(null);
  const seenSent = useRef(false);
  const gotItRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let cancelled = false;
    getTourState().then(
      (res) => {
        if (!cancelled && res.data.show) setActive(true);
      },
      () => undefined, // the tour is additive: no answer, no tour
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const end = useCallback(() => {
    setActive(false);
    setShown(null);
  }, []);

  const next = useCallback(() => {
    // the step after the last one ends the tour
    setShown(null);
    setStep((s) => s + 1);
  }, []);

  // Follow the current step's target: scroll it into view, measure it, and measure again when the page moves or changes.
  useEffect(() => {
    if (!active) return;
    if (step >= TOUR_STEPS.length) {
      end();
      return;
    }
    const { anchor } = TOUR_STEPS[step]!;
    let frame = 0;
    let scrolled = false;
    let skipped = false;
    const started = Date.now();

    const measure = () => {
      const el = findAnchor(anchor);
      if (!el) {
        // it is not on this screen: skip the tooltip (once, however many measurements run before the next step mounts)
        if (!skipped && Date.now() - started > ANCHOR_WAIT_MS) {
          skipped = true;
          next();
        }
        return;
      }
      if (!scrolled) {
        scrolled = true;
        el.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior });
      }
      const r = el.getBoundingClientRect();
      const rect: Rect = { top: r.top, left: r.left, width: r.width, height: r.height };
      setShown({ step, placement: placeBubble(rect, { width: window.innerWidth, height: window.innerHeight }) });
      if (!seenSent.current) {
        seenSent.current = true;
        void markTourSeen().catch(() => undefined);
      }
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };

    schedule();
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    // the plan card mounts after its data loads: follow the page until the target exists
    const mutations = new MutationObserver(schedule);
    mutations.observe(document.body, { childList: true, subtree: true });
    const poll = window.setInterval(schedule, 500); // also re-checks the wait limit when nothing changes

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      mutations.disconnect();
      window.clearInterval(poll);
    };
  }, [active, step, next, end]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") end();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active, end]);

  useEffect(() => {
    if (shown) gotItRef.current?.focus({ preventScroll: true });
  }, [shown?.step]); // eslint-disable-line react-hooks/exhaustive-deps -- refocus once per step, not on every re-measure

  if (!active || !shown || shown.step !== step) return null;
  const { placement } = shown;
  const last = step === TOUR_STEPS.length - 1;

  return (
    <div role="dialog" aria-modal="true" aria-label="Quick tour" className="fixed inset-0 z-[70]" data-testid="tour" data-step={step}>
      {/* a transparent layer: taps outside the bubble do nothing, so the tour cannot be left by accident */}
      <div className="absolute inset-0" aria-hidden />
      {/* the spotlight: a ring around the target whose huge shadow dims everything else */}
      <div
        aria-hidden
        data-testid="tour-ring"
        className="pointer-events-none absolute rounded-xl ring-2 ring-white transition-all duration-200"
        style={{ top: placement.ring.top, left: placement.ring.left, width: placement.ring.width, height: placement.ring.height, boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.55)" }}
      />
      <div
        data-testid="tour-bubble"
        className="absolute rounded-2xl bg-surface p-4 shadow-modal"
        style={{ top: placement.bubble.top, left: placement.bubble.left, width: placement.bubble.width }}
      >
        <span
          aria-hidden
          className={`absolute size-3 rotate-45 bg-surface ${placement.side === "below" ? "-top-1.5" : "-bottom-1.5"}`}
          style={{ left: placement.caretLeft - 6 }}
        />
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted" data-testid="tour-counter">
          {step + 1} of {TOUR_STEPS.length}
        </p>
        <p className="mt-1 text-[15px] font-semibold leading-snug text-ink" data-testid="tour-text">
          {TOUR_STEPS[step]!.text}
        </p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <button type="button" data-testid="tour-skip" onClick={end} className="min-h-11 px-2 text-[14px] font-semibold text-muted underline-offset-2 hover:underline">
            Skip
          </button>
          <button
            ref={gotItRef}
            type="button"
            data-testid="tour-next"
            onClick={last ? end : next}
            className="min-h-11 min-w-24 rounded-lg border border-primary-button-border bg-cta px-5 text-[15px] font-semibold text-white hover:bg-[#E8623F]"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
