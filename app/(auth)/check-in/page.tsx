"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckInModal } from "@/components/check-in/CheckInModal";
import type { Mood } from "@/components/check-in/moods";
import { submitCheckIn, moodIdToApiValue, getCheckInStatus } from "@/lib/api/checkin";
import { generatePlanForMood } from "@/lib/api/planner";
import { useStoredFullName } from "@/lib/auth/useStoredFullName";
import { LoderIcon } from "@/assets/icons";
import { SecondDayInfoModal } from "@/components/home/SecondDayInfoModal";

// Gives the check-in modal a beat on screen before stacking the info popup on
// top of it, instead of both appearing in the same instant.
const SECOND_DAY_POPUP_DELAY_MS = 1000;

export default function CheckInPage() {
  const router = useRouter();
  const name = useStoredFullName();
  const [isGeneratingPlan, setGeneratingPlan] = useState(false);
  const [isSkipping, setSkipping] = useState(false);
  const [needsCheckIn, setNeedsCheckIn] = useState(false);
  const [isSecondDayPopupOpen, setSecondDayPopupOpen] = useState(false);

  // Single /status call drives both whether the check-in prompt is needed at
  // all and whether the second-day popup should stack on top of it — no
  // second /status round-trip once the user submits their mood.
  useEffect(() => {
    let cancelled = false;
    let popupTimer: ReturnType<typeof setTimeout> | undefined;

    getCheckInStatus()
      .then(({ data }) => {
        if (cancelled) return;

        if (data.exists) {
          router.push("/home");
          return;
        }

        setNeedsCheckIn(true);
        if (data.isSecondDay) {
          popupTimer = setTimeout(() => {
            if (!cancelled) setSecondDayPopupOpen(true);
          }, SECOND_DAY_POPUP_DELAY_MS);
        }
      })
      .catch(() => {
        // Best-effort — still let the user check in even if the status call fails.
        if (!cancelled) setNeedsCheckIn(true);
      });

    return () => {
      cancelled = true;
      clearTimeout(popupTimer);
    };
  }, [router]);

  const handleContinue = async (mood: Mood | null) => {
    if (!mood) {
      router.push("/home");
      return;
    }

    setGeneratingPlan(true);
    try {
      await generatePlanForMood(moodIdToApiValue(mood.id));
    } catch (err) {
      console.error("Failed to submit check-in / generate plan:", err);
    } finally {
      router.push("/home");
    }
  };

  const handleSkip = async () => {
    setSkipping(true);
    try {
      await submitCheckIn({ isSkipped: true });
    } catch (err) {
      console.error("Failed to submit check-in:", err);
    } finally {
      router.push("/home");
    }
  };

  if (isGeneratingPlan || isSkipping) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/90 backdrop-blur-sm">
        <LoderIcon className="h-10 w-10 animate-spin text-ink" />
        <p className="text-base font-bold text-ink">
          {isGeneratingPlan ? "Generating plan..." : "Just a moment..."}
        </p>
        <p className="text-sm text-muted">
          {isGeneratingPlan ? "Adjusting today's plan to your energy" : "Getting things ready"}
        </p>
      </div>
    );
  }

  return (
    <>
      <CheckInModal
        open={needsCheckIn}
        onClose={() => {}}
        name={name}
        mode="onboarding"
        onContinue={handleContinue}
        onSkip={handleSkip}
      />
      <SecondDayInfoModal
        open={isSecondDayPopupOpen}
        onClose={() => setSecondDayPopupOpen(false)}
      />
    </>
  );
}
