import { BOOTED_KEY } from "@/components/boot/BootSplash";

/** The splash stays at least this long once it is shown, so it never flickers. */
export const BOOT_MIN_MS = 700;

/**
 * Fades the boot splash out (once the app has something to show) and remembers that this session has booted.
 *
 * It only ever HIDES the splash. The splash element is rendered by React (root layout); taking it out of the page by
 * hand left React holding a node that was no longer there, and the next screen change crashed with "Failed to execute
 * 'removeChild' / 'insertBefore' on 'Node'" (every screen after Home showed "Something went wrong", 2 Nov).
 */
export function dismissBootSplash(): void {
  if (typeof document === "undefined") return;
  const el = document.getElementById("boot-splash");
  if (!el || el.hasAttribute("data-leaving") || el.hasAttribute("data-gone")) return;
  try {
    sessionStorage.setItem(BOOTED_KEY, "1");
  } catch {
    /* private mode: the splash simply shows again next time */
  }
  const startedAt = (window as Window & { __prepexBootAt?: number }).__prepexBootAt ?? 0;
  const wait = Math.max(0, BOOT_MIN_MS - (Date.now() - startedAt));
  setTimeout(() => {
    el.setAttribute("data-leaving", "");
    setTimeout(() => el.setAttribute("data-gone", ""), 360);
  }, wait);
}
