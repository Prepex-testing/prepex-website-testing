import type { ReactNode } from "react";

type Props = {
  /** 0..1 */
  progress: number;
  /** The big text in the middle (the clock). */
  label: string;
  caption?: ReactNode;
  paused?: boolean;
  overtime?: boolean;
  /** Screen-reader description of the whole timer. */
  ariaLabel: string;
};

const SIZE = 280;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** A big circular timer: the ring fills as the plan is focused; the clock sits in the middle. */
export function FocusRing({ progress, label, caption, paused = false, overtime = false, ariaLabel }: Props) {
  const clamped = Math.min(1, Math.max(0, progress));
  const color = overtime ? "var(--success)" : paused ? "var(--warning)" : "var(--cta, #FF7A59)";

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[280px]" role="timer" aria-label={ariaLabel} aria-live="off" data-testid="focus-ring">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full -rotate-90" aria-hidden>
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" strokeWidth={STROKE} className="stroke-tint-strong" />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="round"
          stroke={color}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - clamped)}
          style={{ transition: "stroke-dashoffset 0.4s linear, stroke 0.3s" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center">
        <span className="text-[48px] font-extrabold leading-none tabular-nums text-ink" data-testid="focus-clock">
          {label}
        </span>
        {caption ? <span className="px-6 text-[13px] font-semibold text-muted">{caption}</span> : null}
      </div>
    </div>
  );
}
