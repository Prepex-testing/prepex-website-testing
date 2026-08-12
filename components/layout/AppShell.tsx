"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore, type ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { FocusSidebar } from "@/components/layout/FocusSidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { useCheckInGate } from "@/components/check-in/CheckInGate";

// The revision session is an immersive "focus" experience: narrower sidebar,
// no check-in interruptions.
const FOCUS_PATH = "/revision-session";

const SIDEBAR_COLLAPSED_KEY = "prepex.sidebarCollapsed";
// Same-tab writes don't fire the native `storage` event (only other tabs get
// that), so writeStoredSidebarCollapsed dispatches this too — matches the
// pattern ThemeProvider uses for its own localStorage-backed state.
const SIDEBAR_COLLAPSED_CHANGE_EVENT = "prepex-sidebar-collapsed-change";

function getStoredSidebarCollapsedSnapshot() {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  } catch {
    return false;
  }
}

function getStoredSidebarCollapsedServerSnapshot() {
  return false;
}

function subscribeToStoredSidebarCollapsed(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(SIDEBAR_COLLAPSED_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(SIDEBAR_COLLAPSED_CHANGE_EVENT, onChange);
  };
}

function writeStoredSidebarCollapsed(collapsed: boolean) {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
  } catch {
    // localStorage unavailable — collapse state just won't persist across reloads.
  }
  window.dispatchEvent(new Event(SIDEBAR_COLLAPSED_CHANGE_EVENT));
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isFocusMode = pathname === FOCUS_PATH;
  const isCheckInVerified = useCheckInGate(!isFocusMode);
  const isCollapsed = useSyncExternalStore(
    subscribeToStoredSidebarCollapsed,
    getStoredSidebarCollapsedSnapshot,
    getStoredSidebarCollapsedServerSnapshot,
  );

  return (
    <div className="flex min-h-screen flex-1 bg-background">
      {isFocusMode || isCollapsed ? (
        <FocusSidebar
          onExpand={isFocusMode ? undefined : () => writeStoredSidebarCollapsed(false)}
        />
      ) : (
        <Sidebar onCollapse={() => writeStoredSidebarCollapsed(true)} />
      )}
      <div className="min-w-0 flex-1 pb-[calc(56px+env(safe-area-inset-bottom))] lg:pb-0">
        {isCheckInVerified ? children : null}
      </div>
      <BottomNav />
    </div>
  );
}
