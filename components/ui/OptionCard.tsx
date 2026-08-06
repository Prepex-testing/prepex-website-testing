import type { ReactNode } from "react";
import { CheckIcon } from "@/components/ui/icons";

type OptionCardProps = {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  selected?: boolean;
  compact?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
};

export function OptionCard({
  icon,
  title,
  subtitle,
  selected = false,
  compact = false,
  disabled = false,
  onClick,
  className = "",
}: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-5 rounded-2xl border p-5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${compact ? "" : "justify-between"
        } ${selected
          ? `
        border-[1.5px]
        border-ink
        ${compact ? "bg-surface" : "dark:bg-surface"}
      `
          : `
        border border-brand/15
        bg-surface
        dark:border-white/15
      `
        } ${className}`}
    >
      <span className="flex items-center gap-5">
        {/* Icon box — 48x48, radius 12px */}
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${selected
              ? "bg-brand text-white dark:bg-[#FAF7F2] dark:text-[#0D0D2B]"
              : "bg-icon-chip-bg text-ink dark:bg-[#FAF7F2]/8 dark:text-ink"
            }`}
        >
          {icon}
        </span>
        <span>
          <span className="block text-[16px] font-semibold leading-[100%] text-body-text dark:text-ink sm:text-[18px]">
            {title}
          </span>
          {subtitle && (
            <span
              className={`mt-1 block text-xs ${selected ? "text-body-text dark:text-ink" : "text-muted"
                }`}
            >
              {subtitle}
            </span>
          )}
        </span>
      </span>

      {!compact && (
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${selected
            ? "bg-ink text-white dark:text-[#1A1A4E]"
            : "border border-brand/15 bg-surface dark:border-white/15"
            }`}
        >
          {selected && <CheckIcon className="h-5 w-5 sm:h-5 sm:w-5 md:h-6 md:w-6" />}
        </span>
      )}
    </button>
  );
}