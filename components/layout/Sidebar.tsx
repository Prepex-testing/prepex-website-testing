"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import {
  HomeIcon,
  CalendarIcon,
  TargetIcon,
  ChartBarIcon,
  ChevronRightIcon,
  // UserIcon,
} from "@/components/ui/icons";
import {UserIcons,PracticeIcon,StatsIcon} from "@/assets/icons";

// Figma: 20x20 icon slot containing a 16x16 glyph (1.78px stroke).
const ICON_BOX_CLASS = "flex h-5 w-5 shrink-0 items-center justify-center";
const ICON_CLASS = "h-4 w-4";

export const NAV_ITEMS = [
  {
    href: "/home",
    label: "Home",
    icon: (
      <span className={ICON_BOX_CLASS}>
        <HomeIcon className={ICON_CLASS} />
      </span>
    ),
  },
  {
    // TEMPORARY (current sprint): original destination, restore by
    // uncommenting the line below and removing the override under it.
    // href: "/plan",
    href: "/development-in-progress",
    // TEMPORARY: keeps this item from highlighting as "active" while on the
    // shared /development-in-progress placeholder — remove once href above
    // is restored.
    activeMatch: "/plan",
    label: "Plan",
    icon: (
      <span className={ICON_BOX_CLASS}>
        <CalendarIcon className={ICON_CLASS} />
      </span>
    ),
  },
  {
    // TEMPORARY (current sprint): original destination, restore by
    // uncommenting the line below and removing the override under it.
    // href: "/practice/sessions",
    href: "/development-in-progress",
    activeMatch: "/practice",
    label: "Practice",
    icon: (
      <span className={ICON_BOX_CLASS}>
        <PracticeIcon className={ICON_CLASS} />
      </span>
    ),
  },
  {
    // TEMPORARY (current sprint): original destination, restore by
    // uncommenting the line below and removing the override under it.
    // href: "/stats",
    href: "/development-in-progress",
    activeMatch: "/stats",
    label: "Stats",
    icon: (
      <span className={ICON_BOX_CLASS}>
        <StatsIcon className={ICON_CLASS} />
      </span>
    ),
  },
  {
    // TEMPORARY (current sprint): original destination, restore by
    // uncommenting the line below and removing the override under it.
    // href: "/profile",
    href: "/development-in-progress",
    activeMatch: "/profile",
    label: "Profile",
    icon: (
      <span className={ICON_BOX_CLASS}>
        <UserIcons className={ICON_CLASS} />
      </span>
    ),
  },
];

type SidebarProps = {
  onCollapse?: () => void;
};

export function Sidebar({ onCollapse }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="relative hidden w-56 shrink-0 flex-col gap-8 border-r border-brand/10 bg-surface px-4 py-6 lg:flex">
      <div className="px-2">
        <Logo size="compact" showTagline={false} />
      </div>

      {onCollapse && (
        <button
          type="button"
          onClick={onCollapse}
          aria-label="Collapse sidebar"
          className="absolute -right-3.5 top-8 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-sidebar-border bg-surface text-sidebar-inactive-fg shadow-sm hover:bg-sidebar-active-bg hover:text-sidebar-active-fg"
        >
          <ChevronRightIcon className="h-4 w-4 rotate-180" />
        </button>
      )}

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const matchPath = item.activeMatch ?? item.href;
          const active =
            item.label === "Practice"
              ? pathname?.startsWith("/practice")
              : pathname === matchPath || pathname?.startsWith(`${matchPath}/`);

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                active
                  ? "bg-sidebar-active-bg text-sidebar-active-fg"
                  : "text-sidebar-inactive-fg"
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
