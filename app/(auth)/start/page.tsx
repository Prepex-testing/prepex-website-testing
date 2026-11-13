"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SignInScreen } from "@/components/onboardingV2/SignInScreen";
import { useAuthFlags } from "@/lib/onboardingV2/flags";

/** Onboarding v2, Part B: the Pexo sign-in screen. With ONBOARDING_V2 off, this address sends everyone to /login. */
export default function StartPage() {
  const router = useRouter();
  const { flags, ready } = useAuthFlags();
  useEffect(() => {
    if (ready && !flags.onboardingV2) router.replace("/login");
  }, [ready, flags.onboardingV2, router]);
  if (!flags.onboardingV2) return null;
  return <SignInScreen />;
}
