type CircularProgressProps = {
  percent: number;
  label?: string;
  size?: number;
  suffix?: string;
  displayValue?: string | number;
};

export function CircularProgress({
  percent,
  label,
  size = 120,
  suffix = "%",
  displayValue,
}: CircularProgressProps) {
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
          stroke="var(--tint)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--brand)"
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
