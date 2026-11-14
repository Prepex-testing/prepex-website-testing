"use client";

import { useEffect, useRef, useState } from "react";
import type { SubmitEvent } from "react";
import { GoogleIcon, MailIcon } from "@/components/ui/icons";
import { ApiError, googleSaveUrl, requestEmailCode, saveGuestWithEmailCode, verifyEmailCode } from "@/lib/api/auth";
import { clearRequestCache } from "@/lib/api/authRequest";
import { saveSession } from "@/lib/auth/session";
import { useAuthFlags } from "@/lib/onboardingV2/flags";
import { markGuestSaved } from "@/lib/onboardingV2/guest";

type Step = { kind: "choose" } | { kind: "email" } | { kind: "code"; email: string; name: string } | { kind: "taken"; email: string; code: string };

/**
 * Onboarding v2, Part D (D3): a guest saves their account. Google or an e-mailed code; either way it is the SAME
 * account (same id, every step, streak and plan kept). If the address already has a Prepex account, nothing is merged:
 * the student can sign in to that account instead, and the guest progress stays on this device until it expires.
 */
export function SaveAccountSheet({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { flags } = useAuthFlags();
  const [step, setStep] = useState<Step>({ kind: "choose" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => panel.current?.focus(), [step.kind]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const fail = (err: unknown) => setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");

  const google = async () => {
    setError(null);
    setBusy(true);
    try {
      window.location.href = await googleSaveUrl();
    } catch (err) {
      fail(err);
      setBusy(false);
    }
  };

  const sendCode = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const name = String(form.get("name") ?? "").trim();
    setError(null);
    setBusy(true);
    try {
      await requestEmailCode(email);
      setStep({ kind: "code", email, name });
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const verify = async (code: string) => {
    if (step.kind !== "code" || busy) return;
    setError(null);
    setBusy(true);
    try {
      const { data } = await saveGuestWithEmailCode({ email: step.email, code, ...(step.name ? { fullName: step.name } : {}) });
      saveSession(data.tokens, data.user);
      clearRequestCache();
      markGuestSaved(data.user.id);
      onSaved();
    } catch (err) {
      if (err instanceof ApiError && err.code === "email_taken") setStep({ kind: "taken", email: step.email, code });
      else fail(err);
    } finally {
      setBusy(false);
    }
  };

  const signInInstead = async () => {
    if (step.kind !== "taken") return;
    setBusy(true);
    try {
      const { data } = await verifyEmailCode({ email: step.email, code: step.code });
      saveSession(data.tokens, data.user);
      clearRequestCache();
      window.location.assign("/home");
    } catch (err) {
      fail(err);
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 sm:items-center sm:px-6" role="dialog" aria-modal="true" aria-labelledby="save-title" data-testid="save-sheet">
      <div ref={panel} tabIndex={-1} className="flex w-full max-w-[460px] flex-col gap-4 rounded-t-2xl bg-background p-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] shadow-modal outline-none sm:rounded-2xl sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="save-title" className="text-[20px] font-extrabold text-ink">
              Save your account
            </h2>
            <p className="mt-1 text-[14px] text-muted">Keep every step, streak and plan, on any device.</p>
          </div>
          <button type="button" onClick={onClose} className="min-h-11 px-2 text-[14px] font-semibold text-muted" aria-label="Close">
            Close
          </button>
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-[13px] font-medium text-danger" data-testid="save-error">
            {error}
          </p>
        )}

        {step.kind === "choose" && (
          <div className="flex flex-col gap-3">
            {flags.googleSignIn !== false && (
              <button type="button" disabled={busy} onClick={() => void google()} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--cta)] px-4 text-[15px] font-bold text-white disabled:opacity-60" data-testid="save-google">
                <GoogleIcon />
                Save with Google
              </button>
            )}
            <button type="button" onClick={() => setStep({ kind: "email" })} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border-subtle bg-surface px-4 text-[15px] font-bold text-ink" data-testid="save-email">
              <MailIcon />
              Save with email
            </button>
          </div>
        )}

        {step.kind === "email" && (
          <form onSubmit={sendCode} className="flex flex-col gap-3" data-testid="save-email-form">
            <label className="flex flex-col gap-1 text-[14px] font-semibold text-ink">
              Your name
              <input name="name" autoComplete="name" maxLength={60} className="min-h-12 rounded-xl border border-border-subtle bg-surface px-3 text-[16px] text-ink" placeholder="Rohan Sharma" data-testid="save-name" />
            </label>
            <label className="flex flex-col gap-1 text-[14px] font-semibold text-ink">
              Email address
              <input name="email" type="email" required autoComplete="email" className="min-h-12 rounded-xl border border-border-subtle bg-surface px-3 text-[16px] text-ink" placeholder="Rohan@example.com" data-testid="save-address" />
            </label>
            <button type="submit" disabled={busy} className="min-h-12 rounded-xl bg-[var(--cta)] px-4 text-[15px] font-bold text-white disabled:opacity-60" data-testid="save-send-code">
              {busy ? "Sending..." : "Send code"}
            </button>
            <button type="button" onClick={() => setStep({ kind: "choose" })} className="min-h-11 text-[14px] font-semibold text-muted underline">
              Back
            </button>
          </form>
        )}

        {step.kind === "code" && <CodeEntry email={step.email} busy={busy} onCode={(c) => void verify(c)} onResend={() => requestEmailCode(step.email).then(() => undefined)} />}

        {step.kind === "taken" && (
          <div className="flex flex-col gap-3" data-testid="save-taken">
            <p className="text-[14px] leading-relaxed text-ink">
              <b>{step.email}</b> already has a Prepex account. You can sign in to it, but your guest progress will not move into it. It stays on this device until it expires.
            </p>
            <button type="button" disabled={busy} onClick={() => void signInInstead()} className="min-h-12 rounded-xl bg-[var(--cta)] px-4 text-[15px] font-bold text-white disabled:opacity-60" data-testid="save-sign-in-instead">
              Sign in to that account
            </button>
            <button type="button" onClick={() => setStep({ kind: "email" })} className="min-h-11 text-[14px] font-semibold text-muted underline">
              Use a different email
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CodeEntry({ email, busy, onCode, onResend }: { email: string; busy: boolean; onCode: (code: string) => void; onResend: () => Promise<void> }) {
  const [code, setCode] = useState("");
  const [wait, setWait] = useState(45);
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[14px] text-muted">
        We sent a 6-digit code to <b className="text-ink">{email}</b>.
      </p>
      <input
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={code}
        aria-label="6-digit code"
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, "").slice(0, 6);
          setCode(v);
          if (v.length === 6) onCode(v);
        }}
        className="min-h-14 rounded-xl border border-border-subtle bg-surface px-4 text-center text-[26px] font-bold tracking-[0.4em] text-ink"
        data-testid="save-code"
      />
      <button type="button" disabled={busy || code.length !== 6} onClick={() => onCode(code)} className="min-h-12 rounded-xl bg-[var(--cta)] px-4 text-[15px] font-bold text-white disabled:opacity-60" data-testid="save-verify">
        {busy ? "Saving..." : "Save my account"}
      </button>
      <p className="text-center text-[13px] text-muted">
        {wait > 0 ? (
          `Resend in ${wait}s`
        ) : (
          <button type="button" className="font-semibold text-ink underline" onClick={() => void onResend().then(() => setWait(45))}>
            Resend the code
          </button>
        )}
      </p>
    </div>
  );
}
