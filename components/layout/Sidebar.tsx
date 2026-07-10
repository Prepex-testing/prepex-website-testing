"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import {
  HomeIcon,
  CalendarIcon,
  TargetIcon,
  ChartBarIcon,
  UserIcon,
} from "@/components/ui/icons";

export const NAV_ITEMS = [
  { href: "/home", label: "Home", icon: <HomeIcon /> },
  { href: "/plan", label: "Plan", icon: <CalendarIcon /> },
  { href: "/practice/sessions", label: "Practice", icon: <TargetIcon /> },
  { href: "/stats", label: "Stats", icon: <ChartBarIcon /> },
  { href: "/profile", label: "Profile", icon: <UserIcon /> },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 flex-col gap-8 border-r border-brand/10 bg-surface px-4 py-6 lg:flex">
      <div className="px-2">
        <Logo size="compact" showTagline={false} />
      </div>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active =
            item.label === "Practice"
              ? pathname?.startsWith("/practice")
              : pathname === item.href || pathname?.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                active
                  ? "bg-tint-strong text-ink"
                  : "text-muted hover:bg-tint-strong/60"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
