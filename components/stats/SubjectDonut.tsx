export type DonutSegment = {
  label: string;
  value: number;
  color: string;
};

type SubjectDonutProps = {
  segments: DonutSegment[];
  size?: number;
};

const GAP = 3;

export function SubjectDonut({ segments, size = 140 }: SubjectDonutProps) {
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const { items: arcs } = segments.reduce<{
    items: Array<DonutSegment & { dash: number; offset: number }>;
    cumulative: number;
  }>(
    (acc, segment) => {
      const segmentLength = (segment.value / 100) * circumference;
      const dash = Math.max(segmentLength - GAP, 0);
      return {
        items: [...acc.items, { ...segment, dash, offset: acc.cumulative }],
        cumulative: acc.cumulative + segmentLength,
      };
    },
    { items: [], cumulative: 0 },
  );

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="-rotate-90"
      role="img"
      aria-label="Subject focus split"
    >
      {arcs.map((segment) => (
        <circle
          key={segment.label}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={segment.color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${segment.dash} ${circumference - segment.dash}`}
          strokeDashoffset={-segment.offset}
        />
      ))}
    </svg>
  );
}
