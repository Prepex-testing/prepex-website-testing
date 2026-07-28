"use client";

import { useEffect, useState } from "react";

type AnimatedCircularProgressProps = {
  label?: string;
  size?: number;
  suffix?: string;
  targetPercent?: number;
  durationMs?: number;
  trackColor?: string;
  progressColor?: string;
};

// Self-contained sibling of CircularProgress — only for one-off screens that
// need the ring to fill itself from 0 on mount, not a controlled percent
// prop. Kept separate so CircularProgress (used across many pages) stays
// untouched.
export function AnimatedCircularProgress({
  label,
  size = 120,
  suffix = "%",
  targetPercent = 100,
  durationMs = 2000,
  trackColor = "var(--tint-strong)",
  progressColor = "var(--ink)",
}: AnimatedCircularProgressProps) {
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    let frameId: number;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1);
      setPercent(Math.round(progress * targetPercent));
      if (progress < 1) frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [targetPercent, durationMs]);

  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percent / 100);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        role="img"
        aria-label={`${percent}${suffix} ${label ?? "complete"}`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />

        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={progressColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-extrabold text-ink"
          style={{ fontSize: Math.round(size * 0.2) }}
        >
          {percent}
          {suffix}
        </span>
        {label && (
          <span
            className="font-bold uppercase tracking-wide text-muted"
            style={{ fontSize: Math.max(8, Math.round(size * 0.083)) }}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
