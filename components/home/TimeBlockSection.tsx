"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { ChevronDownIcon } from "@/components/ui/icons";

type TimeBlockSectionProps = {
  icon: ReactNode;
  title: string;
  meta: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

export function TimeBlockSection({
  icon,
  title,
  meta,
  defaultOpen = true,
  children,
}: TimeBlockSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 text-left"
      >
        <span className="shrink-0 text-ink">{icon}</span>
        <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">{title}</span>
        <span className="shrink-0 text-xs text-muted">{meta}</span>
        <ChevronDownIcon
          className={`ml-auto h-4 w-4 text-muted transition-transform ${
            open ? "" : "-rotate-90"
          }`}
        />
      </button>

      {open && <div className="flex flex-col gap-3">{children}</div>}
    </div>
  );
}
