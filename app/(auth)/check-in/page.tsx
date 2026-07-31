"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckInBody } from "@/components/check-in/CheckInBody";
import type { Mood } from "@/components/check-in/moods";
import { submitCheckIn, moodIdToApiValue } from "@/lib/api/checkin";
import { generatePlanForMood } from "@/lib/api/planner";
import { useStoredFullName } from "@/lib/auth/useStoredFullName";
import { LoderIcon } from "@/assets/icons";
import { CheckInCard } from "@/components/layout/CheckInCard";

export default function CheckInPage() {
  const router = useRouter();
  const name = useStoredFullName();
  const [isGeneratingPlan, setGeneratingPlan] = useState(false);

  const handleContinue = async (mood: Mood | null) => {
    if (!mood) {
      router.push("/home");
      return;
    }

    setGeneratingPlan(true);
    try {
      await generatePlanForMood(moodIdToApiValue(mood.id));
    } catch {
      // Best-effort — don't block navigation on the API call.
    } finally {
      router.push("/home");
    }
  };

  const handleSkip = () => {
    submitCheckIn({ isSkipped: true }).catch(() => {
      // Best-effort — don't block navigation on the API call.
    });
    router.push("/home");
  };

  if (isGeneratingPlan) {
    return (
      <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/90 backdrop-blur-sm">
          <LoderIcon className="h-10 w-10 animate-spin text-ink" />
          <p className="text-base font-bold text-ink">Generating plan...</p>
          <p className="text-sm text-muted">Adjusting today&apos;s plan to your energy</p>
        </div>
      </div>
    );
  }

  return (
    <CheckInCard>
      <CheckInBody
        name={name}
        mode="onboarding"
        onContinue={handleContinue}
        onSkip={handleSkip}
      />
    </CheckInCard>
  );
}
