"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { FocusExperience } from "@/components/focus/FocusExperience";
import { PageLoader } from "@/components/ui/PageLoader";
import { parseIntentParams } from "@/lib/focus/intent";

/**
 * THE focus timer. Every start button, every deeplink (push notification, WhatsApp broadcast, PWA shortcut, a legacy
 * URL redirected here) lands on this route: `?origin=planner&id=…`, `?origin=practice_tab&chapter=…`,
 * `?origin=home_quick_tile`, `?origin=standalone`. The params become a FocusSessionIntent and the timer opens pre-filled.
 * A session that is already running is picked up instead, whatever the link said.
 */
function FocusStart() {
  const params = useSearchParams();
  const launch = useMemo(() => parseIntentParams(params), [params]);
  return <FocusExperience launch={launch} />;
}

export default function FocusStartPage() {
  return (
    <Suspense fallback={<PageLoader label="Getting your focus space ready…" />}>
      <FocusStart />
    </Suspense>
  );
}
