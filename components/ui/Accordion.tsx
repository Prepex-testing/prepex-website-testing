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
    <div className="overflow-hidden rounded-xl border border-brand/10 bg-tint-strong/40">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-brand bg-white text-sm font-bold text-brand">
            {avatarLabel}
          </span>
          <span>
            <span className="block text-sm font-bold uppercase tracking-wide text-ink">
              {title}
            </span>
            <span className="block text-[11px] font-medium uppercase tracking-wide text-muted">
              {meta}
            </span>
          </span>
        </span>
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""
            }`}
        />
      </button>

      {open && <div className="border-t border-brand/10 bg-surface p-4">{children}</div>}
    </div>
  );
}
