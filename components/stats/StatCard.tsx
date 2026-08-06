import type { ReactNode } from "react";

type StatCardProps = {
  icon?: ReactNode;      // NEW — leading icon chip (e.g. calendar icon for "Weekly Performance")
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  children?: ReactNode;
  className?: string;
  /** Figma spec uses asymmetric padding on the chart card (12/24/12/24)
   *  vs. symmetric 24px on the performance card. Let callers override. */
  padding?: string;
  /** Gap between the header row and the body content. Defaults to 20px. */
  bodyClassName?: string;
  subtitleClassName?: string;
};

export function StatCard({
  icon,
  title,
  subtitle,
  right,
  children,
  className = "",
  padding = "p-6",
  bodyClassName = "mt-5",
  subtitleClassName = "text-muted",
}: StatCardProps) {
  return (
    <div
      className={`rounded-2xl border border-brand/10 bg-surface ${padding} shadow-[0px_1px_2px_0px_#00000008,0px_1px_3px_0px_#0000000D] ${className}`}
    >
      {(title || right || icon) && (
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {icon && (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-icon-chip-bg">
                {icon}
              </div>
            )}
            <div>
              {title && (
                <p className="text-sm font-bold text-ink">{title}</p>
              )}
              {subtitle && (
                <p className={`mt-1 text-xs font-bold tracking-[0.5px] ${subtitleClassName}`}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {right}
        </div>
      )}

      {children && (
        <div className={title || right || icon ? bodyClassName : ""}>
          {children}
        </div>
      )}
    </div>
  );
}