"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Logo, Logo1 } from "@/components/ui/Logo";
import { loadFlags } from "@/lib/onboardingV2/flags";

const REDIRECT_DELAY_MS = 2000;

export default function SplashPage() {
  const router = useRouter();

  useEffect(() => {
    // Onboarding v2: with the flag on, the front door is the Pexo sign-in, not the old welcome screen
    let alive = true;
    const flags = loadFlags();
    const timer = setTimeout(() => {
      void flags.then((f) => {
        if (alive) router.push(f.onboardingV2 ? "/start" : "/welcome");
      });
    }, REDIRECT_DELAY_MS);

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
