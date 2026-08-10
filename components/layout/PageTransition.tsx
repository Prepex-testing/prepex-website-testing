"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";

const EASE = [0.4, 0, 0.2, 1] as const;

type PageTransitionState = {
  exiting: boolean;
  beginExit: () => void;
};

const PageTransitionContext = createContext<PageTransitionState | null>(null);

// Route data isn't ready the instant a nav link is clicked — pathname only
// updates once Next.js finishes loading the destination. Without this, the
// exit animation can't start until that load completes, so clicks feel like
// they "hang" before anything visibly happens. Nav links call this on click
// so the exit plays immediately and the load happens behind it instead of
// before it.
export function useBeginPageTransition() {
  const ctx = useContext(PageTransitionContext);
  return ctx?.beginExit ?? (() => {});
}

export function PageTransitionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    setExiting(false);
  }, [pathname]);

  const beginExit = useCallback(() => setExiting(true), []);
  const value = useMemo(() => ({ exiting, beginExit }), [exiting, beginExit]);

  return (
    <PageTransitionContext.Provider value={value}>
      {children}
    </PageTransitionContext.Provider>
  );
}

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const ctx = useContext(PageTransitionContext);
  const exiting = ctx?.exiting ?? false;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{
          opacity: 0,
          x: -16,
        }}
        animate={
          exiting
            ? { opacity: 0, x: 8 }
            : { opacity: 1, x: 0 }
        }
        exit={{
          opacity: 0,
          x: 8,
        }}
        transition={{
          duration: 0.2,
          ease: EASE,
        }}
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
