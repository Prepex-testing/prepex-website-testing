"use client";
import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronDownIcon, BookmarkIcon } from "@/components/ui/icons";

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
    // width: fill (w-full, default block behavior) · height: hug (h-auto, default)
    // gap: 16px between header and task rows → gap-4
    //use this if not need bg color <div className="flex w-full flex-col gap-4">
    <div className="flex w-full flex-col gap-4 rounded-2xl border border-brand/10 bg-surface p-5">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 text-left"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tint text-ink">
          {icon}
        </span>
        <span className="text-[20px] font-bold leading-7 text-ink">{title}</span>
        <span className="text-[14px] font-medium leading-5 text-muted">{meta}</span>
        <ChevronDownIcon
          className={`ml-auto h-5 w-5 shrink-0 text-muted transition-transform ${
            open ? "" : "-rotate-90"
          }`}
        />
      </button>
      {open && <div className="flex flex-col gap-3">{children}</div>}
    </div>
  );
}