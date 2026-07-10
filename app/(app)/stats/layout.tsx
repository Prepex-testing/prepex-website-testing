"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BellIcon } from "@/components/ui/icons";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";

const TABS = [
  { href: "/stats/effort", label: "Effort" },
  { href: "/stats/accuracy", label: "Accuracy" },
  { href: "/stats/progress", label: "Progress" },
];

export default function StatsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeTab = TABS.find((tab) => pathname?.startsWith(tab.href)) ?? TABS[0];

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h1 text-ink">{activeTab.label}</h1>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <button
            type="button"
            aria-label="Notifications"
            className="flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-tint-strong"
          >
            <BellIcon />
          </button>
          <UserMenu />
        </div>
      </div>

      <div className="inline-flex w-fit items-center gap-1 rounded-full bg-tint-strong p-1">
        {TABS.map((tab) => {
          const active = tab.href === activeTab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                active ? "bg-brand text-white" : "text-ink/70 hover:text-ink"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
