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

      <div className="rounded-2xl border border-brand/10 bg-surface p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tint-strong text-ink">
            <UserIcon />
          </span>
          <div>
            <p className="text-sm font-bold text-ink">Account Information</p>
            <p className="text-xs text-muted">Update your email address and password</p>
          </div>
        </div>

        <div className="mt-4 flex flex-col divide-y divide-brand/5">
          <div className="flex flex-wrap items-center gap-3 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-tint text-ink">
              <MailIcon />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted">Email Address</p>
              <p className="text-sm font-semibold text-ink">rohan@example.com</p>
            </div>
            <Button variant="secondary" size="sm" className="w-full sm:w-auto">
              Change Email
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-tint text-ink">
              <LockIcon />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted">Password</p>
              <p className="text-sm font-semibold text-ink">••••••••••</p>
            </div>
            <Button variant="secondary" size="sm" className="w-full sm:w-auto">
              Change Password
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-brand/10 bg-surface p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tint-strong text-ink">
            <LinkIcon />
          </span>
          <div>
            <p className="text-sm font-bold text-ink">Connected Accounts</p>
            <p className="text-xs text-muted">Connect or disconnect third-party accounts</p>
          </div>
        </div>

        <div className="mt-4 flex flex-col divide-y divide-brand/5">
          <div className="flex flex-wrap items-center gap-3 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-brand/10">
              <GoogleIcon />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">Google</p>
              <p className="text-xs text-muted">rohan@example.com</p>
            </div>
            <span className="shrink-0 rounded-full bg-success-bg px-2.5 py-1 text-[10px] font-bold text-success">
              Connected
            </span>
            <Button variant="secondary" size="sm" className="w-full sm:w-auto">
              Disconnect
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-brand/10 text-ink">
              <AppleIcon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">Apple</p>
              <p className="text-xs text-muted">Not connected</p>
            </div>
            <span className="shrink-0 rounded-full bg-tint-strong px-2.5 py-1 text-[10px] font-bold text-muted">
              Not Connected
            </span>
            <Button variant="secondary" size="sm" className="w-full sm:w-auto">
              Connect
            </Button>
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

      <div className="rounded-2xl border border-cta/20 bg-surface p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cta/10 text-cta">
            <TrashIcon />
          </span>
          <div>
            <p className="text-sm font-bold text-ink">Delete Account</p>
            <p className="text-xs text-muted">
              Permanently delete your account and all your data.
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-warning/10 p-4">
          <p className="text-xs font-semibold text-warning">
            Your account will be scheduled for deletion.
          </p>
          <p className="mt-0.5 text-xs text-warning">
            You can restore your account within 30 days from the deletion date.
          </p>
        </div>

        <ul className="mt-3 flex flex-col gap-1 text-xs text-muted">
          <li>• All your data will be removed</li>
          <li>• This action cannot be undone</li>
          <li>• Complies with DPDP Act, 2023</li>
        </ul>

        <Button variant="secondary" size="sm" className="mt-4 border-cta text-cta">
          Delete Account
        </Button>
      </div>
    </div>
  );
}
