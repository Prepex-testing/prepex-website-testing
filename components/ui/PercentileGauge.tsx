type PercentileGaugeProps = {
  value: number;
  max?: number;
  size?: number;
  showLabel?: boolean;
  progressColor?: string;
};

export function PercentileGauge({
  value,
  max = 100,
  size = 140,
  showLabel = true,
  progressColor = "var(--brand)",
}: PercentileGaugeProps) {
  const stroke = 12;

  const radius = (size - stroke) / 2;

  const center = size / 2;

  const circumference = Math.PI * radius;

  const progress = Math.max(0, Math.min(1, value / max));

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size / 2 + 34 }}>
        <svg
          width={size}
          height={size / 2 + 10}
          viewBox={`0 0 ${size} ${size / 2 + 10}`}
        >
          {/* Track */}
          <path
            d={`
              M ${stroke / 2} ${center}
              A ${radius} ${radius} 0 0 1 ${size - stroke / 2} ${center}
            `}
            fill="none"
            stroke="var(--tint-strong)"
            strokeWidth={stroke}
            strokeLinecap="round"
          />

          {/* Progress */}
          <path
            d={`
              M ${stroke / 2} ${center}
              A ${radius} ${radius} 0 0 1 ${size - stroke / 2} ${center}
            `}
            fill="none"
            stroke={progressColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
          />
        </svg>

        {/* Top */}
        <span className="absolute left-1/2 top-0 -translate-x-1/2 text-[10px] font-semibold text-muted">
          50
        </span>

        {/* Left */}
        <span className="absolute bottom-[36px] left-0 text-[10px] font-semibold text-muted">
          0
        </span>

        {/* Right */}
        <span className="absolute bottom-[36px] right-0 text-[10px] font-semibold text-muted">
          100
        </span>

        {/* Center */}
        <div className="absolute left-1/2 top-[80px] -translate-x-1/2 text-center">
          <div className="text-[60px] font-bold leading-[60px] tracking-[-0.5px] text-ink">
            {value}
          </div>

          {showLabel && (
            <div className="mt-1 text-[16px] font-semibold text-muted">
              PERCENTILE
            </div>
          )}
        </div>
      </div>
    </div>
  );
}