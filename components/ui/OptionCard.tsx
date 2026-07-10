import type { ReactNode } from "react";
import { CheckIcon } from "@/components/ui/icons";

type OptionCardProps = {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  selected?: boolean;
  compact?: boolean;
  onClick?: () => void;
  className?: string;
};

export function OptionCard({
  icon,
  title,
  subtitle,
  selected = false,
  compact = false,
  onClick,
  className = "",
}: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
        compact ? "" : "justify-between"
      } ${
        selected
          ? `border-brand ${compact ? "bg-surface" : "bg-tint-strong"}`
          : "border-brand/15 bg-surface"
      } ${className}`}
    >
      <span className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-tint text-ink">
          {icon}
        </span>
        <span>
          <span className="block text-sm font-semibold text-ink">
            {title}
          </span>
          {subtitle && (
            <span className="block text-xs text-muted">
              {subtitle}
            </span>
          )}
        </span>
      </span>

      {!compact && (
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
            selected
              ? "bg-brand text-white"
              : "border border-brand/15 bg-surface"
          }`}
        >
          {selected && <CheckIcon />}
        </span>
      )}
    </button>
  );
}
