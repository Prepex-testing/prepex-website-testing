"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
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
 * Palette: light mode is a white bubble (--coach-surface #FFFFFF, opaque so the
 * dimmed page can't show through) inside a --coach-border hairline. Dark mode
 * drops the amber — it reads as a warning against the navy UI — for the dark
 * theme's own surface/brand blues, and the badge is the cream chip (#FAF7F2 on
 * #FAF7F214) used across the profile/plan/onboarding screens.
 *
 * A step only renders while its target is on screen, so a home-anchored step
 * waits for Home rather than pointing at nothing; nav-anchored steps show
 * anywhere, since the sidebar and bottom nav are on every screen. It also
 * stands down entirely while a modal is open, so pop-ups are dealt with first.
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

/**
 * True while any of the app's pop-ups is open. Both Modal and WhiteModal —
 * which every dialog in the app is built on — mark themselves `aria-modal`,
 * and the coachmark deliberately does not, so this never matches itself.
 */
function isModalOpen(): boolean {
  return document.querySelector('[role="dialog"][aria-modal="true"]') !== null;
}

export function OnboardingCoach() {
  const pathname = usePathname();
  const [state, setState] = useState<CoachState | null>(null);
  const [busy, setBusy] = useState(false);
  const [noticeHidden, setNoticeHidden] = useState(false);
  // Keyed by the anchor and route it was taken on, so a step change or a
  // navigation invalidates it during render rather than via an effect.
  // `rect: null` means "measured, and this page has no such element".
  const [measured, setMeasured] = useState<{
    key: string;
    rect: Rect | null;
    modalOpen: boolean;
  } | null>(null);

  const step: CoachStep | null = state?.active ? state.step : null;
  const anchor = step?.anchor ?? null;
  const measureKey = `${anchor ?? ""}|${pathname}`;
  const current = measured?.key === measureKey ? measured : null;

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
  //
  // The mutation observer matters as much as the resize one: a home-page
  // anchor often mounts after its data loads, and a client-side navigation
  // swaps the whole subtree. Both surface here as a re-measure, which is what
  // lets a step wait for its page instead of being dropped.
  useEffect(() => {
    if (!anchor) return;

    let frame = 0;
    let pendingMeasure = 0;

    const measure = () => {
      const modalOpen = isModalOpen();
      const el = findAnchor(anchor);
      if (!el) {
        setMeasured({ key: measureKey, rect: null, modalOpen });
        return;
      }
      const r = el.getBoundingClientRect();
      setMeasured({
        key: measureKey,
        rect: { top: r.top, left: r.left, width: r.width, height: r.height },
        modalOpen,
      });
    };

    // Coalesce bursts of DOM churn into one measurement per frame.
    const scheduleMeasure = () => {
      cancelAnimationFrame(pendingMeasure);
      pendingMeasure = requestAnimationFrame(measure);
    };

    // One frame's delay lets the step's own layout settle before measuring.
    frame = requestAnimationFrame(() => {
      findAnchor(anchor)?.scrollIntoView({ block: "center", behavior: "smooth" });
      frame = requestAnimationFrame(measure);
    });

    window.addEventListener("resize", scheduleMeasure);
    window.addEventListener("scroll", scheduleMeasure, true);
    const resizeObserver = new ResizeObserver(scheduleMeasure);
    resizeObserver.observe(document.body);
    const mutationObserver = new MutationObserver(scheduleMeasure);
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(pendingMeasure);
      window.removeEventListener("resize", scheduleMeasure);
      window.removeEventListener("scroll", scheduleMeasure, true);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [anchor, measureKey]);

  const advance = useCallback(async (stepId: string) => {
    setBusy(true);
    try {
      const { data } = await markCoachStepSeen(stepId);
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

  // A coachmark only ever appears attached to its target. Steps anchored to
  // the home page therefore stay pending while the student is elsewhere —
  // they're shown next time Home is open — while the nav-anchored steps, whose
  // targets are in the sidebar/bottom nav, show on any screen. `current` being
  // null means the anchor hasn't been measured on this route yet.
  // A pop-up gets the screen to itself. Stacking the coachmark over a modal
  // put it in front of content the student can't reach (and doubled the two
  // backdrops), so it stands down until the dialog is closed — the step isn't
  // consumed, and the mutation observer brings it straight back afterwards.
  if (current?.modalOpen) return null;

  const rect = current?.rect ?? null;
  if (!rect) return null;

  const viewportH = window.innerHeight;
  const viewportW = window.innerWidth;

  // Prefer sitting below the target; flip above when there isn't room.
  const below = rect.top + rect.height + GAP + 200 < viewportH;
  const bubbleTop = below ? rect.top + rect.height + GAP : undefined;
  const bubbleBottom = below ? undefined : viewportH - rect.top + GAP;
  const bubbleLeft = Math.min(
    Math.max(EDGE, rect.left + rect.width / 2 - BUBBLE_W / 2),
    Math.max(EDGE, viewportW - BUBBLE_W - EDGE),
  );

  // Caret sits on the bubble's edge, horizontally over the target's centre.
  const caretLeft = Math.min(
    Math.max(16, rect.left + rect.width / 2 - bubbleLeft - 6),
    BUBBLE_W - 28,
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-[60]" role="dialog" aria-modal="false">
      {/* Backdrop + spotlight. The huge spread on a box-shadow paints
          everything except the target's own box, so the cut-out tracks the
          element without needing an SVG mask. */}
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

      <div
        className="pointer-events-auto absolute rounded-2xl bg-coach-surface shadow-modal"
        style={{
          top: bubbleTop,
          bottom: bubbleBottom,
          left: bubbleLeft,
          width: BUBBLE_W,
        }}
      >
        <span
          aria-hidden="true"
          className="absolute h-3 w-3 rotate-45 bg-coach-surface"
          style={{ left: caretLeft, ...(below ? { top: -6 } : { bottom: -6 }) }}
        />

        <div className="relative rounded-2xl border border-coach-border p-4 dark:border-brand/10">
          <div className="flex items-start justify-between gap-3">
            <p className="inline-flex w-fit items-center rounded-full bg-[#EEF0F8] px-2.5 py-1 text-[12px] font-bold uppercase tracking-[0.6px] text-ink dark:bg-[#FAF7F2]/8">
              {step.feature}
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={skipTour}
              aria-label="Dismiss walkthrough"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-tint-strong"
            >
              <XIcon className="h-3 w-3" />
            </button>
          </div>

          <p className="mt-2 text-[14px] font-medium leading-6 text-muted">
            {step.message}
          </p>

          <div className="mt-3 flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => advance(step.id)}
              className="pr-1.5 text-[13px] font-bold text-[#FF7A54] transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
