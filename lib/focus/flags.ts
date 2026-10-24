/**
 * Focus-timer feature flags (defaults are the 29 Oct demo settings). Next inlines NEXT_PUBLIC_* at build time.
 *
 *   NEXT_PUBLIC_USE_NEW_FOCUS_TIMER_ONLY=on|off   default ON  the legacy timer is gone; there is no toggle to show
 *   NEXT_PUBLIC_FOCUS_TIMER_AUTOLOG=on|off         default ON  the end screen promises (and the server does) the automatic logging
 *   NEXT_PUBLIC_FOCUS_TIMER_MISTAKE_AUTOFEED=on|off default ON  the practice sheet offers to send wrong answers to the notebook
 *
 * The server owns the real switches (FOCUS_TIMER_AUTOLOG, FOCUS_TIMER_MISTAKE_AUTOFEED in core-service); these only
 * decide what the screen says so it never promises something the server will not do.
 */

export function readFlag(raw: string | undefined, defaultValue: boolean): boolean {
  const value = raw?.trim().toLowerCase();
  if (!value) return defaultValue;
  if (["off", "false", "0", "no"].includes(value)) return false;
  if (["on", "true", "1", "yes"].includes(value)) return true;
  return defaultValue;
}

export const FOCUS_FLAGS = {
  useNewFocusTimerOnly: readFlag(process.env.NEXT_PUBLIC_USE_NEW_FOCUS_TIMER_ONLY, true),
  autolog: readFlag(process.env.NEXT_PUBLIC_FOCUS_TIMER_AUTOLOG, true),
  mistakeAutofeed: readFlag(process.env.NEXT_PUBLIC_FOCUS_TIMER_MISTAKE_AUTOFEED, true),
} as const;
