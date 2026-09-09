"use client";

import { useId, useState } from "react";

export type LineChartSeries = {
  id: string;
  label: string;
  /** null = no value for that x position; the line breaks rather than dipping to 0. */
  points: (number | null)[];
};

type LineChartProps = {
  /** One label per x position — shared by every series. */
  labels: string[];
  series: LineChartSeries[];
  /** Y axis ceiling. Defaults to 100 for percentage series. */
  max?: number;
  height?: number;
  /** Formats the value in the hover readout. */
  formatValue?: (value: number) => string;
  /** Index to mark as "the mock being viewed". */
  highlightIndex?: number;
};

// Every series is drawn in the theme's ink — identity comes from the stroke
// pattern rather than hue, which keeps the chart on-theme and happens to be
// stronger than colour for colour-blind and printed readers. Four patterns is
// the practical ceiling; past that, series need faceting, not a fifth dash.
const DASH_PATTERNS = ["", "7 4", "2 4", "10 4 2 4"];

// right/left leave room for the outermost x label's half-width and the y axis
// numbers respectively — a centred "12 Aug" at the last point would otherwise
// clip against the viewBox edge.
const PAD = { top: 14, right: 26, bottom: 30, left: 32 };
const GRID_LINES = 4;

// Narrow coordinate space so in-SVG text stays legible once the chart is
// scaled down into a half-width card or a phone-width column.
const VIEW_WIDTH = 480;

/**
 * Small hand-rolled SVG line chart — the project has no charting dependency,
 * and the other visualisations here (CircularProgress, PercentileGauge) are
 * plain SVG too. Every colour is a theme CSS variable, so it follows the
 * light/dark toggle without a palette of its own.
 */
export function LineChart({
  labels,
  series,
  max = 100,
  height = 220,
  formatValue = (v) => `${Math.round(v)}%`,
  highlightIndex,
}: LineChartProps) {
  const clipId = useId();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const plotWidth = VIEW_WIDTH - PAD.left - PAD.right;
  const plotHeight = height - PAD.top - PAD.bottom;

  // A single point would divide by zero; centre it instead.
  const xAt = (i: number) =>
    labels.length === 1 ? PAD.left + plotWidth / 2 : PAD.left + (i / (labels.length - 1)) * plotWidth;
  const yAt = (value: number) => PAD.top + plotHeight * (1 - Math.min(value, max) / max);

  const activeIndex = hoverIndex ?? highlightIndex ?? null;
  const dashOf = (index: number) => DASH_PATTERNS[index % DASH_PATTERNS.length]!;

  return (
    <div className="w-full">
      {/* With one ink for every series, identity can't rest on colour — the
          legend swatch shows the actual stroke each line is drawn with. */}
      {series.length > 1 && (
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {series.map((s, index) => (
            <span key={s.id} className="flex items-center gap-1.5 text-[12px] font-medium text-muted">
              <svg width={22} height={8} aria-hidden="true">
                <line
                  x1={1}
                  y1={4}
                  x2={21}
                  y2={4}
                  stroke="var(--ink)"
                  strokeWidth={2}
                  strokeDasharray={dashOf(index) || undefined}
                  strokeLinecap="round"
                />
              </svg>
              {s.label}
            </span>
          ))}
        </div>
      )}

      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={`${series.map((s) => s.label).join(", ")} across ${labels.length} mocks`}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={PAD.left} y={PAD.top} width={plotWidth} height={plotHeight} />
          </clipPath>
        </defs>

        {/* Horizontal grid + y labels */}
        {Array.from({ length: GRID_LINES + 1 }, (_, i) => {
          const value = (max / GRID_LINES) * i;
          const y = yAt(value);
          return (
            <g key={i}>
              <line
                x1={PAD.left}
                x2={VIEW_WIDTH - PAD.right}
                y1={y}
                y2={y}
                stroke="var(--tint-strong)"
                strokeWidth={1}
              />
              <text x={PAD.left - 6} y={y + 4} textAnchor="end" fill="var(--muted)" fontSize={11}>
                {Math.round(value)}
              </text>
            </g>
          );
        })}

        {/* Vertical guide on the hovered / current mock */}
        {activeIndex !== null && labels[activeIndex] !== undefined && (
          <line
            x1={xAt(activeIndex)}
            x2={xAt(activeIndex)}
            y1={PAD.top}
            y2={PAD.top + plotHeight}
            stroke="var(--muted)"
            strokeWidth={1}
            strokeDasharray="4 4"
            opacity={0.6}
          />
        )}

        {series.map((s, index) => {
          // Break the path wherever a mock has no value for this series, so a
          // missing subject entry reads as a gap rather than a crash to zero.
          const segments: string[] = [];
          let open = false;
          s.points.forEach((value, i) => {
            if (value === null) {
              open = false;
              return;
            }
            segments.push(`${open ? "L" : "M"}${xAt(i)} ${yAt(value)}`);
            open = true;
          });

          return (
            <g key={s.id} clipPath={`url(#${clipId})`}>
              <path
                d={segments.join(" ")}
                fill="none"
                stroke="var(--ink)"
                strokeWidth={2}
                strokeDasharray={dashOf(index) || undefined}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {s.points.map((value, i) =>
                value === null ? null : (
                  <circle
                    key={i}
                    cx={xAt(i)}
                    cy={yAt(value)}
                    r={activeIndex === i ? 5 : 3.5}
                    fill="var(--surface)"
                    stroke="var(--ink)"
                    strokeWidth={2}
                  />
                ),
              )}
            </g>
          );
        })}

        {/* X labels — thinned so they never collide, even in a half-width card */}
        {labels.map((label, i) => {
          const step = Math.ceil(labels.length / 5);
          if (i % step !== 0 && i !== labels.length - 1) return null;
          return (
            <text
              key={i}
              x={xAt(i)}
              y={height - 10}
              textAnchor="middle"
              fill={activeIndex === i ? "var(--ink)" : "var(--muted)"}
              fontSize={11}
              fontWeight={activeIndex === i ? 700 : 400}
            >
              {label}
            </text>
          );
        })}

        {/* Invisible hit areas — one column per x position */}
        {labels.map((_, i) => (
          <rect
            key={i}
            x={xAt(i) - plotWidth / Math.max(1, labels.length) / 2}
            y={PAD.top}
            width={plotWidth / Math.max(1, labels.length)}
            height={plotHeight}
            fill="transparent"
            onMouseEnter={() => setHoverIndex(i)}
            onMouseLeave={() => setHoverIndex(null)}
          />
        ))}
      </svg>

      {/* Readout for the active point — plain markup beats an SVG tooltip here,
          and it stays readable on touch where there's no hover. */}
      {activeIndex !== null && labels[activeIndex] !== undefined && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-tint-strong px-4 py-2">
          <span className="text-[12px] font-bold text-ink">{labels[activeIndex]}</span>
          {series.map((s) => {
            const value = s.points[activeIndex];
            return (
              <span key={s.id} className="text-[12px] text-muted">
                {s.label}:{" "}
                <span className="font-semibold text-ink">
                  {value == null ? "—" : formatValue(value)}
                </span>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
