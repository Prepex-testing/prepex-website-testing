import type { ReactNode } from "react";

type StatCardProps = {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function StatCard({ title, subtitle, right, children, className = "" }: StatCardProps) {
  return (
    <div className={`rounded-2xl border border-brand/10 bg-surface p-5 ${className}`}>
      {(title || right) && (
        <div className="flex items-start justify-between gap-3">
          <div>
            {title && <p className="text-sm font-bold text-ink">{title}</p>}
            {subtitle && (
              <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted">
                {subtitle}
              </p>
            )}
          </div>
          {right}
        </div>
      )}
      {children && <div className={title || right ? "mt-4" : ""}>{children}</div>}
    </div>
  );
}
