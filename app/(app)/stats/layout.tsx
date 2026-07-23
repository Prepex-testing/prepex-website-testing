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

export default function StatsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const activeTab =
    TABS.find((tab) => pathname?.startsWith(tab.href)) ?? TABS[0];

  return (
    <div className="flex flex-col gap-8 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-h1 text-ink">{activeTab.label}</h1>

        <div className="flex items-center gap-4">
          <ThemeToggle />

          <button
            type="button"
            aria-label="Notifications"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-muted transition hover:bg-tint"
          >
            <BellIcon />
          </button>

          <UserMenu />
        </div>
      </div>

      {/* Tabs */}
      <div className="inline-flex h-[41px] w-full max-w-[299px] items-center gap-1 rounded-[8px] bg-[#1A1A4E] p-1">
        {TABS.map((tab) => {
          const active = tab.href === activeTab.href;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`
                flex h-[33px] flex-1 items-center justify-center
                rounded-[6px]
                px-5
                text-[14px]
                leading-[21px]
                transition-all
                duration-300
                ease-out
                ${
                  active
                    ? "bg-[#FAF7F2] font-bold text-[#1A1A4E]"
                    : "font-medium text-[#FAF7F2] hover:bg-white/10"
                }
              `}
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