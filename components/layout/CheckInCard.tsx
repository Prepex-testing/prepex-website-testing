import type { ReactNode } from "react";

export function CheckInCard({ children }: { children: ReactNode }) {
    return (
        <main className="flex min-h-screen items-center justify-center bg-white dark:bg-[var(--bg-card,#111145)] px-3 py-6 sm:px-6 sm:py-12">
            <div className="w-full max-w-3xl rounded-3xl bg-[#FAF7F2] dark:bg-[var(--bg-card,#111145)] p-6 shadow-modal sm:p-12">
                {children}
            </div>
        </main>
    );
}