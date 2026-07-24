import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { CheckInGate } from "@/components/check-in/CheckInGate";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-1 bg-background">
      <Sidebar />
      <div className="min-w-0 flex-1 pb-[calc(56px+env(safe-area-inset-bottom))] lg:pb-0">
        {children}
      </div>
      <BottomNav />
      <CheckInGate />
    </div>
  );
}
