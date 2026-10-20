/** The Day-1 tour: its three tooltips (English, as the operator wrote them) and the layout maths. No library. */

export type TourStep = {
  /** The element to point at: `[data-tour="<anchor>"]`. */
  anchor: string;
  text: string;
};

export const TOUR_STEPS: TourStep[] = [
  { anchor: "plan", text: "This is your Today's Plan — Prepex builds it from your weekly goals and timetable." },
  { anchor: "focus", text: "Tap Focus to start a timed study session — Prepex tracks everything." },
  { anchor: "log-mistake", text: "Tap Log Mistake whenever you get something wrong — the AI uses these to coach you better." },
];

export type Rect = { top: number; left: number; width: number; height: number };

export const BUBBLE_MAX_WIDTH = 320;
export const EDGE = 12;
export const GAP = 14;
export const RING_PAD = 6;
/** Room the bubble needs below or above the target (text, a counter and two buttons). */
export const BUBBLE_HEIGHT_ESTIMATE = 190;

export type Placement = { bubble: { top: number; left: number; width: number }; side: "below" | "above"; ring: Rect; caretLeft: number };

/**
 * Where the bubble goes for a target at `target` in a `viewport`: below it when there is room, else above, never off the
 * screen sideways, and the caret points at the target's centre.
 */
export function placeBubble(target: Rect, viewport: { width: number; height: number }, bubbleHeight: number = BUBBLE_HEIGHT_ESTIMATE): Placement {
  const width = Math.min(BUBBLE_MAX_WIDTH, viewport.width - EDGE * 2);
  const centre = target.left + target.width / 2;
  const left = Math.min(Math.max(EDGE, centre - width / 2), viewport.width - EDGE - width);
  const roomBelow = viewport.height - (target.top + target.height) - GAP - EDGE;
  const roomAbove = target.top - GAP - EDGE;
  const below = roomBelow >= bubbleHeight || roomBelow >= roomAbove;
  const top = below ? target.top + target.height + GAP : Math.max(EDGE, target.top - GAP - bubbleHeight);
  const ring = { top: target.top - RING_PAD, left: target.left - RING_PAD, width: target.width + RING_PAD * 2, height: target.height + RING_PAD * 2 };
  const caretLeft = Math.min(Math.max(16, centre - left), width - 16);
  return { bubble: { top, left, width }, side: below ? "below" : "above", ring, caretLeft };
}

/**
 * How visible an element is, 0 to 1: size, `display`, `visibility` and its own opacity multiplied through its parents. The
 * app keeps two navs mounted (the sidebar and the mobile bottom bar) and hides one with CSS, so "present" is not "on screen".
 */
export function visibility(el: HTMLElement): number {
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return 0;
  let opacity = 1;
  for (let node: HTMLElement | null = el; node; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (style.visibility === "hidden" || style.display === "none") return 0;
    opacity *= Number(style.opacity) || 0;
    if (opacity === 0) return 0;
  }
  return opacity;
}

/** The most visible `[data-tour="<anchor>"]` on the page, or null. */
export function findAnchor(anchor: string, root: ParentNode = document): HTMLElement | null {
  let best: HTMLElement | null = null;
  let bestVisibility = 0;
  for (const node of Array.from(root.querySelectorAll<HTMLElement>(`[data-tour="${anchor}"]`))) {
    const v = visibility(node);
    if (v > bestVisibility) {
      best = node;
      bestVisibility = v;
    }
  }
  return best;
}
