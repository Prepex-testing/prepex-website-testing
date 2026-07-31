"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { ChevronDownIcon } from "@/components/ui/icons";

type AccordionProps = {
  avatarLabel: string;
  title: string;
  meta: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

export function Accordion({
  avatarLabel,
  title,
  meta,
  defaultOpen = false,
  children,
}: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-brand/10 dark:border-white/10 ${open ? "bg-accordion-open-bg" : "bg-accordion-row-bg"
        }`}
    >
      {/* Row — 678x96, radius 16, padding 24, space-between */}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex h-24 w-full items-center justify-between p-6 text-left"
      >
        {/* Inner container — height 48, gap 20 */}
        <span className="flex h-12 items-center gap-5">
          {/* Avatar box — 48x48, radius small, border 1px */}
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-brand/10 text-[22.5px] font-bold leading-[30px] dark:border-white/10 ${open
              ? "bg-surface text-ink"
              : "bg-tint-strong text-ink dark:bg-white dark:text-[#1A1A4E]"
              }`}
          >
            {avatarLabel}
          </span>
          {/* Text container — gap 2px */}
          <span className="flex flex-col gap-0.5">
            {/* Title — Jakarta 600, 20px, lh 28, ls -0.5 */}
            <span className="text-[20px] font-semibold leading-[28px] tracking-[-0.5px] text-[#171658] dark:text-ink">
              {title.toUpperCase()}
            </span>
            {/* Meta — Jakarta 400, 12px, lh 100%, uppercase */}
            <span
              className={`text-[10px] font-normal uppercase leading-none tracking-wide sm:text-[11px] md:text-[12px] lg:text-[13px] ${open
                ? "text-[#464650B2] dark:text-muted"
                : "text-[#464650B2] dark:text-ink"
                }`}
            >
              {meta}
            </span>
          </span>
        </span>
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${open
            ? "bg-surface dark:bg-transparent"
            : "bg-tint-strong dark:bg-white"
            }`}
        >
          <ChevronDownIcon
            className={`h-4 w-4 stroke-[2.4] transition-transform ${open
              ? "rotate-180 text-ink"
              : "text-ink dark:text-brand"
              }`}
          />
        </span>
      </button>

      {open && (
        <div className="border-t border-brand/10 bg-surface p-4 dark:border-white/10 dark:bg-[#FAF7F214] sm:p-6">
          {children}
        </div>
      )}
    </div>
  );
}