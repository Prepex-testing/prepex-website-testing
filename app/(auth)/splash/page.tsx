"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Logo, Logo1 } from "@/components/ui/Logo";
import { cachedFlags, loadFlags } from "@/lib/onboardingV2/flags";

/** A first-time visitor (nothing remembered) waits at most this long for the server's answer before moving on. */
const FLAGS_WAIT_MS = 1500;

export default function SplashPage() {
  const router = useRouter();

  useEffect(() => {
    // Onboarding v2: with the flag on, the front door is the Pexo sign-in, not the old welcome screen
    // No fixed wait: a returning visitor goes on at once with the remembered answer (refreshed in the background); a
    // first-time visitor waits for the server only briefly, then takes the new sign-in, which is the launch default.
    let alive = true;
    let moved = false;
    const go = (onboardingV2: boolean) => {
      if (!alive || moved) return;
      moved = true;
      router.replace(onboardingV2 ? "/start" : "/welcome");
    };
    const remembered = cachedFlags();
    const fresh = loadFlags();
    if (remembered) go(remembered.onboardingV2);
    else void fresh.then((f) => go(f.onboardingV2));
    const timer = setTimeout(() => go(true), FLAGS_WAIT_MS);

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [router]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-[25px] bg-background px-6">
      {/* One logo only: the loading mark is itself the logo (P6), so showing it here as well drew two logos. */}
      <Logo1 />
    </main>
  );
}
