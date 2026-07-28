type OptionCardSkeletonProps = {
  compact?: boolean;
  className?: string;
};

export function OptionCardSkeleton({
  compact = false,
  className = "",
}: OptionCardSkeletonProps) {
  return (
    <div
      className={`flex animate-pulse items-center gap-5 rounded-2xl border border-brand/15 bg-surface p-5 dark:border-white/15 ${
        compact ? "" : "justify-between"
      } ${className}`}
    >
      <span className="flex items-center gap-5">
        <span className="h-12 w-12 shrink-0 rounded-xl bg-icon-chip-bg dark:bg-[#FAF7F2]/8" />
        <span className="flex flex-col gap-2">
          <span className="h-4 w-28 rounded-full bg-icon-chip-bg dark:bg-[#FAF7F2]/8" />
          {!compact && (
            <span className="h-3 w-20 rounded-full bg-icon-chip-bg dark:bg-[#FAF7F2]/8" />
          )}
        </span>
      </span>

      {!compact && (
        <span className="h-6 w-6 shrink-0 rounded-full border border-brand/15 bg-surface dark:border-white/15" />
      )}
    </div>
  );
}
