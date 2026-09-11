"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { XIcon } from "@/components/ui/icons";
import { LeaveSessionModal } from "@/components/home/LeaveSessionModal";
import { updatePlannerTask } from "@/lib/api/planner";
import { isSessionChapterHref } from "@/lib/revision/resourceLinks";
import {
  getStoredElapsedSeconds,
  setStoredElapsedSeconds,
  clearStoredElapsedSeconds,
} from "@/lib/session/activeTask";
import {
  clearFocusResourceVisit,
  useFocusResourceVisit,
  type FocusResourceVisit,
} from "@/lib/session/focusResourceVisit";

// Like the revision banner: shown only in the resource library, the one place
// a focus session steps out to with its timer still running.
const LIBRARY_PATH = "/home/resource-library";
const SESSION_PATH = "/home/session";

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function FocusSessionBanner() {
  const pathname = usePathname();
  const visit = useFocusResourceVisit();
  const isLibraryPage = pathname === LIBRARY_PATH || pathname.startsWith(`${LIBRARY_PATH}/`);

  if (!visit || !isLibraryPage) return null;
  // Keyed so a different task's trip starts from its own stored seconds.
  return <ActiveFocusBanner key={visit.taskId} visit={visit} />;
}

function ActiveFocusBanner({ visit }: { visit: FocusResourceVisit }) {
  const router = useRouter();
  const [elapsed, setElapsed] = useState(() => getStoredElapsedSeconds(visit.taskId) ?? 0);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [isLeaveOpen, setLeaveOpen] = useState(false);
  const leftRef = useRef(false);

  // Same counting rules as the session page: it runs while the page is open,
  // unless the session was paused before stepping out.
  useEffect(() => {
    if (visit.paused) return;
    const timer = setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [visit.paused]);

  // Mirrored every tick, so returning to the session (or a refresh here)
  // picks up exactly where the timer is.
  useEffect(() => {
    if (leftRef.current) return;
    setStoredElapsedSeconds(visit.taskId, elapsed);
  }, [visit.taskId, elapsed]);

  // Only this chapter's resource page and the session itself are free to go
  // to; anything else asks first.
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest("a");
      const href = anchor?.getAttribute("href");
      if (!href || !href.startsWith("/")) return;
      if (new URL(href, window.location.origin).pathname === SESSION_PATH) return;
      if (isSessionChapterHref(href, visit.subjectName, visit.chapterName)) return;

      event.preventDefault();
      event.stopPropagation();
      setPendingHref(href);
      setLeaveOpen(true);
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [visit.subjectName, visit.chapterName]);

  const backToSession = () => {
    setLeaveOpen(false);
    router.push(`${SESSION_PATH}?taskId=${visit.taskId}`);
  };

  // Mirrors the session page's own "leave": progress saved, not completed.
  const leaveSession = () => {
    leftRef.current = true;
    updatePlannerTask(visit.taskId, {
      secondsCompleted: elapsed,
      status: "IN_PROGRESS",
      isStudyingCrossApp: false,
      ...visit.checklist,
    }).catch(() => {
      // Best-effort — the student still leaves the session.
    });
    clearStoredElapsedSeconds(visit.taskId);
    clearFocusResourceVisit();
    setLeaveOpen(false);
    router.push(pendingHref ?? "/home");
  };

  const targetSeconds = visit.targetSeconds;

  return (
    <>
      <div className="fixed top-4 left-1/2 z-40 w-[min(94vw,640px)] translate-x-[-50%] rounded-2xl border border-brand/10 bg-surface/95 py-3 pr-3 pl-5 shadow-modal backdrop-blur-sm lg:translate-x-[-35%]">
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="flex shrink-0 items-center justify-center p-1.5">
              <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                {!visit.paused && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#10B981] opacity-75" />
                )}
                <span
                  className={`relative inline-flex h-2.5 w-2.5 rounded-full ${visit.paused ? "bg-[#F59E0B]" : "bg-[#10B981] shadow-[0_0_10px_2px_rgba(16,185,129,0.5)]"}`}
                />
              </span>
            </span>
            <button type="button" onClick={backToSession} className="min-w-0 flex-1 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded border border-[#1A1A4E] bg-[#EEF0F8] px-2 py-0.5 text-[10px] font-extrabold uppercase leading-[15px] text-[#1A1A4E] dark:border-transparent dark:bg-[#242453] dark:text-white">
                  Focus Session{visit.paused ? " · Paused" : ""}
                </span>
                <span className="text-[11px] font-semibold text-muted">Tap to return to your session</span>
              </div>
              <p className="mt-1 truncate text-base font-bold text-ink">{visit.title}</p>
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-4">
            <div className="flex items-center gap-2 rounded-xl border border-brand/10 bg-background px-3 py-2">
              <span className="text-sm font-bold tabular-nums text-ink">
                {formatTime(elapsed)}
                {targetSeconds > 0 && <span className="text-muted">/{formatTime(targetSeconds)}</span>}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setPendingHref(null);
                setLeaveOpen(true);
              }}
              aria-label="Session options"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-tint-strong hover:text-ink"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <LeaveSessionModal
        open={isLeaveOpen}
        onClose={() => {
          setLeaveOpen(false);
          setPendingHref(null);
        }}
        onConfirm={leaveSession}
        onBackToSession={backToSession}
      />
    </>
  );
}
