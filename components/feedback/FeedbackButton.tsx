"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { WhiteModal } from "@/components/ui/WhiteModal";
import { ApiError } from "@/lib/api/http";
import { getFeedbackConfig, sendFeedback } from "@/lib/api/pilotFeedback";
import { canCaptureScreen, captureScreen, fileToDataUrl } from "@/lib/feedback/screenshot";

/** The text limits the server enforces. */
export const MIN_CHARS = 3;
export const MAX_CHARS = 2000;

/**
 * The floating "Feedback" button (pilot). It asks the server whether it is on (`PILOT_FEEDBACK_BUTTON`) and shows
 * nothing at all when it is not, or when the answer cannot be had. Not shown in the immersive focus screens.
 */
export function FeedbackButton({ hidden = false }: { hidden?: boolean }) {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getFeedbackConfig().then(
      (res) => {
        if (!cancelled) setEnabled(res.data.enabled);
      },
      () => undefined, // no answer: no button
    );
    return () => {
      cancelled = true;
    };
  }, []);

  if (!enabled || hidden) return null;
  return (
    <>
      <button
        type="button"
        data-testid="feedback-button"
        onClick={() => setOpen(true)}
        className="fixed bottom-[calc(72px+env(safe-area-inset-bottom))] right-4 z-30 flex min-h-12 items-center gap-2 rounded-full border border-brand/15 bg-surface px-4 text-[14px] font-bold text-ink shadow-md hover:border-brand/40 lg:bottom-6 lg:right-6"
      >
        <span aria-hidden>💬</span> Feedback
      </button>
      <FeedbackModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

type Phase = "form" | "sending" | "thanks";

export function FeedbackModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const [text, setText] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [shotBusy, setShotBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("form");
  const fileRef = useRef<HTMLInputElement>(null);

  const trimmed = text.trim();
  const tooShort = trimmed.length < MIN_CHARS;

  function close() {
    onClose();
    // start fresh the next time (after a short pause so the thanks message is not flashed away)
    setTimeout(() => {
      setText("");
      setRating(null);
      setScreenshot(null);
      setError(null);
      setPhase("form");
    }, 200);
  }

  async function attach(work: () => Promise<string | null>) {
    setShotBusy(true);
    setError(null);
    try {
      const url = await work();
      if (url) setScreenshot(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't attach that screenshot.");
    } finally {
      setShotBusy(false);
    }
  }

  async function submit() {
    if (tooShort || phase === "sending") return;
    setPhase("sending");
    setError(null);
    try {
      await sendFeedback({ screen: pathname || "/", feedbackText: trimmed, ...(rating !== null ? { rating } : {}), ...(screenshot ? { screenshot } : {}) });
      setPhase("thanks");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send that. Please try again.");
      setPhase("form");
    }
  }

  return (
    <WhiteModal open={open} onClose={close} ariaLabel="Send feedback">
      {phase === "thanks" ? (
        <div className="flex flex-col items-center gap-4 text-center" data-testid="feedback-thanks">
          <p className="text-[22px] font-extrabold text-ink">Thank you! 🙏</p>
          <p className="text-[14px] text-muted">We read every message. It helps us make Prepex better for you.</p>
          <button type="button" data-testid="feedback-done" onClick={close} className="min-h-12 w-full rounded-lg border border-primary-button-border bg-cta px-4 text-[15px] font-semibold text-white hover:bg-[#E8623F]">
            Done
          </button>
        </div>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div>
            <h2 className="text-[22px] font-extrabold text-ink">Send feedback</h2>
            <p className="mt-1 text-[13px] text-muted">Something confusing, broken or missing? Tell us. We see which page you were on.</p>
          </div>

          <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-ink">
            <span>
              What happened? <span className="font-normal text-muted">(required)</span>
            </span>
            <textarea
              data-testid="feedback-text"
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
              rows={5}
              maxLength={MAX_CHARS}
              autoFocus
              className="min-h-28 rounded-lg border border-brand/25 bg-surface px-3 py-2 text-[15px] font-normal text-ink"
              placeholder="Type here…"
            />
            <span className="self-end text-[11px] font-normal text-muted">{trimmed.length} / {MAX_CHARS}</span>
          </label>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-[13px] font-semibold text-ink">
              How is Prepex for you? <span className="font-normal text-muted">(optional)</span>
            </legend>
            <div className="flex gap-1" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={rating === n}
                  aria-label={`${n} star${n === 1 ? "" : "s"}`}
                  data-testid={`feedback-star-${n}`}
                  onClick={() => setRating(rating === n ? null : n)}
                  className={`flex size-11 items-center justify-center rounded-lg text-[26px] leading-none ${rating !== null && n <= rating ? "text-[#F59E0B]" : "text-muted/50"}`}
                >
                  ★
                </button>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-semibold text-ink">
              Screenshot <span className="font-normal text-muted">(optional)</span>
            </p>
            {screenshot ? (
              <div className="flex items-center gap-3" data-testid="feedback-shot">
                {/* eslint-disable-next-line @next/next/no-img-element -- a local data URL the student just attached */}
                <img src={screenshot} alt="Your screenshot" className="h-20 w-auto rounded-lg border border-brand/15" />
                <button type="button" data-testid="feedback-shot-remove" onClick={() => setScreenshot(null)} className="min-h-11 rounded-lg px-3 text-[13px] font-semibold text-muted underline">
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button type="button" data-testid="feedback-attach" disabled={shotBusy} onClick={() => fileRef.current?.click()} className="min-h-11 rounded-lg border border-brand/20 px-3 text-[13px] font-semibold text-ink hover:bg-tint-strong disabled:opacity-50">
                  {shotBusy ? "Attaching…" : "Choose a picture"}
                </button>
                {typeof navigator !== "undefined" && canCaptureScreen() && (
                  <button type="button" data-testid="feedback-capture" disabled={shotBusy} onClick={() => void attach(() => captureScreen())} className="min-h-11 rounded-lg border border-brand/20 px-3 text-[13px] font-semibold text-ink hover:bg-tint-strong disabled:opacity-50">
                    Capture my screen
                  </button>
                )}
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              data-testid="feedback-file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void attach(() => fileToDataUrl(file));
              }}
            />
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-[12px] font-medium text-danger" data-testid="feedback-error">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={close} className="min-h-12 flex-1 rounded-lg border border-brand/20 px-4 text-[15px] font-semibold text-ink hover:bg-tint-strong">
              Cancel
            </button>
            <button
              type="submit"
              data-testid="feedback-send"
              disabled={tooShort || phase === "sending" || shotBusy}
              className="min-h-12 flex-1 rounded-lg border border-primary-button-border bg-cta px-4 text-[15px] font-semibold text-white hover:bg-[#E8623F] disabled:cursor-not-allowed disabled:border-primary-button-disabled-bg disabled:bg-primary-button-disabled-bg disabled:text-primary-button-disabled-text"
            >
              {phase === "sending" ? "Sending…" : "Send"}
            </button>
          </div>
        </form>
      )}
    </WhiteModal>
  );
}
