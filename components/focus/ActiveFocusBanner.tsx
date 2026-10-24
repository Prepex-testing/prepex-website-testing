"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getActiveFocusSession } from "@/lib/api/focus";
import { FOCUS_START_PATH, focusSessionHref } from "@/lib/focus/startFocusSession";

/**
 * A focus session is running and the student has left the timer (minimised it, or opened another tab's page). One quiet
 * strip says so and takes them back. The timer itself is the only place a session is controlled.
 */
export function ActiveFocusBanner() {
  const pathname = usePathname();
  const [running, setRunning] = useState(false);
  const onTimer = pathname === FOCUS_START_PATH;

  useEffect(() => {
    if (onTimer) return;
    let alive = true;
    getActiveFocusSession()
      .then((res) => alive && setRunning(res.data.session !== null))
      .catch(() => alive && setRunning(false));
    return () => {
      alive = false;
    };
  }, [pathname, onTimer]);

  if (onTimer || !running) return null;
  return (
    <div role="status" data-testid="active-focus-banner" className="flex items-center justify-between gap-3 border-b border-brand/10 bg-tint-strong px-4 py-2 text-[13px] font-semibold text-ink dark:bg-[#FAF7F214]">
      <span>A focus session is running.</span>
      <Link href={focusSessionHref({ originSource: "standalone" })} className="flex min-h-11 items-center rounded-lg px-3 font-bold underline-offset-2 hover:underline">
        Back to the timer
      </Link>
    </div>
  );
}
