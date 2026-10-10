"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import {
  HomeIcon,
  CalendarIcon,
  TargetIcon,
  ChartBarIcon,
  StudyIcon,
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
    href: "/plan",
    activeMatch: "/plan",
    label: "Plan",
    icon: (
      <span className={ICON_BOX_CLASS}>
        <CalendarIcon className={ICON_CLASS} />
      </span>
    ),
  },
  {
    href: "/focus",
    activeMatch: "/focus",
    // Focus, the study log, the mistake notebook and the revision / backlog / practice logs all live behind this one tab.
    activeAny: ["/focus", "/sessions", "/mistakes", "/logs"],
    label: "Study",
    icon: (
      <span className={ICON_BOX_CLASS}>
        <StudyIcon className={ICON_CLASS} />
      </span>
    ),
  },
  {
    href: "/practice/sessions",
    activeMatch: "/practice",
    label: "Practice",
    icon: (
      <span className={ICON_BOX_CLASS}>
        <PracticeIcon className={ICON_CLASS} />
      </span>
    ),
  },
  {
    href: "/stats",
    activeMatch: "/stats",
    label: "Stats",
    icon: (
      <span className={ICON_BOX_CLASS}>
        <StatsIcon className={ICON_CLASS} />
      </span>
    ),
  },
  {
    href: "/profile",
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

// data-coach anchors for the Onboarding Coach (Section 16). The sidebar and
// the mobile bottom nav both carry these, and the coach uses whichever is
// actually laid out at the time.
export const NAV_COACH_ANCHOR: Record<string, string> = {
  Practice: "nav-practice",
  Stats: "nav-stats",
};

/** Whether a nav item is the current section (shared by the sidebar and the mobile bottom bar). */
export function isNavItemActive(item: (typeof NAV_ITEMS)[number], pathname: string | null): boolean {
  if (item.activeAny) return item.activeAny.some((p) => pathname === p || pathname?.startsWith(`${p}/`) === true);
  if (item.label === "Practice") return pathname?.startsWith("/practice") === true;
  const matchPath = item.activeMatch ?? item.href;
  return pathname === matchPath || pathname?.startsWith(`${matchPath}/`) === true;
}

export function Sidebar({ onCollapse }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="relative hidden w-56 shrink-0 flex-col gap-8 border-r border-brand/10 bg-surface px-4 py-6 lg:flex">
      <div className="px-2">
        <Logo size="compact" showTagline={false} layout="horizontal" />
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
          const active = isNavItemActive(item, pathname);

          return (
            <Link
              key={item.label}
              href={item.href}
              data-coach={NAV_COACH_ANCHOR[item.label]}
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
