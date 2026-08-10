"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { FocusSidebar } from "@/components/layout/FocusSidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { CheckInGate } from "@/components/check-in/CheckInGate";

// The revision session is an immersive "focus" experience: narrower sidebar,
// no check-in interruptions.
const FOCUS_PATH = "/revision-session";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isFocusMode = pathname === FOCUS_PATH;

  return (
    <div className="flex min-h-screen flex-1 bg-background">
      {isFocusMode ? <FocusSidebar /> : <Sidebar />}
      <div className="min-w-0 flex-1 pb-[calc(56px+env(safe-area-inset-bottom))] lg:pb-0">
        {children}
      </div>
      <BottomNav />
      {!isFocusMode && <CheckInGate />}
    </div>
  );
}
