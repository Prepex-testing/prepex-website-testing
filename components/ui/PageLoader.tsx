"use client";

import { useEffect, useState } from "react";

/** Content under this long shows nothing new (P6): a flash of skeleton is worse than a short pause. */
export const SKELETON_DELAY_MS = 300;

/**
 * Full-page loading state. Render this INSTEAD of the page body while the page's API data is still loading, so static
 * chrome never flashes in before the real content; the whole page then paints at once.
 *
 * P6: no spinner. For the first 300 ms it shows nothing; after that, a content-shaped skeleton (a heading, a hero card,
 * a row of cards and a few list rows) with a soft shimmer, still for reduced or lite motion.
 */
export function PageLoader({ label }: { label?: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), SKELETON_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex min-h-[70vh] w-full flex-col gap-4 p-4 sm:p-6 lg:p-8" role="status" aria-live="polite" aria-busy="true" data-testid="page-skeleton">
      <span className="sr-only">{label ?? "Loading"}</span>
      {show && (
        <div className="motion-fade-in flex flex-col gap-4" aria-hidden>
          <div className="skeleton h-8 w-2/5 max-w-[320px] rounded-xl" />
          <div className="skeleton h-4 w-1/4 max-w-[200px] rounded-lg" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <div className="skeleton h-44 rounded-[20px]" />
            <div className="skeleton h-44 rounded-[20px]" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="skeleton h-24 rounded-2xl" />
            <div className="skeleton h-24 rounded-2xl" />
            <div className="skeleton h-24 rounded-2xl" />
          </div>
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-14 rounded-2xl" />
          ))}
        </div>
      )}
    </div>
  );
}
