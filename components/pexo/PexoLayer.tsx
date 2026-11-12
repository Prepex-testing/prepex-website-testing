"use client";

import { PexoShareLayer } from "@/components/pexo/PexoShare";
import { claimPendingInvite } from "@/lib/pexo/invite";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { PexoBubble } from "@/components/pexo/PexoBubble";
import { dismissPexo, loadPexo, pexoFirstVisit, pexoMark, pexoReact, usePexo } from "@/lib/pexo/store";

/**
 * The screens with a first-visit bubble, by path. The longest prefix wins. The focus timer is not here: nothing speaks
 * on the timer's screen from the shell (the timer shows its own first-visit line).
 */
export const FIRST_VISIT_PATHS: [string, string][] = [
  ["/analytics/rank-gps", "rank_gps"],
  ["/home/leaderboard", "leaderboard"],
  ["/home/climb", "climb"],
  ["/home/resource-library", "library"],
  ["/home/backlog", "backlog"],
  ["/logs/revision", "revision"],
  ["/logs/backlog", "backlog"],
  ["/analytics", "analytics"],
  ["/notebooks", "notebooks"],
  ["/planner", "planner"],
  ["/profile", "profile"],
  ["/goals", "goals"],
  ["/logs", "logs"],
  ["/calendar", "calendar"],
  ["/syllabus", "syllabus"],
  ["/sessions", "sessions"],
  ["/timetable", "timetable"],
];

export function firstVisitScreen(pathname: string): string | null {
  const hit = FIRST_VISIT_PATHS.filter(([p]) => pathname === p || pathname.startsWith(`${p}/`)).sort((a, b) => b[0].length - a[0].length)[0];
  return hit ? hit[1] : null;
}

/** How long a reaction stays before it leaves on its own. First-visit and care bubbles stay until dismissed. */
export const REACTION_MS = 5200;

/**
 * Mounted once in the app shell. Loads Pexo's state (with the XP summary the shell already fetches) and shows the one
 * transient bubble: a reaction to something the student just did, or a first-visit hint. It floats over the page, so it
 * adds no layout shift, and it is never modal. Renders nothing when Pexo is off.
 */
export function PexoLayer({ muted = false }: { muted?: boolean }) {
  const { enabled, transient } = usePexo();
  const pathname = usePathname() ?? "";
  const search = useSearchParams();
  const welcome = pathname === "/goals" && search?.get("welcome") === "1";

  useEffect(() => {
    void loadPexo();
    // a friend's invite link opened before signing up: attributed once, whether or not Pexo is on
    void claimPendingInvite();
  }, []);

  // the first visit to a screen: its bubble once per student, recorded only when it is really shown
  useEffect(() => {
    if (!enabled || muted) return;
    // straight from onboarding into this week's goals: the last onboarding line instead of the plain first visit
    if (welcome && pexoMark("onb.goals", true)) {
      pexoFirstVisit("goals");
      pexoReact("onb.goals", {}, { kind: "first_visit" });
      return;
    }
    const screen = firstVisitScreen(pathname);
    if (!screen || !pexoFirstVisit(screen)) return;
    pexoReact(`first_visit.${screen}`, {}, { kind: "first_visit" });
  }, [enabled, muted, pathname, welcome]);

  useEffect(() => {
    if (!transient || transient.sticky) return;
    const t = setTimeout(() => dismissPexo(transient.key), REACTION_MS);
    return () => clearTimeout(t);
  }, [transient]);

  if (!enabled || muted) return null;
  // the day's share offer waits for the reaction bubble to go: one bubble at a time
  if (!transient) return <PexoShareLayer />;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(124px+env(safe-area-inset-bottom))] z-[65] flex justify-center px-3 lg:inset-x-auto lg:bottom-6 lg:right-24 lg:justify-end lg:px-0" data-testid="pexo-layer">
      <div key={transient.key} className="motion-toast pointer-events-auto w-full max-w-[400px]">
        <PexoBubble pick={transient.pick} actions={transient.actions} onDismiss={() => dismissPexo(transient.key)} floating testId="pexo-transient" />
      </div>
    </div>
  );
}
