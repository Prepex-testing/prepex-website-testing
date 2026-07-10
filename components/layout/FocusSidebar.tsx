"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/components/layout/Sidebar";

export function FocusSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-16 shrink-0 flex-col items-center gap-6 border-r border-brand/10 bg-surface py-6 lg:flex">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
        R
      </span>

      <nav className="flex flex-col gap-2">
        {NAV_ITEMS.map((item) => {
          const active =
            item.label === "Practice"
              ? pathname?.startsWith("/practice")
              : pathname === item.href || pathname?.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                active
                  ? "bg-tint-strong text-ink"
                  : "text-muted hover:bg-tint-strong/60"
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
