"use client";

import { useEffect, useState } from "react";

const DURATION_MS = 600;

/** True when the student asked for less motion. Where matchMedia does not exist (tests, old browsers) the answer is yes. */
function prefersReducedMotion(): boolean {
  return typeof window === "undefined" || typeof window.matchMedia !== "function" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * A big number that counts up from 0 once when it first appears (about 0.6 s). With reduced motion, or for a value
 * that is not a plain number, it shows the final value straight away.
 */
export function CountUp({ value, format = (n) => String(n), className, testId }: { value: number; format?: (n: number) => string; className?: string; testId?: string }) {
  const [shown, setShown] = useState(value);

  useEffect(() => {
    if (!Number.isFinite(value) || prefersReducedMotion()) {
      setShown(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION_MS);
      // ease-out so it settles instead of stopping
      setShown(value * (1 - (1 - t) ** 3));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  const integer = Number.isInteger(value);
  return (
    <span className={className} data-testid={testId}>
      {format(integer ? Math.round(shown) : Math.round(shown * 10) / 10)}
    </span>
  );
}
