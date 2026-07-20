type MeterRowProps = {
  label: string;
  value: string;
  percent: number;
  barClassName?: string;
  trackClassName?: string;
  trackHeightClassName?: string;
  caption?: string;
};

export function MeterRow({
  label,
  value,
  percent,
  barClassName = "bg-brand",
  trackClassName = "bg-tint",
  trackHeightClassName = "h-2",
  caption,
}: MeterRowProps) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-semibold text-body-text">{label}</span>
        <span className="shrink-0 font-bold text-ink">{value}</span>
      </div>
      <div
        className={`mt-1.5 w-full overflow-hidden rounded-full ${trackHeightClassName} ${trackClassName}`}
      >
        <div
          className={`h-full rounded-full ${barClassName}`}
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
      {caption && <p className="mt-1 text-[10px] text-muted">{caption}</p>}
    </div>
  );
}
