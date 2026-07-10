import type { ReactNode } from "react";

type ChipProps = {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
};

export function Chip({ children, selected = false, onClick }: ChipProps) {
  const classes = `rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
    selected
      ? "border-brand bg-brand text-white"
      : "border-brand/15 bg-surface text-body-text"
  }`;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-pressed={selected} className={classes}>
        {children}
      </button>
    );
  }

  return <span className={classes}>{children}</span>;
}
