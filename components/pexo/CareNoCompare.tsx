"use client";

import { PexoBubble, usePexoLine } from "@/components/pexo/PexoBubble";
import { useEffect } from "react";
import { loadPexo, usePexo } from "@/lib/pexo/store";

/** On the leaderboard, for a student in care mode: "Your climb is yours." Nothing otherwise. */
export function CareNoCompare() {
  const { enabled, state } = usePexo();
  // the leaderboard can be the first screen opened: ask for the state once (it is shared and cached)
  useEffect(() => {
    void loadPexo();
  }, []);
  const pick = usePexoLine(enabled && state?.care?.active ? "care.no_compare" : null, {}, "care.no_compare");
  if (!pick) return null;
  return <PexoBubble pick={pick} size={48} testId="care-no-compare" />;
}
