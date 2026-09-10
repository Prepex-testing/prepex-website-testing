"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore, type ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { FocusSidebar } from "@/components/layout/FocusSidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { useCheckInGate } from "@/components/check-in/CheckInGate";
import { OnboardingCoach } from "@/components/coach/OnboardingCoach";

// Immersive "focus" experiences: narrower sidebar, no check-in interruptions.
// (The practice player also intercepts nav clicks to confirm leaving.)
const FOCUS_PATHS = ["/revision-session", "/practice"];

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
  const isFocusMode = FOCUS_PATHS.includes(pathname);
  const isCheckInVerified = useCheckInGate(!isFocusMode);
  const isCollapsed = useSyncExternalStore(
    subscribeToStoredSidebarCollapsed,
    getStoredSidebarCollapsedSnapshot,
    getStoredSidebarCollapsedServerSnapshot,
  );

  const collapsedState = isFocusMode || isCollapsed;

  return (
    <div className="flex min-h-screen flex-1 bg-background">
      <div
        className={`relative hidden shrink-0 transition-[width] duration-700 ease-in-out lg:block ${
          collapsedState ? "w-24.25" : "w-56"
        }`}
      >
        <div
          className={`absolute inset-y-0 left-0 flex transition-opacity duration-700 ease-in-out ${
            collapsedState ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
        >
          <Sidebar onCollapse={() => writeStoredSidebarCollapsed(true)} />
        </div>
        <div
          className={`absolute inset-y-0 left-0 flex transition-opacity duration-700 ease-in-out ${
            collapsedState ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <FocusSidebar
            onExpand={isFocusMode ? undefined : () => writeStoredSidebarCollapsed(false)}
          />
        </div>
      </div>
      <div className="min-w-0 flex-1 pb-[calc(56px+env(safe-area-inset-bottom))] lg:pb-0">
        {isCheckInVerified ? (
          <>
            {/* Section 16 — one coaching message a day, above whatever screen
                the student is on. Suppressed in the immersive focus paths,
                where interrupting a running session would violate 16.7. */}
            {!isFocusMode && <OnboardingCoach />}
            {children}
          </>
        ) : null}
      </div>
      <BottomNav />
    </div>
  );
}
