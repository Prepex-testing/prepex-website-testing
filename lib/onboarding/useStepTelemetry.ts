"use client";

import { useCallback, useEffect, useRef } from "react";
import { trackOnboarding } from "@/lib/onboarding/telemetry";

/**
 * Fires `onboarding_step_view` once when the screen mounts and hands back `complete()` for the Next button
 * to call when the student moves on. Sub-screens (the subject pick inside step 1) pass their own name.
 */
export function useStepTelemetry(stepNumber: number, stepName: string) {
  const viewed = useRef(false);

  useEffect(() => {
    if (viewed.current) return; // React strict mode mounts twice in development
    viewed.current = true;
    trackOnboarding("onboarding_step_view", { stepNumber, stepName });
  }, [stepNumber, stepName]);

  return useCallback(() => trackOnboarding("onboarding_step_complete", { stepNumber, stepName }), [stepNumber, stepName]);
}
