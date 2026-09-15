"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { PageLoader } from "@/components/ui/PageLoader";
import { ChangePasswordModal } from "@/components/profile/ChangePasswordModal";
import { ApiError } from "@/lib/api/http";
import { deleteAccount, getAccountDetails, type AccountDetails } from "@/lib/api/account";
import { clearSession } from "@/lib/auth/session";
import {
  // UserIcon,
  // MailIcon,
  // LockIcon,
  // LinkIcon,
  // DownloadIcon,
  // TrashIcon,
  GoogleIcon,
} from "@/components/ui/icons";
import { ProfileSubpageHeader } from "@/components/profile/ProfileSubpageHeader";
import {UserIcons,EmailIcon,LockIcon,LinkIcon,TrashIcon, ConfirmIcon} from "@/assets/icons";


/**
 * Card icon tile — 40×40, 8px radius, holding a 24×24 icon frame drawn with a
 * 2px line (Figma) from sm; a 36px tile with a 20px icon on phones. The line is
 * forced because the source SVGs were drawn on 16–24px grids at 1.33–2.23px.
 */
const ICON_FRAME =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10 [&_svg]:h-5 [&_svg]:w-5 [&_svg]:shrink-0 sm:[&_svg]:h-6 sm:[&_svg]:w-6 **:stroke-2 **:[vector-effect:non-scaling-stroke]";
const ICON_TILE = `${ICON_FRAME} bg-tint-strong text-ink dark:bg-ink/8`;

export default function AccountSettingsPage() {
  const router = useRouter();
  const [account, setAccount] = useState<AccountDetails | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [isPasswordOpen, setPasswordOpen] = useState(false);
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getAccountDetails()
      .then(({ data }) => {
        if (!controller.signal.aborted) setAccount(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadError(true);
      });
    return () => controller.abort();
  }, []);

  // Only email-and-password accounts have a password to change; a Google or
  // Apple sign-in has none (auth-service rejects the call for them).
  const hasPassword = account?.authProvider === "email";
  const isGoogle = account?.authProvider === "google";

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      const { data } = await deleteAccount();
      // Every session was revoked server-side; drop this one and show the
      // sign-in page with the date the deletion becomes final.
      clearSession();
      router.replace(`/login?deletionScheduled=${encodeURIComponent(data.finalAt)}`);
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Couldn't delete your account. Please try again.");
      setDeleting(false);
    }
  };

  if (!account && !loadError) return <PageLoader label="Loading your account settings…" />;

  return (
    <div className="flex flex-col gap-4 p-4 sm:gap-5 sm:p-6 lg:p-8">
      <ProfileSubpageHeader title="Account Settings" />

      <div className="overflow-hidden rounded-2xl border border-brand/10 bg-surface shadow-sm">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-brand/10 px-4 py-4 sm:min-h-22.25 sm:px-6 sm:py-5">

          <div className="flex min-w-0 items-center gap-3 sm:gap-4">

            <div className={ICON_TILE}>
              <UserIcons />
            </div>

            <div>
              <h2 className="text-[15px] font-bold leading-6 text-ink sm:text-[16px]">
                Account Information
              </h2>

              <p className="text-[12px] leading-4 text-muted">
                Update your email address and password
              </p>
            </div>

          </div>

        </div>

        {/* Email Row */}
        <div className="flex flex-col gap-3 border-b border-brand/10 px-4 py-4 sm:min-h-22.25 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-0">

          {/* Left */}
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">

            <div className={ICON_TILE}>
              <EmailIcon />
            </div>

            <div className="min-w-0">
              <p className="text-[13px] font-bold leading-6 text-ink sm:text-[14px]">
                Email Address
              </p>

              <p className="mt-0.5 truncate text-[13px] font-bold leading-5 text-muted sm:mt-1 sm:text-[14px]">
                {account?.email ?? "Couldn't load your email"}
              </p>
            </div>

          </div>

        </div>

        {/* Password Row */}
        <div className="flex flex-col gap-3 px-4 py-4 sm:min-h-22.25 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-0">

          {/* Left */}
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">

            <div className={ICON_TILE}>
              <LockIcon />
            </div>

            <div className="min-w-0">
              <p className="text-[13px] font-bold leading-6 text-ink sm:text-[14px]">
                Password
              </p>

              <p className="mt-0.5 break-words text-[13px] font-bold leading-5 text-muted sm:mt-1 sm:text-[14px]">
                {!account
                  ? "••••••••••"
                  : hasPassword
                    ? "••••••••••"
                    : `None — you sign in with ${isGoogle ? "Google" : "Apple"}`}
              </p>
            </div>

          </div>

          {/* Right */}
          {hasPassword && (
            <div className="shrink-0">
              <Button
                variant="secondary"
                onClick={() => setPasswordOpen(true)}
                // `!` on size/text: Button concatenates classes, so its md
                // h-14 / text-base wouldn't reliably give way otherwise.
                className="h-9.5! w-full shrink-0 whitespace-nowrap rounded-lg border border-brand/20 px-4 text-[13px]! font-semibold sm:w-39 sm:text-[14px]!"
              >
                Change Password
              </Button>
            </div>
          )}

        </div>

      </div>

      <div className="overflow-hidden rounded-2xl border border-brand/10 bg-surface shadow-sm">

        {/* Header */}
        <div className="flex items-center border-b border-brand/10 px-4 py-4 sm:min-h-22.25 sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <div className={ICON_TILE}>
              <LinkIcon />
            </div>

            <div>
              <h2 className="text-[15px] font-bold leading-6 text-ink sm:text-[16px]">
                Connected Accounts
              </h2>

              <p className="text-[12px] leading-4 text-muted">
                Connect or disconnect third-party accounts
              </p>
            </div>
          </div>
        </div>

        {/* Google Row */}
        <div className="flex flex-col gap-3 border-b border-brand/10 px-4 py-4 sm:min-h-22.25 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-0">

          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-brand/10 sm:h-10 sm:w-10">
              <GoogleIcon />
            </div>

            <div>
              <p className="text-[13px] font-bold leading-5 text-ink sm:text-[14px]">
                Google
              </p>

              {/* break-all: a long Google address can't push past the card on a phone. */}
              <p className="break-all text-[12px] leading-4 text-muted">
                {isGoogle ? account?.email : "Not connected"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap shrink-0 items-center gap-4">
            {isGoogle ? (
              <span className="flex h-[22px] w-[98px] items-center justify-center rounded-md border border-[#D1FAE5] bg-[#ECFDF5] text-[10px] font-bold text-[#065F46]">
                Connected
              </span>
            ) : (
              <span className="flex h-[22px] w-[118px] items-center justify-center rounded-md border border-brand/10 bg-tint text-[10px] font-bold text-muted">
                Not Connected
              </span>
            )}
          </div>
        </div>

        {/* Apple Row */}
        {/* <div className="flex flex-col gap-3 px-4 py-4 sm:min-h-22.25 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-0">

          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-brand/10 sm:h-10 sm:w-10">
              <AppleIcon className="h-5 w-5" />
            </div>

            <div>
              <p className="text-[13px] font-bold leading-5 text-ink sm:text-[14px]">
                Apple
              </p>

              <p className="text-[12px] leading-4 text-muted">
                Not connected
              </p>
            </div>
          </div>

          <div className="flex flex-wrap shrink-0 items-center gap-4">

            <span className="flex h-[22px] w-[118px] items-center justify-center rounded-md border border-brand/10 bg-tint text-[10px] font-bold text-muted">
              Not Connected
            </span>
          </div>
        </div> */}

      </div>


      <div className="overflow-hidden rounded-2xl border border-brand/10 bg-surface shadow-sm">

        {/* Header */}
        <div className="flex items-center border-b border-brand/10 px-4 py-4 sm:min-h-22.25 sm:px-6 sm:py-5">

          <div className="flex min-w-0 items-center gap-3 sm:gap-4">

            <div className={`${ICON_FRAME} bg-[#FFFBEB] text-[#F59E0B]`}>
              <TrashIcon />
            </div>

            <div>
              <h2 className="text-[15px] font-bold leading-6 text-ink sm:text-[16px]">
                Delete Account
              </h2>

              <p className="text-[12px] leading-4 text-muted">
                Permanently delete your account and all your data.
              </p>
            </div>

          </div>

        </div>

        <div className="p-4 sm:p-6">

          {/* Warning Box */}
          <div className="flex items-start gap-3 rounded-xl border border-[#F59E0B]/20 p-3 sm:min-h-18 sm:gap-4 sm:p-4">

            <div className="flex h-6 w-6 shrink-0 items-center justify-center text-[#F59E0B]">
              <ConfirmIcon />
            </div>

            <div>
              <p className="text-[13px] font-bold leading-5 text-[#F59E0B] sm:text-[14px]">
                Your account will be scheduled for deletion.
              </p>

              <p className="mt-1 text-[13px] leading-5 text-[#F59E0B] sm:text-[14px]">
                You can restore your account within{" "}
                <span className="font-bold">30 days</span> from the deletion date.
              </p>
            </div>

          </div>

          {/* Bottom Row */}
          <div className="mt-4 flex flex-col gap-4 sm:mt-6 sm:flex-row sm:items-end sm:justify-between">

            {/* Left Content */}
            <div className="space-y-2">

              <p className="text-[13px] leading-5 text-muted sm:text-[14px]">
                • All your data will be removed
              </p>

              <p className="text-[13px] leading-5 text-muted sm:text-[14px]">
                • This action cannot be undone
              </p>

            </div>

            {/* Fixed Button */}
            <div className="h-[46px] w-full shrink-0 sm:w-43.25">
              <Button
                variant="secondary"
                onClick={() => {
                  setDeleteError(null);
                  setDeleteOpen(true);
                }}
                // h-full! so it fills the 46px wrapper instead of Button's md h-14.
                className="h-full! w-full rounded-lg border border-[#F59E0B]! px-8 text-[13px]! font-bold text-[#F59E0B]! sm:text-[14px]!"
              >
                Delete Account
              </Button>
            </div>

          </div>

        </div>

      </div>

      <ChangePasswordModal open={isPasswordOpen} onClose={() => setPasswordOpen(false)} />
      <ConfirmModal
        open={isDeleteOpen}
        onClose={() => !deleting && setDeleteOpen(false)}
        onConfirm={handleDelete}
        busy={deleting}
        error={deleteError}
        title="Delete account?"
        description="Your account will be scheduled for deletion and you'll be signed out on every device. Sign in again within 30 days to restore it — after that it's deleted for good."
        confirmLabel={deleting ? "Scheduling…" : "Delete"}
      />
    </div>
  );
}
