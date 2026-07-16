import { useId } from "react";

type CircularProgressProps = {
  percent: number;
  label?: string;
  size?: number;
  suffix?: string;
  displayValue?: string | number;
  trackColor?: string;
  progressColor?: string;
  /** Vertical (top-to-bottom) gradient stops; overrides progressColor when set. */
  progressGradient?: { from: string; to: string };
};

export function CircularProgress({
  percent,
  label,
  size = 120,
  suffix = "%",
  displayValue,
  trackColor = "var(--tint-strong)",
  progressColor = "var(--ink)",
  progressGradient,
}: CircularProgressProps) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percent / 100);
  const gradientId = useId();

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
        {progressGradient && (
          <defs>
            <linearGradient
              id={gradientId}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
              gradientTransform="rotate(90 0.5 0.5)"
            >
              <stop offset="0%" stopColor={progressGradient.from} />
              <stop offset="100%" stopColor={progressGradient.to} />
            </linearGradient>
          </defs>
        )}

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
          stroke={progressGradient ? `url(#${gradientId})` : progressColor}
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
          {displayValue ?? percent}
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
