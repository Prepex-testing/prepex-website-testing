"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "@/components/theme/ThemeProvider";
import { ClockIcon } from "@/components/ui/icons";
import { useBeginPageTransition } from "@/components/layout/PageTransition";
import { useRevisionSession } from "@/components/session/RevisionSessionProvider";
import { formatClock } from "@/lib/utils/datetime";
import { markRevisionDone } from "@/lib/api/revision";

export function RevisionSessionBanner() {
  const pathname = usePathname();
  const router = useRouter();
  const beginExit = useBeginPageTransition();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const {
    isActive,
    taskId,
    elapsedSeconds,
    targetDuration,
    taskTitle,
    subjectName,
    exitSession,
    clearSession,
  } = useRevisionSession();
  const [isCompleting, setCompleting] = useState(false);

  if (!isActive || pathname === "/revision-session") return null;

  const handleExit = async () => {
    await exitSession();
  };

  const handleComplete = async () => {
    if (!taskId) return;
    setCompleting(true);
    try {
      await markRevisionDone(taskId, elapsedSeconds);
    } catch {
      // Best-effort — still let the student proceed to the completion screen.
    } finally {
      clearSession();
      setCompleting(false);
      beginExit();
      router.push(`/revision-session/complete?taskId=${taskId}`);
    }
  };

  const handleResume = () => {
    if (!taskId) return;
    beginExit();
    router.push(`/revision-session?taskId=${taskId}`);
  };

  return (
    <div className="sticky top-0 z-40 border-b border-brand/10 bg-surface/95 px-4 py-3 backdrop-blur-sm sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1213px] flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={handleResume} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            {subjectName && (
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-extrabold uppercase leading-[15px] ${
                  isDark ? "bg-white text-[#1A1A4E]" : "bg-tint text-ink"
                }`}
              >
                {subjectName}
              </span>
            )}
            <span className="rounded border border-[#1A1A4E] bg-[#EEF0F8] px-2 py-0.5 text-[10px] font-extrabold uppercase leading-[15px] text-[#1A1A4E] dark:border-transparent dark:bg-[#242453] dark:text-white">
              Revision
            </span>
          </div>
          <p className="mt-1 truncate text-base font-bold text-ink">{taskTitle || "Revision session"}</p>
        </button>

        <div className="flex shrink-0 items-center gap-4">
          <div className="flex items-center gap-2 rounded-xl border border-brand/10 bg-background px-3 py-2">
            <ClockIcon />
            <span className="text-sm font-bold text-ink">
              {formatClock(elapsedSeconds)}
              {targetDuration > 0 && <span className="text-muted">/{targetDuration}</span>}
            </span>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <button
              type="button"
              onClick={handleExit}
              className="text-sm font-semibold text-muted transition-colors hover:text-ink"
            >
              Exit Session
            </button>
            <button
              type="button"
              onClick={handleComplete}
              disabled={isCompleting}
              className="flex h-9 items-center justify-center rounded-lg bg-cta px-4 text-sm font-bold text-white transition-colors hover:bg-[#E8623F] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCompleting ? "Completing..." : "Complete Session"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
