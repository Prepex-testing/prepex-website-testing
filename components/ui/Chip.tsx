import type { ReactNode } from "react";

type ChipProps = {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
};

export function Chip({ children, selected = false, onClick }: ChipProps) {
  const classes = `inline-flex h-[34px] items-center justify-center rounded-[8px] border px-4 py-[6px] font-['Plus_Jakarta_Sans'] text-[14px] font-medium leading-5 transition-colors ${
    selected
      ? "border-brand bg-brand text-white"
      : "border-brand/15 bg-surface text-muted"
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