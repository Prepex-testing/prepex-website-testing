/**
 * P6 motion tokens for JavaScript (Motion / Framer Motion). The CSS side lives in app/globals.css (--dur-*, --ease-*);
 * keep the two in step. Components never hardcode a duration: they use these.
 */
export const DURATION = { micro: 0.15, standard: 0.25, emphasis: 0.35 } as const;
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
export const EASE_IN = [0.4, 0, 1, 1] as const;

/** Physical things (sheets, the tab pill, the sidebar highlight): a spring that settles quickly without a wobble. */
export const SPRING = { type: "spring", stiffness: 520, damping: 40, mass: 0.9 } as const;
/** The same spring, faster and flatter, for lite motion (low-memory phones). */
export const SPRING_LITE = { type: "tween", duration: 0.18, ease: EASE_OUT } as const;

/** What the page asked for before first paint: "full", "lite" or "reduce" (see components/theme/constants.ts). */
export function motionMode(): "full" | "lite" | "reduce" {
  if (typeof document === "undefined") return "full";
  const m = document.documentElement.getAttribute("data-motion");
  return m === "lite" || m === "reduce" ? m : "full";
}
