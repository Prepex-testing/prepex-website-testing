"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { WhiteModal } from "@/components/ui/WhiteModal";
import { Input } from "@/components/ui/Input";
import { XIcon } from "@/components/ui/icons";
import { ApiError } from "@/lib/api/http";
import { changePassword, passwordProblem } from "@/lib/api/account";
import { clearSession } from "@/lib/auth/session";

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
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
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
      await changePassword({ currentPassword, newPassword });
      // auth-service revokes every refresh token on a password change, so
      // this session would die at its next refresh anyway — end it now and
      // send them to sign in with the new password.
      clearSession();
      router.replace("/login?passwordChanged=1");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't change your password. Please try again.");
      setSaving(false);
    }
  };

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
        You&apos;ll be signed out everywhere and asked to sign in again with the new password.
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
