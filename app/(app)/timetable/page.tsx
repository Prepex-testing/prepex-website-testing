"use client";

import { useRouter } from "next/navigation";
import { ProfileSubpageHeader } from "@/components/profile/ProfileSubpageHeader";
import { TimetableEditorScreen } from "@/components/timetable/TimetableEditorScreen";

/** In-app timetable editor — reached from the Plan screen and the weekly-goals screen. */
export default function TimetablePage() {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-4 p-4 sm:gap-5 sm:p-6 lg:p-8">
      <ProfileSubpageHeader title="Your weekly timetable" backHref="/plan" />
      <p className="text-[14px] leading-snug text-body-text dark:text-ink/80">
        Tap an activity, then drag on the grid. Prepex plans your daily tasks into the self-study, practice and
        revision blocks.
      </p>
      <TimetableEditorScreen onSaved={() => router.push("/plan")} saveLabel="Save timetable" />
    </div>
  );
}
