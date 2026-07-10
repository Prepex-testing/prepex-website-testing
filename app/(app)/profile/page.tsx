"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MoonIcon,
  BellIcon,
  SunIcon,
  MonitorIcon,
  BookIcon,
  BriefcaseIcon,
  GraduationCapIcon,
  UserIcon,
  CalendarIcon,
  PinIcon,
  ClockIcon,
  UsersIcon,
  LogoutIcon,
  PencilIcon,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { SettingRow } from "@/components/profile/SettingRow";
import { ToggleRow } from "@/components/profile/ToggleRow";
import { EditProfileModal } from "@/components/profile/EditProfileModal";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useTheme } from "@/components/theme/ThemeProvider";
import { UserMenu } from "@/components/layout/UserMenu";

const PROFILE_COMPLETE = 72;

const DETAILS = [
  { label: "Target Exam", value: "JEE Main + Advanced", icon: <BookIcon /> },
  { label: "Coaching", value: "Allen Kota", icon: <BriefcaseIcon /> },
  { label: "Class", value: "12th", icon: <GraduationCapIcon /> },
  { label: "Batch", value: "Leader Batch", icon: <UserIcon /> },
  { label: "Exam Date", value: "25 Jan 2027", icon: <CalendarIcon /> },
  { label: "School", value: "Add School →", icon: <PinIcon />, isLink: true },
];

const THEME_OPTIONS = [
  { id: "light", label: "Light Mode", icon: <SunIcon /> },
  { id: "dark", label: "Dark Mode", icon: <MoonIcon /> },
  { id: "system", label: "System Default", icon: <MonitorIcon /> },
] as const;

const NOTIFICATION_ITEMS = [
  { id: "daily-plan", label: "Daily Plan Ready", subtitle: "Get notified when your daily plan is ready" },
  { id: "check-in", label: "Daily Emotional Check-In", subtitle: "Reminder to check-in every morning" },
  { id: "revision", label: "Revision Reminders", subtitle: "Reminders for revision tasks" },
  { id: "practice", label: "Practice Reminders", subtitle: "Reminders for practice sessions" },
  { id: "weekly-journal", label: "Weekly Win Journal", subtitle: "Weekly summary and wins" },
  { id: "parent-report", label: "Parent Report Updates", subtitle: "When weekly reports are sent" },
];

export default function ProfilePage() {
  const router = useRouter();
  const [isEditOpen, setEditOpen] = useState(false);
  const [isLogoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState<Record<string, boolean>>({
    "daily-plan": true,
    "check-in": true,
    revision: false,
    practice: false,
    "weekly-journal": true,
    "parent-report": false,
  });

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-h1 text-ink">Profile</h1>
          <p className="text-xs text-muted">
            Manage your account, preferences and connection
          </p>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <button
            type="button"
            aria-label="Notifications"
            className="flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-tint-strong"
          >
            <BellIcon />
          </button>
          <UserMenu />
        </div>
      </div>

      <div className="flex flex-col gap-6 rounded-2xl border border-brand/10 bg-surface p-5 lg:flex-row lg:items-center">
        <div className="flex shrink-0 flex-col items-center gap-2">
          <div className="relative flex h-20 w-20 items-center justify-center">
            <svg viewBox="0 0 88 88" className="absolute inset-0 -rotate-90">
              <circle cx="44" cy="44" r="40" fill="none" stroke="var(--tint)" strokeWidth="4" />
              <circle
                cx="44"
                cy="44"
                r="40"
                fill="none"
                stroke="var(--brand)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 40}
                strokeDashoffset={2 * Math.PI * 40 * (1 - PROFILE_COMPLETE / 100)}
              />
            </svg>
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand text-2xl font-bold text-white">
              R
            </span>
          </div>
          <p className="text-[10px] font-semibold text-muted">
            {PROFILE_COMPLETE}% Profile complete
          </p>
        </div>

        <div className="flex flex-col gap-1 lg:border-r lg:border-brand/10 lg:pr-6">
          <p className="text-base font-bold text-ink">Rohan</p>
          <p className="text-xs text-muted">JEE Main + Advanced 2027</p>
          <p className="flex items-center gap-1 text-xs text-muted">
            <CalendarIcon /> 127 Days Until JEE Mains
          </p>
          <p className="text-[10px] text-muted">Last seen · Today 9:24 AM</p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-2 w-fit"
            onClick={() => setEditOpen(true)}
          >
            <PencilIcon />
            Edit Profile
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 lg:flex-1">
          {DETAILS.map((detail) => (
            <div key={detail.label} className="flex items-center gap-2">
              <span className="text-muted">{detail.icon}</span>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted">
                  {detail.label}
                </p>
                <p
                  className={`text-sm font-semibold ${
                    detail.isLink ? "text-cta" : "text-ink"
                  }`}
                >
                  {detail.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-brand/10 bg-surface p-5">
        <p className="text-sm font-bold text-ink">Theme Mode</p>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {THEME_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setTheme(option.id)}
              aria-pressed={theme === option.id}
              className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors ${
                theme === option.id
                  ? "border-brand bg-tint-strong/60"
                  : "border-brand/10 hover:bg-tint-strong/30"
              }`}
            >
              <span className="text-ink">{option.icon}</span>
              <span className="text-xs font-semibold text-ink">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="rounded-2xl border border-brand/10 bg-surface p-5">
          <p className="text-sm font-bold text-ink">Study Preferences</p>
          <div className="mt-1 flex flex-col divide-y divide-brand/5">
            <SettingRow
              icon={<ClockIcon />}
              title="Daily Study Hours"
              subtitle="6 hrs (Weekdays) • 8 hrs (Weekends)"
            />
            <SettingRow
              icon={<CalendarIcon />}
              title="Study Time Windows"
              subtitle="Midday, Evening"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-brand/10 bg-surface p-5">
          <p className="text-sm font-bold text-ink">Connections</p>
          <div className="mt-1 flex flex-col divide-y divide-brand/5">
            <Link href="/home/partner" className="block">
              <SettingRow icon={<UsersIcon />} title="Accountability Partner" subtitle="Amit Gupta" />
            </Link>
            <Link href="/profile/parent" className="block">
              <SettingRow
                icon={<UsersIcon />}
                title="Parent Connection"
                subtitle="Connected"
                right={
                  <span className="rounded-full bg-tint-strong px-2.5 py-1 text-[10px] font-bold text-ink">
                    Active
                  </span>
                }
              />
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-brand/10 bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-bold text-ink">Notification Preferences</p>
          <Link href="/profile/notifications">
            <Button variant="secondary" size="sm">
              Manage All
            </Button>
          </Link>
        </div>
        <div className="mt-2 grid grid-cols-1 gap-x-6 sm:grid-cols-2">
          {NOTIFICATION_ITEMS.map((item) => (
            <ToggleRow
              key={item.id}
              title={item.label}
              subtitle={item.subtitle}
              checked={notifications[item.id]}
              onChange={(checked) =>
                setNotifications((current) => ({ ...current, [item.id]: checked }))
              }
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-brand/10 bg-surface p-5">
        <Link href="/profile/settings" className="block">
          <SettingRow icon={<UserIcon />} title="Account Settings" subtitle="Email, password and data" />
        </Link>
        <Link href="/profile/help" className="block">
          <SettingRow icon={<BookIcon />} title="Help and Support" subtitle="FAQs, contact and feedback" />
        </Link>
      </div>

      <button
        type="button"
        onClick={() => setLogoutConfirmOpen(true)}
        className="flex items-center gap-3 rounded-2xl border border-brand/10 bg-surface p-5 text-left"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger-bg text-danger">
          <LogoutIcon />
        </span>
        <div>
          <p className="text-sm font-bold text-danger">Logout</p>
          <p className="text-xs text-muted">Sign out from your account</p>
        </div>
      </button>

      <EditProfileModal open={isEditOpen} onClose={() => setEditOpen(false)} />
      <ConfirmModal
        open={isLogoutConfirmOpen}
        onClose={() => setLogoutConfirmOpen(false)}
        onConfirm={() => router.push("/login")}
        title="Log out?"
        description="Are you sure you want to logout? You'll need to sign in again to access your plan."
        confirmLabel="Yes, Logout"
      />
    </div>
  );
}
