"use client";

import { useEffect } from "react";
import { PexoBubble } from "@/components/pexo/PexoBubble";
import { dismissPexo, loadPexo, usePexo } from "@/lib/pexo/store";

/** How long a reaction stays before it leaves on its own. First-visit and care bubbles stay until dismissed. */
export const REACTION_MS = 5200;

/**
 * Mounted once in the app shell. Loads Pexo's state (with the XP summary the shell already fetches) and shows the one
 * transient bubble: a reaction to something the student just did, or a first-visit hint. It floats over the page, so it
 * adds no layout shift, and it is never modal. Renders nothing when Pexo is off.
 */
export function PexoLayer({ muted = false }: { muted?: boolean }) {
  const { enabled, transient } = usePexo();

  useEffect(() => {
    void loadPexo();
  }, []);

  useEffect(() => {
    if (!transient || transient.sticky) return;
    const t = setTimeout(() => dismissPexo(transient.key), REACTION_MS);
    return () => clearTimeout(t);
  }, [transient]);

  if (!enabled || !transient || muted) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(124px+env(safe-area-inset-bottom))] z-[65] flex justify-center px-3 lg:inset-x-auto lg:bottom-6 lg:right-24 lg:justify-end lg:px-0" data-testid="pexo-layer">
      <div key={transient.key} className="motion-toast pointer-events-auto w-full max-w-[400px]">
        <PexoBubble pick={transient.pick} actions={transient.actions} onDismiss={() => dismissPexo(transient.key)} floating testId="pexo-transient" />
      </div>
    </div>
  );
}
