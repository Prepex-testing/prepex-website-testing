"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { XIcon } from "@/components/ui/icons";
import { useRevisionSession } from "@/components/session/RevisionSessionProvider";
import { RevisionSessionActionsModal } from "@/components/session/RevisionSessionActionsModal";
import { formatClock } from "@/lib/utils/datetime";

// The floating widget only appears here — while reviewing a resource is the
// one place a student is expected to step away from /revision-session and
// keep the timer visible/manageable. Any other navigation away from
// /revision-session is intercepted on that page itself and asks the student
// to Exit/Complete/Cancel instead of silently leaving the session running.
const BANNER_PATH = "/home/resource-library";

export function RevisionSessionBanner() {
  const pathname = usePathname();
  const router = useRouter();
  const { isActive, taskId, elapsedSeconds, targetDuration, taskTitle } = useRevisionSession();
  const [isActionsOpen, setActionsOpen] = useState(false);

  if (!isActive || pathname !== BANNER_PATH) return null;

  const handleResume = () => {
    if (!taskId) return;
    router.push(`/revision-session?taskId=${taskId}`);
  };

  return (
    <>
      <div className="fixed top-4 left-1/2 z-40 w-[min(94vw,640px)] translate-x-[-35%] rounded-2xl border border-brand/10 bg-surface/95 py-3 pr-3 pl-5 shadow-modal backdrop-blur-sm">
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="flex shrink-0 items-center justify-center p-1.5">
              <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#10B981] opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#10B981] shadow-[0_0_10px_2px_rgba(16,185,129,0.5)]" />
              </span>
            </span>
            <button type="button" onClick={handleResume} className="min-w-0 flex-1 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded border border-[#1A1A4E] bg-[#EEF0F8] px-2 py-0.5 text-[10px] font-extrabold uppercase leading-[15px] text-[#1A1A4E] dark:border-transparent dark:bg-[#242453] dark:text-white">
                  Revision
                </span>
              </div>
              <p className="mt-1 truncate text-base font-bold text-ink">{taskTitle || "Revision session"}</p>
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-4">
            <div className="flex items-center gap-2 rounded-xl border border-brand/10 bg-background px-3 py-2">
              <span className="text-sm font-bold text-ink">
                {formatClock(elapsedSeconds)}
                {targetDuration > 0 && <span className="text-muted">/{targetDuration}</span>}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActionsOpen(true)}
              aria-label="Session options"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-tint-strong hover:text-ink"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <RevisionSessionActionsModal open={isActionsOpen} onClose={() => setActionsOpen(false)} />
    </>
  );
}
