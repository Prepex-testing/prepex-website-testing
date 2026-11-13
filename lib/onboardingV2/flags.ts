"use client";

import { useEffect, useState } from "react";
import { getAuthFlags, type AuthFlags } from "@/lib/api/auth";

/**
 * ONBOARDING_V2 and GUEST_MODE, as the auth server reports them. The last answer is remembered on the device so a
 * returning visitor is routed without a flash; it is refreshed on every visit. Anything unknown counts as off, so a
 * failure always lands on the old, proven flow.
 */
const KEY = "prepex:auth-flags";
const OFF: AuthFlags = { onboardingV2: false, guestMode: false };

export function cachedFlags(): AuthFlags | null {
  try {
    const raw = typeof window === "undefined" ? null : window.localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<AuthFlags>;
    return { onboardingV2: v.onboardingV2 === true, guestMode: v.guestMode === true };
  } catch {
    return null;
  }
}

function remember(flags: AuthFlags) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(flags));
  } catch {
    /* private mode: no memory, still correct */
  }
}

export async function loadFlags(): Promise<AuthFlags> {
  try {
    const { data } = await getAuthFlags();
    const flags = { onboardingV2: data.onboardingV2 === true, guestMode: data.onboardingV2 === true && data.guestMode === true };
    remember(flags);
    return flags;
  } catch {
    return cachedFlags() ?? OFF;
  }
}

/** `ready` turns true once the server has answered (or failed); until then `flags` is the remembered answer, if any. */
export function useAuthFlags(): { flags: AuthFlags; ready: boolean } {
  const [state, setState] = useState<{ flags: AuthFlags; ready: boolean }>(() => ({ flags: cachedFlags() ?? OFF, ready: false }));
  useEffect(() => {
    let alive = true;
    void loadFlags().then((flags) => {
      if (alive) setState({ flags, ready: true });
    });
    return () => {
      alive = false;
    };
  }, []);
  return state;
}
