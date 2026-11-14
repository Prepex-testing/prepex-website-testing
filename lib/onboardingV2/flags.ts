"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
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
    return { onboardingV2: v.onboardingV2 === true, guestMode: v.guestMode === true, googleSignIn: v.googleSignIn !== false };
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
    // an older server that does not report Google is assumed to have it, as before
    const flags = { onboardingV2: data.onboardingV2 === true, guestMode: data.onboardingV2 === true && data.guestMode === true, googleSignIn: data.googleSignIn !== false };
    remember(flags);
    return flags;
  } catch {
    return cachedFlags() ?? OFF;
  }
}

const noSubscribe = () => () => {};
/** The raw remembered value: a string, so React can compare snapshots by value. */
const rememberedRaw = () => {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
};

/**
 * `ready` turns true once the server has answered (or failed); until then `flags` is the remembered answer, if any.
 * The remembered answer is read with useSyncExternalStore: during hydration React uses the server snapshot (nothing
 * remembered, the same tree the server drew) and then re-renders with the device's value. Reading localStorage in the
 * first render instead caused React hydration error #418 on /start for every returning visitor.
 */
export function useAuthFlags(): { flags: AuthFlags; ready: boolean } {
  const raw = useSyncExternalStore(noSubscribe, rememberedRaw, () => null);
  const [answer, setAnswer] = useState<AuthFlags | null>(null);
  useEffect(() => {
    let alive = true;
    void loadFlags().then((flags) => {
      if (alive) setAnswer(flags);
    });
    return () => {
      alive = false;
    };
  }, []);
  const remembered = useMemo(() => (raw ? cachedFlags() : null), [raw]);
  return { flags: answer ?? remembered ?? OFF, ready: answer !== null };
}
