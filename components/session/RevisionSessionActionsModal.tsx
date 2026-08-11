"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WhiteModal } from "@/components/ui/WhiteModal";
import { Button } from "@/components/ui/Button";
import { CheckIcon, LogoutIcon } from "@/components/ui/icons";
import { useRevisionSession } from "@/components/session/RevisionSessionProvider";
import { markRevisionDone } from "@/lib/api/revision";

type RevisionSessionActionsModalProps = {
  open: boolean;
  onClose: () => void;
  /** Called after Exit Session finishes — e.g. to continue a navigation that was paused to show this popup. */
  onExited?: () => void;
};

/** Shared by RevisionSessionBanner and the /revision-session page itself, so
 * "what do you want to do with this session" always looks and behaves the same. */
export function RevisionSessionActionsModal({ open, onClose, onExited }: RevisionSessionActionsModalProps) {
  const router = useRouter();
  const { taskId, elapsedSeconds, taskTitle, exitSession, clearSession } = useRevisionSession();
  const [isCompleting, setCompleting] = useState(false);
  const [isExiting, setExiting] = useState(false);

  const handleExit = async () => {
    setExiting(true);
    try {
      await exitSession();
    } finally {
      setExiting(false);
      onClose();
      onExited?.();
    }
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
      onClose();
      router.push(`/revision-session/complete?taskId=${taskId}`);
    }
  };

  return (
    <WhiteModal open={open} onClose={onClose} ariaLabel="Session options">
      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="text-h2 text-ink">{taskTitle || "Revision session"}</h2>
        <p className="text-sm text-muted">What would you like to do with this session?</p>
      </div>
      <div className="mt-6 flex flex-col gap-2">
        <Button
          variant="primary"
          className="gap-2"
          onClick={handleComplete}
          disabled={isCompleting || isExiting}
        >
          <CheckIcon className="h-4 w-4 shrink-0" />
          {isCompleting ? "Completing..." : "Complete Session"}
        </Button>
        <Button
          variant="secondary"
          className="gap-2 border-danger! text-danger! hover:bg-danger-bg!"
          onClick={handleExit}
          disabled={isExiting || isCompleting}
        >
          <LogoutIcon />
          {isExiting ? "Exiting..." : "Exit Session"}
        </Button>
      </div>

      <button
        type="button"
        onClick={onClose}
        disabled={isExiting || isCompleting}
        className="mt-3 w-full text-center text-sm font-semibold text-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
      >
        Cancel
      </button>
    </WhiteModal>
  );
}
