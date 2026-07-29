"use client";

import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/layout/AuthCard";
import { CheckInBody } from "@/components/check-in/CheckInBody";
import type { Mood } from "@/components/check-in/moods";
import { submitCheckIn, moodIdToApiValue } from "@/lib/api/checkin";
import { useStoredFullName } from "@/lib/auth/useStoredFullName";
import { CheckInCard } from "@/components/layout/CheckInCard";

export default function CheckInPage() {
  const router = useRouter();
  const name = useStoredFullName();

  const handleContinue = (mood: Mood | null) => {
    if (mood) {
      submitCheckIn({ mood: moodIdToApiValue(mood.id) }).catch(() => {
        // Best-effort — don't block navigation on the API call.
      });
    }
    router.push("/home");
  };

  const handleSkip = () => {
    submitCheckIn({ isSkipped: true }).catch(() => {
      // Best-effort — don't block navigation on the API call.
    });
    router.push("/home");
  };

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
