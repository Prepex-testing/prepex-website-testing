import type { ReactNode } from "react";
import { ProfileSubpageHeader } from "@/components/profile/ProfileSubpageHeader";
import { StudyTabs } from "@/components/study/StudyTabs";

/**
 * The frame shared by the four Study tabs. One title ("Study") and the same tab strip on every tab; below 1024px it is
 * the single column the screens always had, from 1024px it widens to a 1280px container so the content can use two
 * columns instead of leaving half the screen empty.
 */
export function StudyShell({ current, testId, children }: { current: "/sessions" | "/mistakes" | "/logs"; testId?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 lg:mx-auto lg:w-full lg:max-w-[1280px] lg:p-8" data-testid={testId}>
      <ProfileSubpageHeader title="Study" backHref="/home" />
      <StudyTabs current={current} />
      {children}
    </div>
  );
}
