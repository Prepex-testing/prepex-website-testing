"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProfileSubpageHeader } from "@/components/profile/ProfileSubpageHeader";
import { TimetableEditorScreen } from "@/components/timetable/TimetableEditorScreen";
import { PageLoader } from "@/components/ui/PageLoader";

/** Where the editor was opened from, so Save and Back return there. */
const RETURN_TO: Record<string, string> = { planner: "/planner", profile: "/profile" };

function TimetableScreen() {
  const router = useRouter();
  const from = useSearchParams().get("from") ?? "";
  const back = RETURN_TO[from] ?? "/plan";

  return (
    <div className="flex flex-col gap-4 p-4 sm:gap-5 sm:p-6 lg:p-8">
      <ProfileSubpageHeader title="Your weekly timetable" backHref={back} />
      <p className="text-[14px] leading-snug text-body-text dark:text-ink/80">
        Tap an activity, then drag on the grid. Prepex plans your daily tasks into the self-study, practice and
        revision blocks. Saving rebuilds the rest of today and the days ahead; finished tasks and past days stay as they are.
      </p>
      <TimetableEditorScreen onSaved={() => router.push(back)} saveLabel="Save timetable" />
    </div>
  );
}

/** In-app timetable editor: reached from the Planner, the Profile and the planner warnings. */
export default function TimetablePage() {
  return (
    <Suspense fallback={<PageLoader label="Loading your timetable…" />}>
      <TimetableScreen />
    </Suspense>
  );
}
