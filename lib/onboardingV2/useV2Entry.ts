"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { cachedFlags, loadFlags } from "@/lib/onboardingV2/flags";

/**
 * With ONBOARDING_V2 on, the old front doors (/login, /create-account) hand over to the Pexo sign-in screen, except
 * when the student asked for the password login (`?password=1`) or a deletion notice has to be shown. With it off,
 * this does nothing and the old screens render exactly as before. Returns true while the page should stay hidden
 * because it is about to be replaced (only when this device already knows v2 is on, so there is no flash).
 */
export function useV2Entry(): boolean {
  const router = useRouter();
  const [hide, setHide] = useState(() => {
    if (typeof window === "undefined") return false;
    return cachedFlags()?.onboardingV2 === true && !keepOldPage();
  });
  useEffect(() => {
    if (keepOldPage()) return;
    let alive = true;
    void loadFlags().then((flags) => {
      if (!alive) return;
      if (flags.onboardingV2) router.replace("/start");
      else setHide(false);
    });
    return () => {
      alive = false;
    };
  }, [router]);
  return hide;
}

function keepOldPage(): boolean {
  const q = new URLSearchParams(window.location.search);
  return q.get("password") === "1" || q.has("deletionScheduled");
}
