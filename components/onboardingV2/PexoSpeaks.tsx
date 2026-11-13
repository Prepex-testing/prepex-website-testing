"use client";

import { Pexo } from "@/components/pexo/Pexo";
import type { PexoPick } from "@/lib/pexo/engine";

/**
 * Onboarding v2: Pexo at 160 px with one large speech bubble. The bubble is a polite live region, so a screen reader
 * hears each new line once. `stepIndex` lifts Pexo one stair per answered question (the climb, instead of
 * "Step x of 5"); the lift is a transform, so reduced motion simply skips the animation.
 */
export function PexoSpeaks({ pick, size = 160, stepIndex = 0, steps = 0, testId = "onb-pexo" }: { pick: PexoPick | null; size?: 96 | 160; stepIndex?: number; steps?: number; testId?: string }) {
  const lift = steps > 0 ? Math.min(stepIndex, steps) * 6 : 0;
  return (
    <div className="flex flex-col items-center gap-4" data-testid={testId} data-line={pick?.id ?? ""}>
      <div className="relative" style={{ height: size }}>
        {steps > 0 && <Stairs steps={steps} at={stepIndex} />}
        <div className="relative motion-safe:transition-transform motion-safe:duration-500" style={{ transform: `translateY(${-lift}px)` }}>
          <Pexo mood={pick?.mood ?? "waving"} size={size} speaking={Boolean(pick)} />
        </div>
      </div>
      {pick && (
        <div role="status" aria-live="polite" className="w-full max-w-[460px] rounded-3xl rounded-t-lg border border-border-subtle bg-surface-elevated px-5 py-4 text-center shadow-sm">
          <p className="text-[18px] font-semibold leading-snug text-ink sm:text-[20px]" data-testid={`${testId}-text`}>
            {pick.text}
          </p>
        </div>
      )}
    </div>
  );
}

/** The staircase under Pexo: one stone per question, the climbed ones filled. Decorative. */
function Stairs({ steps, at }: { steps: number; at: number }) {
  return (
    <div aria-hidden className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 items-end gap-1">
      {Array.from({ length: steps }, (_, i) => (
        <span key={i} className={`block w-3 rounded-sm ${i < at ? "bg-[var(--cta)]" : "bg-black/10 dark:bg-white/10"}`} style={{ height: 4 + i * 2 }} />
      ))}
    </div>
  );
}
