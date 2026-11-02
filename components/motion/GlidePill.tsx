"use client";

import { motion, MotionConfig } from "motion/react";
import { useState, type ReactNode } from "react";
import { motionMode, SPRING, SPRING_LITE } from "@/lib/motion/tokens";

/**
 * The selected-tab highlight that glides to the tab you pick (P6). Render it inside the active tab (which must be
 * `relative`) with one `id` per tab strip; Motion moves it with transforms only. Put the tab's label in a `relative`
 * element so it sits above the pill.
 */
export function GlidePill({ id, className }: { id: string; className: string }) {
  return <motion.span layoutId={id} aria-hidden className={`absolute inset-0 ${className}`} style={{ zIndex: 0 }} />;
}

/** App-wide Motion settings: honours reduced motion, and lite motion swaps the spring for a short tween. */
export function MotionProvider({ children }: { children: ReactNode }) {
  const [mode] = useState(motionMode);
  return (
    <MotionConfig reducedMotion="user" transition={mode === "lite" ? SPRING_LITE : SPRING}>
      {children}
    </MotionConfig>
  );
}
