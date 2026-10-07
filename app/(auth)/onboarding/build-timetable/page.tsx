"use client";

import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/layout/AuthCard";
import { StepProgress } from "@/components/ui/StepProgress";
import { TimetableEditorScreen } from "@/components/timetable/TimetableEditorScreen";

const NEXT_STEP = "/onboarding/which-chapters-have-you-studied";

/**
 * Onboarding step 5 of 6 — "Build your week". Replaces the old timetable-photo
 * step as the way a student tells Prepex when they are free. Optional: a student
 * who skips still gets a suggested plan, and can build their week any time from
 * the Plan screen.
 */
export default function BuildTimetablePage() {
  const router = useRouter();

  return (
    <AuthCard>
      <StepProgress
        step={5}
        totalSteps={6}
        backHref="/onboarding/time-selection"
        showSkip
        onSkip={() => router.push(NEXT_STEP)}
      />

      <div className="mt-4 flex flex-col gap-3 sm:mt-5">
        <h1 className="text-[24px] font-extrabold leading-tight text-ink sm:text-[32px]">Build your week</h1>
        <p className="text-[14px] font-semibold leading-snug text-neutral-text sm:text-[16px]">
          Show Prepex when school, coaching, meals and sleep happen. Your study blocks are where it plans your
          tasks — on top of your real life, not instead of it.
        </p>
      </div>

      <div className="mt-5">
        <TimetableEditorScreen onSaved={() => router.push(NEXT_STEP)} saveLabel="Save & continue" />
      </div>
    </AuthCard>
  );
}
