"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { OnboardingCanvas } from "@/components/onboardingV2/OnboardingCanvas";
import { useAuthFlags } from "@/lib/onboardingV2/flags";

/** Onboarding v2, Part C: the Pexo canvas. With ONBOARDING_V2 off this address sends students to the old first step. */
export default function OnboardingV2Page() {
  const router = useRouter();
  const { flags, ready } = useAuthFlags();
  useEffect(() => {
    if (ready && !flags.onboardingV2) router.replace("/onboarding/preparing-for");
  }, [ready, flags.onboardingV2, router]);
  if (!flags.onboardingV2) return null;
  return <OnboardingCanvas />;
}
