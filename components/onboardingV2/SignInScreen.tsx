"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SubmitEvent } from "react";
import { PexoSpeaks } from "@/components/onboardingV2/PexoSpeaks";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { GoogleIcon, MailIcon } from "@/components/ui/icons";
import { ApiError, getGoogleAuthUrl, requestEmailCode, verifyEmailCode } from "@/lib/api/auth";
import { markAccountRestored } from "@/lib/auth/accountRestored";
import { resolveAuthedLanding } from "@/lib/auth/onboardingGate";
import { saveSession } from "@/lib/auth/session";
import { useAuthFlags } from "@/lib/onboardingV2/flags";
import { sayLocal } from "@/lib/onboardingV2/lines";

type Stage = { kind: "choose" } | { kind: "email" } | { kind: "code"; email: string };

/**
 * Onboarding v2, Part B: the first screen. Pexo waves; the student picks Google, an e-mailed code (no password), or
 * (only when guest mode is on) trying Prepex first. "Log in with password" keeps every existing login working.
 */
export function SignInScreen() {
  const router = useRouter();
  const { flags } = useAuthFlags();
  const [stage, setStage] = useState<Stage>({ kind: "choose" });
  const hello = useMemo(() => sayLocal("onb.signin"), []);
  const guestNote = useMemo(() => sayLocal("onb.signin.guest_note"), []);
  // a Google attempt that came back here explains itself (the server redirects with ?error=)
  const [googleError, setGoogleError] = useState<string | null>(null);
  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get("error");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once from the address
    if (reason === "google_unavailable") setGoogleError("Google sign-in isn't available right now. Continue with email instead.");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once from the address
    else if (reason === "google_failed") setGoogleError("Google sign-in didn't finish. Please try again, or continue with email.");
  }, []);

  const signedIn = async (data: Awaited<ReturnType<typeof verifyEmailCode>>["data"]) => {
    saveSession(data.tokens, data.user);
    if (data.restored) markAccountRestored();
    router.push(await resolveAuthedLanding());
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col items-center justify-center gap-8 px-4 py-10" data-testid="signin-v2">
      <PexoSpeaks pick={stage.kind === "choose" ? hello : null} />
      {stage.kind === "choose" && (
        <div className="flex w-full flex-col gap-3">
          {googleError && (
            <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-[13px] font-medium text-danger" data-testid="signin-google-error">
              {googleError}
            </p>
          )}
          {flags.googleSignIn !== false && (
            <Button type="button" variant="primary" className="min-h-12" onClick={() => (window.location.href = getGoogleAuthUrl())} data-testid="signin-google">
              <GoogleIcon />
              Continue with Google
            </Button>
          )}
          <Button type="button" variant="secondary" className="min-h-12" onClick={() => setStage({ kind: "email" })} data-testid="signin-email">
            <MailIcon />
            Continue with email
          </Button>
          {flags.guestMode && (
            <div className="mt-2 flex flex-col items-center gap-2 text-center">
              {guestNote && <p className="text-[14px] text-muted" data-testid="signin-guest-note">{guestNote.text}</p>}
              <Link href="/start/guest" className="flex min-h-12 w-full items-center justify-center rounded-xl border border-dashed border-border-subtle bg-transparent px-4 text-[15px] font-bold text-ink transition hover:border-brand" data-testid="signin-guest">
                Try Prepex first
              </Link>
            </div>
          )}
          <Link href="/login?password=1" className="mt-4 self-center text-[13px] font-semibold text-muted underline" data-testid="signin-password">
            Log in with password
          </Link>
          <p className="mt-2 text-center text-[12px] leading-relaxed text-muted" data-testid="signin-legal">
            By continuing, you agree to our{" "}
            <Link href="/terms" className="underline">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      )}
      {stage.kind === "email" && <EmailStep onBack={() => setStage({ kind: "choose" })} onSent={(email) => setStage({ kind: "code", email })} />}
      {stage.kind === "code" && <CodeStep email={stage.email} onBack={() => setStage({ kind: "email" })} onSignedIn={signedIn} />}
    </main>
  );
}

function messageOf(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return "Something went wrong. Please try again.";
}

function EmailStep({ onBack, onSent }: { onBack: () => void; onSent: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await requestEmailCode(email.trim());
      onSent(email.trim().toLowerCase());
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="flex w-full flex-col gap-4" data-testid="signin-email-form">
      <h1 className="text-center text-[22px] font-bold text-ink">Your email</h1>
      <p className="-mt-2 text-center text-[14px] text-muted">We&apos;ll send you a 6-digit code. No password needed.</p>
      {error && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-[13px] font-medium text-danger">
          {error}
        </p>
      )}
      <Input label="Email Address" icon={<MailIcon />} name="email" type="email" autoComplete="email" placeholder="Rohan@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <Button type="submit" variant="primary" disabled={busy} className="min-h-12 disabled:opacity-60" data-testid="signin-send-code">
        {busy ? "Sending..." : "Send code"}
      </Button>
      <button type="button" onClick={onBack} className="min-h-11 text-[14px] font-semibold text-muted underline">
        Back
      </button>
    </form>
  );
}

function CodeStep({ email, onBack, onSignedIn }: { email: string; onBack: () => void; onSignedIn: (data: Awaited<ReturnType<typeof verifyEmailCode>>["data"]) => Promise<void> }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(45);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => input.current?.focus(), []);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const verify = async (value: string) => {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const { data } = await verifyEmailCode({ email, code: value });
      await onSignedIn(data);
    } catch (err) {
      setError(messageOf(err));
      setBusy(false);
    }
  };

  const resend = async () => {
    setError(null);
    setNotice(null);
    try {
      const { data } = await requestEmailCode(email);
      setCooldown(data.cooldownSeconds);
      setNotice("A new code is on its way.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 429 && err.retryAfterMs) setCooldown(Math.ceil(err.retryAfterMs / 1000));
      setError(messageOf(err));
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void verify(code);
      }}
      className="flex w-full flex-col gap-4"
      data-testid="signin-code-form"
    >
      <h1 className="text-center text-[22px] font-bold text-ink">Check your email</h1>
      <p className="-mt-2 text-center text-[14px] text-muted">
        We sent a 6-digit code to <b className="font-semibold text-ink">{email}</b>.
      </p>
      {error && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-[13px] font-medium text-danger" data-testid="signin-code-error">
          {error}
        </p>
      )}
      {notice && !error && (
        <p role="status" className="text-center text-[13px] text-muted">
          {notice}
        </p>
      )}
      <label className="flex flex-col gap-2 text-[14px] font-semibold text-ink">
        6-digit code
        <input
          ref={input}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          value={code}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(0, 6);
            setCode(v);
            if (v.length === 6) void verify(v);
          }}
          className="min-h-14 rounded-xl border border-border-subtle bg-surface px-4 text-center text-[26px] font-bold tracking-[0.4em] text-ink focus:border-brand focus:outline-none"
          data-testid="signin-code"
          aria-describedby="signin-code-help"
        />
      </label>
      <Button type="submit" variant="primary" disabled={busy || code.length !== 6} className="min-h-12 disabled:opacity-60" data-testid="signin-verify">
        {busy ? "Checking..." : "Continue"}
      </Button>
      <p id="signin-code-help" className="text-center text-[13px] text-muted">
        Didn&apos;t get it? Check spam, or{" "}
        {cooldown > 0 ? (
          <span data-testid="signin-resend-wait">resend in {cooldown}s</span>
        ) : (
          <button type="button" onClick={() => void resend()} className="font-semibold text-ink underline" data-testid="signin-resend">
            resend the code
          </button>
        )}
        .
      </p>
      <button type="button" onClick={onBack} className="min-h-11 text-[14px] font-semibold text-muted underline">
        Use a different email
      </button>
    </form>
  );
}
