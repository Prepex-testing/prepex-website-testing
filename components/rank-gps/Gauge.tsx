"use client";

import { useEffect, useState } from "react";

const R = 90;
const ARC = (240 / 360) * 2 * Math.PI * R;
const PATH = "M32.06 155 A90 90 0 1 1 187.94 155";

/** A 240-degree arc gauge for a 0..100 score. The arc fills once on arrival (a CSS transition, so reduced motion stops it). */
export function Gauge({ value, label = "of 100" }: { value: number; label?: string }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(Math.max(0, Math.min(100, value))));
    return () => cancelAnimationFrame(id);
  }, [value]);
  return (
    <div className="relative mx-auto w-full max-w-[260px]" data-testid="rank-gps-gauge">
      <svg viewBox="0 0 220 190" className="block w-full" role="img" aria-label={`Readiness score ${Math.round(value)} out of 100`}>
        <path d={PATH} fill="none" strokeWidth={16} strokeLinecap="round" className="stroke-tint-strong" />
        <path
          d={PATH}
          fill="none"
          strokeWidth={16}
          strokeLinecap="round"
          className="stroke-brand"
          strokeDasharray={ARC}
          strokeDashoffset={ARC * (1 - shown / 100)}
          style={{ transition: "stroke-dashoffset var(--dur-emphasis) var(--ease-out)" }}
        />
      </svg>
      <div className="pointer-events-none absolute inset-x-0 top-[34%] flex flex-col items-center">
        <span className="text-[56px] font-extrabold leading-none text-ink" data-testid="rank-gps-score">{Math.round(value)}</span>
        <span className="mt-1 text-[13px] text-muted">{label}</span>
      </div>
    </div>
  );
}
