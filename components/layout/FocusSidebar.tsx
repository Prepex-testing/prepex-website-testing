"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/components/layout/Sidebar";
import { useStoredFullName } from "@/lib/auth/useStoredFullName";

export function FocusSidebar() {
  const pathname = usePathname();
  const storedFullName = useStoredFullName();
  const displayInitial = storedFullName.trim()[0]?.toUpperCase() ?? "S";

  return (
    <aside className="hidden w-24.25 flex-col items-center self-stretch border-r border-sidebar-border bg-surface px-6 py-8 lg:flex">
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
        {displayInitial}
      </div>

      <nav className="flex w-12 flex-col gap-2 py-6">
        {NAV_ITEMS.map((item) => {
          const active =
            item.label === "Practice"
              ? pathname?.startsWith("/practice")
              : pathname === item.href ||
                pathname?.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              className={`flex w-12 items-center justify-center transition-colors duration-200 ${
                active
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