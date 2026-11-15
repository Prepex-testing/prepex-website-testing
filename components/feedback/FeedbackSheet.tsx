"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { PexoBubble } from "@/components/pexo/PexoBubble";
import { GhostButton } from "@/components/ui/GhostButton";
import { Modal } from "@/components/ui/Modal";
import { ApiError } from "@/lib/api/http";
import { sendFeedback, type FeedbackType } from "@/lib/api/feedback";
import { sayLocal } from "@/lib/onboardingV2/lines";
import { pexoSay } from "@/lib/pexo/store";

const TYPES: { id: FeedbackType; label: string }[] = [
  { id: "bug", label: "Report a bug" },
  { id: "idea", label: "Share an idea" },
  { id: "other", label: "Something else" },
];
const MAX_SHOT_BYTES = 15 * 1024 * 1024;

/** Pexo's line for the sheet: the student's own Pexo (language, rotation) when it is on, the library line otherwise. */
const line = (trigger: string) => pexoSay(trigger, {}, { silent: true }) ?? sayLocal(trigger);

/**
 * Launch step 2 (B1): Report a bug / Share an idea. Type, message and an optional screenshot; the screen, app version
 * and device are attached automatically, and nothing else about the student. Opened from Pexo's Ask sheet and Settings.
 */
export function FeedbackSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const route = usePathname() ?? "";
  const [type, setType] = useState<FeedbackType>("bug");
  const [message, setMessage] = useState("");
  const [shot, setShot] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const ok = message.trim().length >= 3;

  const close = () => {
    if (busy) return;
    setMessage("");
    setShot(null);
    setError(null);
    setSent(false);
    setType("bug");
    onClose();
  };

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await sendFeedback({ type, message: message.trim(), route, screenshot: shot });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That didn't send. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const prompt = line(sent ? "feedback.thanks" : "feedback.prompt");
  return (
    <Modal open={open} onClose={close} ariaLabel="Report a bug or share an idea">
      <div className="flex flex-col gap-4" data-testid="feedback-sheet">
        {prompt && <PexoBubble pick={prompt} testId={sent ? "feedback-thanks" : "feedback-prompt"} />}
        {sent ? (
          <GhostButton onClick={close} className="self-end">
            Close
          </GhostButton>
        ) : (
          <form
            method="post"
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (ok && !busy) void submit();
            }}
          >
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="What is it?">
              {TYPES.map((t) => (
                <button key={t.id} type="button" role="radio" aria-checked={type === t.id} onClick={() => setType(t.id)} className={`min-h-11 rounded-full border px-4 text-[13px] font-semibold ${type === t.id ? "border-ink bg-ink text-surface" : "border-border-strong text-ink"}`} data-testid={`feedback-type-${t.id}`}>
                  {t.label}
                </button>
              ))}
            </div>
            <label className="flex flex-col gap-1 text-[13px] font-semibold text-ink">
              {type === "bug" ? "What went wrong?" : type === "idea" ? "What's your idea?" : "Tell us"}
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={4000} rows={5} className="rounded-xl border border-input-border bg-surface p-3 text-[15px] text-ink outline-none focus:border-brand" data-testid="feedback-message" />
            </label>
            <label className="flex flex-col gap-1 text-[13px] font-semibold text-ink">
              Screenshot (optional)
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setError(f && f.size > MAX_SHOT_BYTES ? "That screenshot is over 15 MB." : null);
                  setShot(f && f.size <= MAX_SHOT_BYTES ? f : null);
                }}
                className="text-[13px] text-muted"
                data-testid="feedback-screenshot"
              />
            </label>
            <p className="text-[12px] text-muted">We attach the screen you were on, the app version and your device type, so we can find the problem. Nothing else.</p>
            {error && (
              <p role="alert" className="text-[13px] font-medium text-danger">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <GhostButton type="button" onClick={close}>
                Cancel
              </GhostButton>
              <button type="submit" disabled={!ok || busy} className="min-h-11 rounded-xl bg-[var(--cta)] px-5 text-[14px] font-bold text-white disabled:opacity-50" data-testid="feedback-send">
                {busy ? "Sending…" : "Send"}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
