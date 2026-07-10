import { FocusSidebar } from "@/components/layout/FocusSidebar";

export default function FocusLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-1 bg-background">
      <FocusSidebar />
      <div className="flex-1">{children}</div>
    </div>
  );
}
