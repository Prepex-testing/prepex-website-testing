"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, NAV_COACH_ANCHOR, isNavItemActive } from "@/components/layout/Sidebar";
import { SymbolMark } from "@/components/ui/LogoMarks";
import { ChevronRightIcon } from "@/components/ui/icons";

type FocusSidebarProps = {
  onExpand?: () => void;
};

export function FocusSidebar({ onExpand }: FocusSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="relative hidden w-24.25 flex-col items-center self-stretch border-r border-sidebar-border bg-surface px-6 py-8 lg:flex">
      {/* Collapsed rail carries the symbol alone — no room for the wordmark. */}
      <SymbolMark className="h-8 w-auto shrink-0 text-ink" />

      {onExpand && (
        <button
          type="button"
          onClick={onExpand}
          aria-label="Expand sidebar"
          className="absolute -right-3.5 top-8 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-sidebar-border bg-surface text-sidebar-inactive-fg shadow-sm hover:bg-sidebar-active-bg hover:text-sidebar-active-fg"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      )}

      <nav className="flex w-12 flex-col gap-2 py-6">
        {NAV_ITEMS.map((item) => {
          const active = isNavItemActive(item, pathname);

          return (
            <Link
              key={item.label}
              href={item.href}
              aria-label={item.label}
              // Same coach anchors as the expanded sidebar; with the rail up
              // it's this icon tile that gets spotlit, not the hidden row.
              data-coach={NAV_COACH_ANCHOR[item.label]}
              className={`flex w-12 items-center justify-center transition-colors duration-200 ${active
                  ? "h-12 rounded-xl bg-sidebar-active-bg text-sidebar-active-fg"
                  : "h-10 rounded-2xl px-4 py-3 text-sidebar-inactive-fg hover:bg-sidebar-active-bg hover:text-sidebar-active-fg"
                }`}
            >
              {item.icon}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}