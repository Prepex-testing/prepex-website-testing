"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ApiError } from "@/lib/api/http";
import { confirmAccountDeletion, sendDeletionCode, type DeletionSchedule } from "@/lib/api/dataRights";

export const DELETION_GRACE_DAYS = 7;

/**
 * Launch step 2 (A3): Delete my account. The student types DELETE and, for an account with an e-mail, enters the code
 * we e-mail. The account is then scheduled: signing in within 7 days undoes it; after that everything is deleted.
 */
export function DeleteAccountModal({ open, onClose, needsCode, onDeleted }: { open: boolean; onClose: () => void; needsCode: boolean; onDeleted: (s: DeletionSchedule) => void }) {
  const [typed, setTyped] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wordOk = typed.trim() === "DELETE";
  const codeOk = !needsCode || /^\d{6}$/.test(code);

  const close = () => {
    if (busy) return;
    setTyped("");
    setCode("");
    setCodeSent(false);
    setError(null);
    onClose();
  };

  async function sendCode() {
    setBusy(true);
    setError(null);
    try {
      await sendDeletionCode();
      setCodeSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "We couldn't send the code. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      onDeleted(await confirmAccountDeletion(needsCode ? code : undefined));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't delete your account. Please try again.");
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={close} ariaLabel="Delete account">
      <form
        method="post"
        className="flex flex-col gap-4 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (wordOk && codeOk && !busy) void confirm();
        }}
      >
        <h2 className="text-[18px] font-bold text-ink">Delete your account?</h2>
        <p className="text-[14px] text-muted">
          You&apos;ll be signed out everywhere. Sign in again within {DELETION_GRACE_DAYS} days to change your mind. After that, your account, study logs, notebooks and
          everything else are deleted for good. You can download your data first from Your data.
        </p>

        <label className="flex flex-col gap-1 text-[13px] font-semibold text-ink">
          Type DELETE to confirm
          <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoCapitalize="characters" className="min-h-11 rounded-lg border border-input-border bg-surface px-3 text-[16px] text-ink outline-none focus:border-brand" data-testid="delete-typed" />
        </label>

        {needsCode && (
          <div className="flex flex-col gap-2">
            {codeSent ? (
              <label className="flex flex-col gap-1 text-[13px] font-semibold text-ink">
                The 6-digit code we e-mailed you
                <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" className="min-h-11 rounded-lg border border-input-border bg-surface px-3 text-[16px] tracking-[0.3em] text-ink outline-none focus:border-brand" data-testid="delete-code" />
              </label>
            ) : (
              <p className="text-[13px] text-muted">To make sure it&apos;s you, we&apos;ll e-mail you a code.</p>
            )}
            <button type="button" disabled={busy} onClick={() => void sendCode()} className="self-start text-[13px] font-semibold text-ink underline disabled:opacity-50" data-testid="delete-send-code">
              {codeSent ? "Send a new code" : "E-mail me a code"}
            </button>
          </div>
        )}

        {error && (
          <p role="alert" className="text-[13px] font-medium text-danger">
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={close} disabled={busy} className="min-h-11 rounded-lg px-4 text-[14px] font-semibold text-ink">
            Keep my account
          </button>
          <button type="submit" disabled={!wordOk || !codeOk || (needsCode && !codeSent) || busy} className="min-h-11 rounded-lg border border-danger px-4 text-[14px] font-bold text-danger disabled:opacity-40" data-testid="delete-confirm">
            {busy ? "Deleting…" : "Delete my account"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
