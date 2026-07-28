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
    // Box — 329x90, radius Large (16px), border 1.5px light / 1px dark, padding 20px
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-5 rounded-2xl border p-5 text-left transition-colors ${compact ? "" : "justify-between"
        } ${selected
          ? `border-ink dark:border-ink ${compact ? "bg-surface" : "bg-tint-strong"}`
          : "border-brand/15 bg-surface dark:border-white/15"
        } ${className}`}
    >
      <span className="flex items-center gap-5">
        {/* Icon box — 48x48, radius 12px */}
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-icon-chip-bg text-ink dark:bg-[#FAF7F2]/8">
          {icon}
        </span>
        <span>
          <span className="block text-[16px] font-semibold leading-[100%] text-body-text dark:text-ink sm:text-[18px]">
            {title}
          </span>
          {subtitle && (
            <span className="mt-1 block text-xs text-muted">{subtitle}</span>
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
          {selected && <CheckIcon />}
        </span>
      )}
    </button>
  );
}