"use client";

// TEMPORARY (current sprint): placeholder destination for nav items/Quick
// Access links that are temporarily disabled while development focuses on
// the Home page. See NAV_ITEMS in components/layout/Sidebar.tsx and
// QUICK_ACCESS in app/(app)/home/page.tsx for the overridden links that
// point here — each has its original destination commented alongside it
// so this can be reverted once the sprint restriction is lifted.

import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import { BellIcon, ClockIcon } from "@/components/ui/icons";

export default function DevelopmentInProgressPage() {
  return (
    <div className="flex min-h-full flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h1 text-ink">Coming Soon</h1>
        <div className="flex shrink-0 items-center gap-4">
          <ThemeToggle />
          <button
            type="button"
            aria-label="Notifications"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-icon-action-bg text-icon-action-text transition-colors hover:bg-tint-strong"
          >
            <BellIcon />
          </button>
          <UserMenu />
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border border-brand/10 bg-surface p-10 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-tint text-ink">
          <ClockIcon className="h-6 w-6" />
        </span>
        <p className="text-lg font-bold text-ink">This page development is in progress</p>
        <p className="text-sm text-muted">Please check back soon — we&apos;re actively working on this section.</p>
      </div>
    </div>
  );
}
