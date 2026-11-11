"use client";

import { usePathname } from "next/navigation";
import { Suspense, useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { CommandPalette } from "@/components/command/CommandPalette";
import { MotionProvider } from "@/components/motion/GlidePill";
import { PageLoader } from "@/components/ui/PageLoader";
import { Sidebar } from "@/components/layout/Sidebar";
import { FocusSidebar } from "@/components/layout/FocusSidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { BusyNotice } from "@/components/layout/BusyNotice";
import { useCheckInGate } from "@/components/check-in/CheckInGate";
import { OnboardingCoach } from "@/components/coach/OnboardingCoach";
import { AccountRestoredNotice } from "@/components/auth/AccountRestoredNotice";
import { ActiveFocusBanner } from "@/components/focus/ActiveFocusBanner";
import { FocusLauncher } from "@/components/focus/FocusLauncher";
import { Heartbeat } from "@/components/rewards/Heartbeat";
import { QuickLogFab } from "@/components/rituals/QuickLogFab";
import { RewardsLayer } from "@/components/rewards/RewardsLayer";
import { PexoLayer } from "@/components/pexo/PexoLayer";
import { usePexo } from "@/lib/pexo/store";

// Immersive "focus" experiences: narrower sidebar, no check-in interruptions.
// (The practice player also intercepts nav clicks to confirm leaving.)
const FOCUS_PATHS = ["/focus/start", "/practice"];

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
  // Pexo is the guide when it is on: the older coach marks stay quiet so two guides never talk at once
  const { enabled: pexoOn, state: pexoKnown } = usePexo();
  const isCollapsed = useSyncExternalStore(
    subscribeToStoredSidebarCollapsed,
    getStoredSidebarCollapsedSnapshot,
    getStoredSidebarCollapsedServerSnapshot,
  );

  const collapsedState = isFocusMode || isCollapsed;

  // P6: each new route's content enters with a short fade and rise. The class is re-applied rather than the tree keyed
  // by path, so nothing remounts (state inside nested layouts survives).
  const page = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = page.current;
    if (!el) return;
    el.classList.remove("motion-page");
    void el.offsetWidth;
    el.classList.add("motion-page");
  }, [pathname]);

  return (
    <MotionProvider>
    <div className="flex min-h-screen flex-1 bg-background">
      <FocusLauncher />
      {!isFocusMode && <Heartbeat />}
      <RewardsLayer />
      {/* nothing speaks during a focus session (Pexo guide, section 4) */}
      <Suspense fallback={null}>
        <PexoLayer muted={isFocusMode} />
      </Suspense>
      <BusyNotice />
      <div
        className={`relative hidden shrink-0 transition-[width] duration-[var(--dur-emphasis)] ease-[var(--ease-out)] lg:block ${
          collapsedState ? "w-24.25" : "w-56"
        }`}
      >
        <div
          className={`absolute inset-y-0 left-0 flex transition-opacity duration-[var(--dur-standard)] ease-[var(--ease-out)] ${
            collapsedState ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
        >
          <Sidebar onCollapse={() => writeStoredSidebarCollapsed(true)} />
        </div>
        <div
          className={`absolute inset-y-0 left-0 flex transition-opacity duration-[var(--dur-standard)] ease-[var(--ease-out)] ${
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
            {!isFocusMode && pexoKnown !== null && !pexoOn && <OnboardingCoach />}
            <AccountRestoredNotice />
            <ActiveFocusBanner />
            <div ref={page} className="motion-page">
              {children}
            </div>
          </>
        ) : (
          // the daily check-in check is still in flight: a skeleton, not a blank screen
          <PageLoader />
        )}
      </div>
      {!isFocusMode && <QuickLogFab />}
      <CommandPalette />
      <BottomNav />
    </div>
    </MotionProvider>
  );
}
