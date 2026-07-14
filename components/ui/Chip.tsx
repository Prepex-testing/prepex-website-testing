import type { ReactNode } from "react";

type ChipProps = {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
};

export function Chip({ children, selected = false, onClick }: ChipProps) {
  const classes = `inline-flex h-[34px] items-center justify-center rounded-[8px] border px-4 py-[6px] font-['Plus_Jakarta_Sans'] text-[14px] font-medium leading-5 transition-colors ${
    selected
      ? "border-[#1A1A4E] bg-[#1A1A4E] text-white"
      : "border-[#E5E7EB] bg-white text-[#6B7280]"
  }`;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={selected}
        className={classes}
      >
        {children}
      </button>
    );
  }

  return <span className={classes}>{children}</span>;
}