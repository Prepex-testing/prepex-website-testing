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
  iconClassName = "bg-tint-strong text-ink",
}: SettingRowProps) {
  return (
    <div className="flex items-center gap-3 py-3">
      {icon && (
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClassName}`}
        >
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">{title}</p>
        {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
