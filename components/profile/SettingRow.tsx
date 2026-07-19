import type { ReactNode } from "react";

type SettingRowProps = {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  iconClassName?: string;
};

export function SettingRow({
  icon,
  title,
  subtitle,
  right,
  iconClassName = "bg-tint text-ink",
}: SettingRowProps) {
  return (
    <div className="flex min-h-[104px] items-center justify-between rounded-xl border border-brand/10 bg-surface px-6 py-6 shadow-sm">

      {/* Left */}
      <div className="flex min-w-0 items-center gap-4">

        {icon && (
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconClassName}`}
          >
            {icon}
          </div>
        )}

        <div className="min-w-0">
          <h3 className="text-[16px] font-bold leading-6 text-ink">
            {title}
          </h3>

          {subtitle && (
            <p className="mt-1 text-[14px] leading-5 text-muted">
              {subtitle}
            </p>
          )}
        </div>

      </div>

      {/* Right */}
      {right && (
        <div className="ml-6 shrink-0">
          {right}
        </div>
      )}
    </div>
  );
}