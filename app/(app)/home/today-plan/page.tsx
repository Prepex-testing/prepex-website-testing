import { redirect } from "next/navigation";

/**
 * The full plan lives at /planner now. Old links (the session-complete screen, bookmarks) land there.
 * TODO(planner-v2): owner = home-session window. SessionCompleteModal and TaskRow's reorder link still point here; once
 * they link to /planner directly this file can go.
 */
export default function TodayPlanRedirect(): never {
  redirect("/planner");
}
