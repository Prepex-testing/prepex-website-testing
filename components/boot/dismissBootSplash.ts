import { BOOTED_KEY } from "@/components/boot/BootSplash";

/** The splash stays at least this long once it is shown, so it never flickers. */
export const BOOT_MIN_MS = 700;

let dismissing = false;

/** Fades the boot splash out (once the app has something to show) and remembers that this session has booted. */
export function dismissBootSplash(): void {
  if (typeof document === "undefined" || dismissing) return;
  const el = document.getElementById("boot-splash");
  if (!el) return;
  dismissing = true;
  try {
    sessionStorage.setItem(BOOTED_KEY, "1");
  } catch {
    /* private mode: the splash simply shows again next time */
  }
  const startedAt = (window as Window & { __prepexBootAt?: number }).__prepexBootAt ?? 0;
  const wait = Math.max(0, BOOT_MIN_MS - (Date.now() - startedAt));
  setTimeout(() => {
    el.setAttribute("data-leaving", "");
    setTimeout(() => el.remove(), 360);
  }, wait);
}
