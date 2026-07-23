import type { ReactNode } from "react";

type ChipProps = {
  children: ReactNode;
  className?: string;
};

export function Chip({ children, className = "" }: ChipProps) {
  return (
    <span
      className={`inline-flex h-[34px] items-center justify-center rounded-full border border-brand/15 bg-surface px-4 py-[6px] font-['Plus_Jakarta_Sans'] text-[14px] font-medium leading-5 text-muted ${className}`}
    >
      {children}
    </span>
  );
}

export function Chips({ children, selected, onClick }:any) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-2 ${
        selected
          ? "bg-blue-600 text-white"
          : "bg-gray-200 text-black"
      }`}
    >
      {children}
    </button>
  );
}