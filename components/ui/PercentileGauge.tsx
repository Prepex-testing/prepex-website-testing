type PercentileGaugeProps = {
  value: number;
  max?: number;
  label?: string;
  size?: number;
};

export function PercentileGauge({
  value,
  max = 100,
  label = "Percentile",
  size = 120,
}: PercentileGaugeProps) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const arcLength = Math.PI * radius;
  const percent = Math.max(0, Math.min(1, value / max));
  const trackPath = `M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`;
  const topLabelSpace = 16;
  const gaugeHeight = size / 2 + strokeWidth / 2;

  return (
    <div className="flex flex-col items-center" style={{ width: size }}>
      <div className="relative" style={{ width: size, height: gaugeHeight + topLabelSpace }}>
        <span className="absolute left-1/2 top-0 -translate-x-1/2 text-[10px] font-semibold text-muted">
          {Math.round(max / 2)}
        </span>
        <svg
          width={size}
          height={gaugeHeight}
          viewBox={`0 0 ${size} ${gaugeHeight}`}
          role="img"
          aria-label={`${value} out of ${max} ${label}`}
          className="absolute left-0"
          style={{ top: topLabelSpace }}
        >
          <path
            d={trackPath}
            fill="none"
            stroke="var(--tint-strong)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          <path
            d={trackPath}
            fill="none"
            stroke="var(--brand)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={arcLength}
            strokeDashoffset={arcLength * (1 - percent)}
          />
        </svg>
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
          <span className="text-2xl font-extrabold text-ink">{value}</span>
        </div>
        <span className="absolute bottom-0 left-0 text-[10px] font-semibold text-muted">0</span>
        <span className="absolute bottom-0 right-0 text-[10px] font-semibold text-muted">
          {max}
        </span>
      </div>
      <span className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </span>
    </div>
  );
}
