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
        <span className="font-semibold text-[#8B8998]">{label}</span>
        <span className="flex shrink-0 items-baseline gap-1">
          <span className="text-[14px] font-extrabold leading-[20px] text-[#FAF7F2]">
            {value}
          </span>
          {caption && (
            <span className="text-[9px] font-bold uppercase tracking-[0.5px] text-[#8B8998]">
              {caption}
            </span>
          )}
        </span>
      </div>
      <div
        className={`mt-1.5 w-full overflow-hidden rounded-full ${trackHeightClassName} ${trackClassName}`}
      >
        <div
          className={`h-full rounded-full ${barClassName}`}
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
    </div>
  );
}


type DistributionRowProps = {
  label: string;
  value: string;
  percent: number;
  barClassName?: string;
  trackClassName?: string;
};

export function DistributionRow({
  label,
  value,
  percent,
  barClassName = "bg-[#FAF7F2]",
  trackClassName = "bg-[#FAF7F240]",
}: DistributionRowProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 shrink-0 text-[11px] font-bold leading-[16.5px] text-[#8B8998]">
        {label}
      </span>
      <div className={`h-3 flex-1 overflow-hidden rounded-full ${trackClassName}`}>
        <div
          className={`h-full rounded-full ${barClassName}`}
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
      <span className="w-12 shrink-0 text-right text-[11px] font-extrabold leading-[16.5px] text-[#FAF7F2]">
        {value}
      </span>
    </div>
  );
}