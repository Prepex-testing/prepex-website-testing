"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";

export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-3 py-6 sm:px-6 sm:py-12">
      <motion.div
        initial={{ x: 50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{
          type: "spring",
          stiffness: 70,
          damping: 18,
          mass: 1.2,
        }}
        className="w-full max-w-3xl rounded-3xl bg-surface p-6 shadow-modal sm:p-12"
      >
        {children}
      </motion.div>
    </main>
  );
}