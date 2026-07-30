import type { ReactNode } from "react";

type OutlineChipProps = {
  children: ReactNode;
  className?: string;
};

export function OutlineChip({
  children,
  className = "",
}: OutlineChipProps) {
  return (
   <span
  className={`
    inline-flex
    h-[38px]
    min-w-[125px]
    items-center
    justify-center
    rounded-full
    border
    border-outline-chip-border
    bg-transparent
    px-4
    py-2
    whitespace-nowrap
    text-[14px]
    font-medium
    leading-5
    text-body-text
    transition-colors
    ${className}
  `}
>
  {children}
</span>
  );
}