import type { ReactNode } from "react";

type StatCardProps = {
  title?: string;
 subtitle?: string;
  right?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function StatCard({
  title,
  subtitle,
  right,
  children,
  className = "",
}: StatCardProps) {
  return (
    <div
      className={`rounded-2xl border border-brand/10 bg-surface p-6 shadow-[0px_1px_2px_0px_rgba(26,26,78,0.06)] ${className}`}
    >
      {(title || right) && (
        <div className="flex items-start justify-between gap-3">
          <div>
            {title && (
              <p className="text-sm font-semibold text-ink">
                {title}
              </p>
            )}

            {subtitle && (
              <p className="mt-1 text-xs text-muted">
                {subtitle}
              </p>
            )}
          </div>

          {right}
        </div>
      )}

      {children && (
        <div className={title || right ? "mt-5" : ""}>
          {children}
        </div>
      )}
    </div>
  );
}