"use client";

import { Button } from "@/components/ui/Button";
import {
  UserIcon,
  MailIcon,
  LockIcon,
  LinkIcon,
  DownloadIcon,
  TrashIcon,
  ClockIcon,
  FileIcon,
  CalendarIcon,
  PencilIcon,
  GoogleIcon,
  AppleIcon,
  InfoIcon,
} from "@/components/ui/icons";
import { ProfileSubpageHeader } from "@/components/profile/ProfileSubpageHeader";

const EXPORT_ITEMS = [
  { label: "Study History", icon: <ClockIcon /> },
  { label: "Mock Results", icon: <FileIcon /> },
  { label: "Weekly Journal", icon: <PencilIcon /> },
  { label: "Calendar Events", icon: <CalendarIcon /> },
  { label: "Notes", icon: <FileIcon /> },
];

export default function AccountSettingsPage() {
  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <ProfileSubpageHeader title="Account Settings" />

      <div className="overflow-hidden rounded-2xl border border-brand/10 bg-surface shadow-sm">

        {/* Header */}
        <div className="flex h-[89px] items-center justify-between border-b border-brand/10 px-6">

          <div className="flex items-center gap-4">

            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-tint">
              <UserIcon />
            </div>

            <div>
              <h2 className="text-[16px] font-bold leading-6 text-ink">
                Account Information
              </h2>

              <p className="text-[12px] leading-4 text-muted">
                Update your email address and password
              </p>
            </div>

          </div>

        </div>

        {/* Email Row */}
        <div className="flex h-[89px] items-center border-b border-brand/10 px-6">

          {/* Left */}
          <div className="flex flex-1 items-center gap-4">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-tint">
              <MailIcon />
            </div>

            <div>
              <p className="text-[12px] leading-4 text-muted">
                Email Address
              </p>

              <p className="mt-1 text-[14px] font-bold leading-5 text-ink">
                rohan@example.com
              </p>
            </div>

          </div>

          {/* Right */}
          <div className="shrink-0">
            <Button
              variant="secondary"
              className="!h-[38px] !w-[156px] shrink-0 whitespace-nowrap rounded-lg border border-brand/20 px-4 text-[14px] font-semibold"
            >
              Change Email
            </Button>
          </div>

        </div>

        {/* Password Row */}
        <div className="flex h-[89px] items-center px-6">

          {/* Left */}
          <div className="flex flex-1 items-center gap-4">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-tint">
              <LockIcon />
            </div>

            <div>
              <p className="text-[12px] leading-4 text-muted">
                Password
              </p>

              <p className="mt-1 text-[14px] font-bold leading-5 text-ink">
                ••••••••••
              </p>
            </div>

          </div>

          {/* Right */}
          <div className="shrink-0">
            <Button
              variant="secondary"
              className="!h-[38px] !w-[156px] shrink-0 whitespace-nowrap rounded-lg border border-brand/20 px-4 text-[14px] font-semibold"
            >
              Change Password
            </Button>
          </div>

        </div>

      </div>

 <div className="overflow-hidden rounded-2xl border border-brand/10 bg-surface shadow-sm">

  {/* Header */}
  <div className="flex h-[89px] items-center border-b border-brand/10 px-6">
    <div className="flex items-center gap-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-tint">
        <LinkIcon />
      </div>

      <div>
        <h2 className="text-[16px] font-bold leading-6 text-ink">
          Connected Accounts
        </h2>

        <p className="text-[12px] leading-4 text-muted">
          Connect or disconnect third-party accounts
        </p>
      </div>
    </div>
  </div>

  {/* Google Row */}
  <div className="flex h-[89px] items-center justify-between border-b border-brand/10 px-6">

    <div className="flex items-center gap-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-brand/10">
        <GoogleIcon />
      </div>

      <div>
        <p className="text-[14px] font-bold leading-5 text-ink">
          Google
        </p>

        <p className="text-[12px] leading-4 text-muted">
          rohan@example.com
        </p>
      </div>
    </div>

    <div className="flex shrink-0 items-center gap-4">

      <span className="flex h-[22px] w-[98px] items-center justify-center rounded-md border border-[#D1FAE5] bg-[#ECFDF5] text-[10px] font-bold text-[#065F46]">
        Connected
      </span>

      <div className="h-[38px] w-[118px] shrink-0">
        <Button
          variant="secondary"
          className="h-full w-full rounded-lg border border-brand/20 px-4 text-[14px] font-semibold"
        >
          Disconnect
        </Button>
      </div>

    </div>
  </div>

  {/* Apple Row */}
  <div className="flex h-[89px] items-center justify-between px-6">

    <div className="flex items-center gap-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-brand/10">
        <AppleIcon className="h-5 w-5" />
      </div>

      <div>
        <p className="text-[14px] font-bold leading-5 text-ink">
          Apple
        </p>

        <p className="text-[12px] leading-4 text-muted">
          Not connected
        </p>
      </div>
    </div>

    <div className="flex shrink-0 items-center gap-4">

      <span className="flex h-[22px] w-[118px] items-center justify-center rounded-md border border-brand/10 bg-tint text-[10px] font-bold text-muted">
        Not Connected
      </span>

      <div className="h-[38px] w-[118px] shrink-0">
        <Button
          variant="secondary"
          className="h-full w-full rounded-lg border border-brand/20 px-4 text-[14px] font-semibold"
        >
          Connect
        </Button>
      </div>

    </div>
  </div>

</div>

      <div className="rounded-2xl border border-brand/10 bg-surface p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tint-strong text-ink">
              <DownloadIcon />
            </span>
            <div>
              <p className="text-sm font-bold text-ink">Data Export</p>
              <p className="text-xs text-muted">Download a copy of your data</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-tint-strong/40 p-4">
          <p className="min-w-0 flex-1 text-xs text-muted">
            We will prepare a copy of your data and email you a secure download link.
          </p>
          <Button variant="secondary" size="sm" className="shrink-0">
            Request Export
          </Button>
        </div>

        <p className="mt-4 text-[10px] font-bold uppercase tracking-wide text-muted">
          Your export will include:
        </p>
        <div className="mt-2 flex flex-wrap gap-4">
          {EXPORT_ITEMS.map((item) => (
            <span
              key={item.label}
              className="flex items-center gap-1.5 text-xs font-semibold text-body-text"
            >
              <span className="text-muted">{item.icon}</span>
              {item.label}
            </span>
          ))}
        </div>
      </div>

     <div className="overflow-hidden rounded-2xl border border-brand/10 bg-surface shadow-sm">

  {/* Header */}
  <div className="flex h-[89px] items-center border-b border-brand/10 px-6">

    <div className="flex items-center gap-4">

      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FFFBEB] text-[#F59E0B]">
        <TrashIcon />
      </div>

      <div>
        <h2 className="text-[16px] font-bold leading-6 text-ink">
          Delete Account
        </h2>

        <p className="text-[12px] leading-4 text-muted">
          Permanently delete your account and all your data.
        </p>
      </div>

    </div>

  </div>

  <div className="p-6">

    {/* Warning Box */}
    <div className="flex h-[72px] items-start gap-4 rounded-xl border border-[#F59E0B]/20 bg-[#F59E0B]/10 p-4">

      <div className="flex h-6 w-6 shrink-0 items-center justify-center text-[#F59E0B]">
        <InfoIcon />
      </div>

      <div>
        <p className="text-[14px] font-bold leading-5 text-[#F59E0B]">
          Your account will be scheduled for deletion.
        </p>

        <p className="mt-1 text-[14px] leading-5 text-[#F59E0B]">
          You can restore your account within{" "}
          <span className="font-bold">30 days</span> from the deletion date.
        </p>
      </div>

    </div>

    {/* Bottom Row */}
    <div className="mt-6 flex items-end justify-between">

      {/* Left Content */}
      <div className="space-y-2">

        <p className="text-[14px] leading-5 text-muted">
          • All your data will be removed
        </p>

        <p className="text-[14px] leading-5 text-muted">
          • This action cannot be undone
        </p>

        <p className="text-[14px] leading-5 text-muted">
          • Complies with DPDP Act, 2023
        </p>

      </div>

      {/* Fixed Button */}
      <div className="h-[46px] w-[173px] shrink-0">
        <Button
          variant="secondary"
          className="h-full w-full rounded-lg border border-[#F59E0B] px-8 text-[14px] font-bold text-[#F59E0B]"
        >
          Delete Account
        </Button>
      </div>

    </div>

  </div>

</div>
    </div>
  );
}
