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
  /** Replaces the title's size classes (weight and colour stay). Defaults to 14px. */
  titleClassName?: string;
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
  titleClassName = "text-sm",
}: StatCardProps) {
  return (
    // A flex column so the body can grow into any height the card is given
    // (e.g. `h-full` in a stretched grid row) — that's what lets an empty
    // state sit in the middle of the card rather than at the top.
    <div
      className={`flex flex-col rounded-2xl border border-brand/10 bg-surface ${padding} shadow-[0px_1px_2px_0px_#00000008,0px_1px_3px_0px_#0000000D] ${className}`}
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
                <p className={`font-bold text-ink ${titleClassName}`}>{title}</p>
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

      {/* Inherit `justify-content`: now that the body fills the card, a
          caller's `justify-center` on the card would otherwise stop reaching
          the content — inheriting passes it through to where it applies.
          (An arbitrary property, because `justify-*` has no `inherit` value.) */}
      {children && (
        <div className={`flex flex-1 flex-col [justify-content:inherit] ${title || right || icon ? bodyClassName : ""}`}>
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * A StatCard's "nothing to show yet" message, centred both ways in whatever
 * space the card body has, so an empty card doesn't leave its text stranded
 * at the top. The copy is capped at a readable line length.
 */
export function EmptyNote({ children }: { children: ReactNode }) {
  return (
    <p className="flex flex-1 items-center justify-center px-2 py-6 text-center text-xs font-medium leading-5 text-muted">
      <span className="max-w-xs">{children}</span>
    </p>
  );
}