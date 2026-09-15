"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, NAV_COACH_ANCHOR } from "@/components/layout/Sidebar";
import { useStoredFullName } from "@/lib/auth/useStoredFullName";
import { useAvatarSrc } from "@/lib/profile/avatar";
import { AvatarFace } from "@/components/ui/AvatarFace";
import { ChevronRightIcon } from "@/components/ui/icons";

type FocusSidebarProps = {
  onExpand?: () => void;
};

export function FocusSidebar({ onExpand }: FocusSidebarProps) {
  const pathname = usePathname();
  const storedFullName = useStoredFullName();
  const displayInitial = storedFullName.trim()[0]?.toUpperCase() ?? "S";
  const avatarSrc = useAvatarSrc();

  return (
    <aside className="relative hidden w-24.25 flex-col items-center self-stretch border-r border-sidebar-border bg-surface px-6 py-8 lg:flex">
      <AvatarFace
        src={avatarSrc}
        fallback={displayInitial}
        className="
    flex
    h-8
    w-8
    shrink-0
    items-center
    justify-center
    rounded-full
    bg-[#171658]
    text-sm
    font-bold
    leading-5
    text-white
    dark:bg-[#FAF7F2]
    dark:text-[#171658]
  "
      />

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
          const matchPath = item.activeMatch ?? item.href;
          const active =
            item.label === "Practice"
              ? pathname?.startsWith("/practice")
              : pathname === matchPath ||
              pathname?.startsWith(`${matchPath}/`);

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