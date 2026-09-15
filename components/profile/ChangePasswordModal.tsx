"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { WhiteModal } from "@/components/ui/WhiteModal";
import { Input } from "@/components/ui/Input";
import { CheckCircleIcon, XIcon } from "@/components/ui/icons";
import { ApiError } from "@/lib/api/http";
import { changePassword, passwordProblem } from "@/lib/api/account";
import { saveTokens } from "@/lib/auth/session";

type ChangePasswordModalProps = {
  open: boolean;
  onClose: () => void;
};

export function ChangePasswordModal({ open, onClose }: ChangePasswordModalProps) {
  return (
    <WhiteModal open={open} onClose={onClose} ariaLabel="Change password">
      {/* Unmounted while closed, so fields never survive a cancel. */}
      <ChangePasswordForm onClose={onClose} />
    </WhiteModal>
  );
}

function ChangePasswordForm({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [changed, setChanged] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!currentPassword) return setError("Enter your current password.");
    const problem = passwordProblem(newPassword);
    if (problem) return setError(`New password: ${problem}`);
    if (newPassword === currentPassword) return setError("New password must differ from the current one.");
    if (newPassword !== confirmPassword) return setError("The new passwords don't match.");

    setSaving(true);
    setError(null);
    try {
      const { data } = await changePassword({ currentPassword, newPassword });
      // auth-service revokes every refresh token on a password change and
      // issues this session a replacement pair — store it and the student
      // stays signed in here, with no trip back through login.
      saveTokens(data.tokens);
      setChanged(true);
      setSaving(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't change your password. Please try again.");
      setSaving(false);
    }
  };

  if (changed) {
    return (
      <div className="flex flex-col items-center py-2 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success-bg text-success">
          <CheckCircleIcon className="h-7 w-7" />
        </span>
        <h2 className="mt-4 text-base font-bold text-ink">Password changed successfully</h2>
        <p className="mt-2 text-xs text-muted">
          You&apos;re still signed in here. Use your new password next time you sign in.
        </p>
        <Button variant="primary" size="sm" className="mt-6 w-full" onClick={onClose}>
          Done
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-ink">Change Password</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-tint-strong"
        >
          <XIcon />
        </button>
      </div>

      <p className="mt-2 text-xs text-muted">
        You&apos;ll stay signed in on this device. Any other device will be signed out.
      </p>

      <div className="mt-5 flex flex-col gap-4">
        <Input
          label="Current Password"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
        <Input
          label="New Password"
          type="password"
          autoComplete="new-password"
          helperText="At least 8 characters, with an uppercase letter and a number."
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <Input
          label="Confirm New Password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm font-medium text-danger">
          {error}
        </p>
      )}

      <div className="mt-6 flex items-center gap-3">
        <Button variant="secondary" size="sm" className="flex-1" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" className="flex-1" onClick={handleSubmit} disabled={saving}>
          {saving ? "Updating…" : "Update Password"}
        </Button>
      </div>
    </>
  );
}
