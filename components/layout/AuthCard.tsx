import type { ReactNode } from "react";

export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center bg-background px-3 py-6 sm:px-6 sm:py-12">
      <div className="w-full max-w-3xl rounded-3xl bg-surface p-6 shadow-modal sm:p-12">
        {children}
      </div>
    </main>
  );
}
