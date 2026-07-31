"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MoonIcon,
  // BellIcon,
  SunIcon,
  MonitorIcon,
  // BookIcon,
  // BriefcaseIcon,
  // GraduationCapIcon,
  // UserIcon,
  // CalendarIcon,
  // PinIcon,
  // ClockIcon,
  // UsersIcon,
  LogoutIcon,
  PencilIcon,
  ChevronRightIcon,
  SmileIcon,
  RefreshIcon,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { SettingRow } from "@/components/profile/SettingRow";
import { ToggleRow } from "@/components/profile/ToggleRow";
import { EditProfileModal } from "@/components/profile/EditProfileModal";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useTheme } from "@/components/theme/ThemeProvider";
import { UserMenu } from "@/components/layout/UserMenu";
import { useStoredFullName } from "@/lib/auth/useStoredFullName";
import {QuickIcon,Coaching,GraduationCapIcon,UserIcons,CalendarIcons,ClockIcon,CalendarIcon,Patners,UserIcon,EditIcons,BellIcon} from "@/assets/icons";
const PROFILE_COMPLETE = 72;

const DETAILS = [
  { label: "Target Exam", value: "JEE Main + Advanced", icon: <QuickIcon /> },
  { label: "Coaching", value: "Allen Kota", icon: <Coaching /> },
  { label: "Class", value: "12th", icon: <GraduationCapIcon /> },
  { label: "Batch", value: "Leader Batch", icon: <UserIcons /> },
  { label: "Exam Date", value: "25 Jan 2027", icon: <CalendarIcons /> },
  { label: "School", value: "Add School →", icon: <Coaching />, isLink: true },
];

const THEME_OPTIONS = [
  { id: "light", label: "Light Mode", icon: <SunIcon /> },
  { id: "dark", label: "Dark Mode", icon: <MoonIcon /> },
  { id: "system", label: "System Default", icon: <MonitorIcon /> },
] as const;

const NOTIFICATION_ITEMS = [
  {
    id: "dailyPlan",
    label: "Daily Plan Ready",
    subtitle: "Get notified when your daily plan is ready",
    icon: <CalendarIcon />,
  },
  {
    id: "revision",
    label: "Revision Reminders",
    subtitle: "Reminders for revision tasks",
    icon: <RefreshIcon />,
  },
  {
    id: "journal",
    label: "Weekly Win Journal",
    subtitle: "Weekly summary and wins",
    icon: <EditIcons />,
  },
  {
    id: "emotional",
    label: "Daily Emotional Check-In",
    subtitle: "Reminder to check-in every morning",
    icon: <SmileIcon />,
  },
  {
    id: "practice",
    label: "Practice Reminders",
    subtitle: "Reminders for practice sessions",
    icon: <PencilIcon />,
  },
  {
    id: "parent",
    label: "Parent Report Updates",
    subtitle: "When weekly reports are sent",
    icon: <UserIcon />,
  },
];

export default function ProfilePage() {
  const router = useRouter();
  const storedFullName = useStoredFullName();
  const fullName = storedFullName || "Student";
  const initial = fullName[0]?.toUpperCase() ?? "S";
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


      <div className="w-full rounded-3xl border border-brand/10 bg-surface p-6">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-center">

          {/* LEFT SECTION */}
          <div className="flex w-full shrink-0 flex-col items-center border-b border-brand/10 pb-8 lg:w-[277px] lg:border-b-0 lg:border-r lg:pb-0 lg:pr-10">

            {/* Progress */}
            <div className="relative flex h-[109px] w-[93px] items-center justify-center">
              <svg
                viewBox="0 0 88 88"
                className="absolute h-[88px] w-[88px] -rotate-90"
              >
                <circle
                  cx="44"
                  cy="44"
                  r="40"
                  fill="none"
                  stroke="var(--color-tint)"
                  strokeWidth="5"
                />

                <circle
                  cx="44"
                  cy="44"
                  r="40"
                  fill="none"
                  stroke="url(#profileGradient)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 40}
                  strokeDashoffset={
                    2 * Math.PI * 40 * (1 - PROFILE_COMPLETE / 100)
                  }
                />

                <defs>
                  <linearGradient
                    id="profileGradient"
                    x1="0%"
                    y1="0%"
                    x2="0%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#1A1A4E" />
                    <stop offset="100%" stopColor="#4C1D95" />
                  </linearGradient>
                </defs>
              </svg>

              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand text-2xl font-bold text-white">
                {initial}
              </span>
            </div>

            <p className="mt-2 text-[10px] font-medium text-muted">
              {PROFILE_COMPLETE}% Profile complete
            </p>

            <h2 className="mt-4 text-center text-2xl font-bold text-ink">
              {fullName}
            </h2>

            <div className="mt-3 flex flex-col items-center gap-2">
              <p className="text-center text-[14px] font-semibold text-ink">
                JEE Main + Advanced 2027
              </p>

              <p className="flex items-center gap-2 text-[14px] font-semibold text-ink">
                <CalendarIcon />
                127 Days Until JEE Mains
              </p>

              <p className="text-[14px] text-muted">
                Last seen · Today 9:24 AM
              </p>
            </div>

            <Button
              variant="secondary"
              onClick={() => setEditOpen(true)}
              className="mt-6 h-10 rounded-xl px-6"
            >
              <PencilIcon />
              Edit Profile
            </Button>
          </div>

          {/* RIGHT SECTION */}
          <div className="flex flex-1 justify-center lg:justify-start lg:pl-10">
            <div className="grid w-full max-w-160 grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-12">

              {DETAILS.map((detail) => (
                <div
                  key={detail.label}
                  className="flex h-10 items-center gap-4"
                >
                  {/* Icon */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EEF0F8] text-[#1A1A4E]  dark:bg-[#FAF7F2]/8 dark:text-[#FAF7F2]">
                    {detail.icon}
                  </div>

                  {/* Text */}
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium leading-4 text-muted">
                      {detail.label}
                    </p>

                    <p
                      className={`mt-1 truncate text-[14px] font-bold leading-5 ${detail.isLink ? "text-cta" : "text-ink"
                        }`}
                    >
                      {detail.value}
                    </p>
                  </div>
                </div>
              ))}

            </div>
          </div>

        </div>
      </div>

      <div className="w-full rounded-2xl border border-brand/10 bg-surface p-6">
        {/* Header */}
        <div className="h-7">
          <h2 className="text-[18px] font-bold leading-7 text-ink">
            Theme Mode
          </h2>
        </div>

        {/* Theme Buttons */}
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">

          {THEME_OPTIONS.map((option) => {
            const active = theme === option.id;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setTheme(option.id)}
                aria-pressed={active}
                className={`
            flex h-[86px] w-full flex-col items-center justify-center
            gap-2 rounded-xl border px-4 py-[17px]
            transition-all
            ${active
                    ? "border-brand bg-tint"
                    : "border-white/25 bg-transparent hover:bg-tint/40"
                  }
          `}
              >
                {/* Icon */}
                <span className="flex h-[22px] w-[22px] items-center justify-center text-ink">
                  {option.icon}
                </span>

                {/* Label */}
                <span className="text-[14px] font-semibold leading-5 text-ink">
                  {option.label}
                </span>
              </button>
            );
          })}

        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* STUDY PREFERENCES */}
        <div className="rounded-2xl border border-brand/10 bg-surface p-6">
          <h2 className="text-[16px] font-bold leading-6 text-ink">
            Study Preferences
          </h2>

          <div className="mt-6 space-y-4">

            <button
              type="button"
              className="flex h-[66px] w-full items-center justify-between rounded-xl border border-brand/10 px-3 transition-colors hover:bg-tint/30"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-tint text-ink">
                  <ClockIcon />
                </div>

                <div className="text-left">
                  <p className="text-[14px] font-semibold leading-5 text-ink">
                    Daily Study Hours
                  </p>

                  <p className="mt-0.5 text-xs leading-4 text-muted">
                    6 hrs (Weekdays) • 8 hrs (Weekends)
                  </p>
                </div>
              </div>

              <ChevronRightIcon className="h-5 w-5 text-muted" />
            </button>

            <button
              type="button"
              className="flex h-[66px] w-full items-center justify-between rounded-xl border border-brand/10 px-3 transition-colors hover:bg-tint/30"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-tint text-ink">
                  <CalendarIcon />
                </div>

                <div className="text-left">
                  <p className="text-[14px] font-semibold leading-5 text-ink">
                    Study Time Windows
                  </p>

                  <p className="mt-0.5 text-xs leading-4 text-muted">
                    Midday, Evening
                  </p>
                </div>
              </div>

              <ChevronRightIcon className="h-5 w-5 text-muted" />
            </button>

          </div>
        </div>

        {/* CONNECTIONS */}
        <div className="rounded-2xl border border-brand/10 bg-surface p-6">
          <h2 className="text-[16px] font-bold leading-6 text-ink">
            Connections
          </h2>

          <div className="mt-6 space-y-4">

            <Link href="/home/partner">
              <div className="flex h-[66px] items-center justify-between rounded-xl border border-brand/10 px-3 transition-colors hover:bg-tint/30">

                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg  bg-[#EEF0F8] text-[#1A1A4E]  dark:bg-[#FAF7F2]/8 dark:text-[#FAF7F2]">
                    <Patners />
                  </div>

                  <div>
                    <p className="text-[14px] font-semibold leading-5 text-ink">
                      Accountability Partner
                    </p>

                    <p className="mt-0.5 text-xs leading-4 text-muted">
                      Amit Gupta
                    </p>
                  </div>
                </div>

                <ChevronRightIcon className="h-5 w-5 text-muted" />
              </div>
            </Link>

            <Link href="/profile/parent">
              <div className="flex h-[66px] items-center justify-between rounded-xl border border-brand/10 px-3 transition-colors hover:bg-tint/30">

                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-tint text-ink">
                    <UserIcon />
                  </div>

                  <div>
                    <p className="text-[14px] font-semibold leading-5 text-ink">
                      Parent Connection
                    </p>

                    <p className="mt-0.5 text-xs leading-4 text-muted">
                      Connected
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-tint px-3 py-1 text-[10px] font-bold text-ink">
                    Active
                  </span>

                  <ChevronRightIcon />
                </div>

              </div>
            </Link>

          </div>
        </div>

      </div>

      <div className="rounded-2xl border border-brand/10 bg-surface p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-bold leading-6 text-ink">
            Notification Preferences
          </h2>

          <Link href="/profile/notifications">
            <Button
              variant="secondary"
              className="h-[30px] rounded-lg border border-brand/20 px-4 text-[12px] font-semibold"
            >
              Manage All
            </Button>
          </Link>
        </div>

        {/* Body */}
        <div className="mt-8 grid grid-cols-1 gap-x-12 gap-y-6 lg:grid-cols-2">

          {/* LEFT COLUMN */}
          <div className="space-y-6">
            {NOTIFICATION_ITEMS.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-tint text-ink">
                    {item.icon}
                  </div>

                  <div>
                    <p className="text-[14px] font-semibold leading-5 text-ink">
                      {item.label}
                    </p>

                    <p className="text-[12px] leading-4 text-muted">
                      {item.subtitle}
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={notifications[item.id] ?? false}
                    onChange={(e) =>
                      setNotifications((current) => ({
                        ...current,
                        [item.id]: e.target.checked,
                      }))
                    }
                  />

                  <div
                    className="
                relative h-6 w-11 rounded-full
                bg-tint
                transition-colors
                peer-checked:bg-brand
                after:absolute
                after:left-[2px]
                after:top-[2px]
                after:h-5
                after:w-5
                after:rounded-full
                after:bg-white
                after:transition-transform
                peer-checked:after:translate-x-5
              "
                  />
                </label>
              </div>
            ))}
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">
            {NOTIFICATION_ITEMS.slice(3).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-tint text-ink">
                    {item.icon}
                  </div>

                  <div>
                    <p className="text-[14px] font-semibold leading-5 text-ink">
                      {item.label}
                    </p>

                    <p className="text-[12px] leading-4 text-muted">
                      {item.subtitle}
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={notifications[item.id] ?? false}
                    onChange={(e) =>
                      setNotifications((current) => ({
                        ...current,
                        [item.id]: e.target.checked,
                      }))
                    }
                  />

                  <div
                    className="
                relative h-6 w-11 rounded-full
                bg-tint
                transition-colors
                peer-checked:bg-brand
                after:absolute
                after:left-[2px]
                after:top-[2px]
                after:h-5
                after:w-5
                after:rounded-full
                after:bg-white
                after:transition-transform
                peer-checked:after:translate-x-5
              "
                  />
                </label>
              </div>
            ))}
          </div>

        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-brand/10 bg-surface p-5">
        <Link href="/profile/settings" className="block">
          <SettingRow icon={<UserIcon />} title="Account Settings" subtitle="Email, password and data" />
        </Link>
        <Link href="/profile/help" className="block">
          <SettingRow icon={<QuickIcon />} title="Help and Support" subtitle="FAQs, contact and feedback" />
        </Link>
      </div>

      <button
        type="button"
        onClick={() => setLogoutConfirmOpen(true)}
        className="
    flex w-full items-center gap-4
    rounded-2xl border border-brand/10
    bg-surface p-3
    shadow-sm
    transition-colors
    hover:border-brand/20
  "
      >
        {/* Icon */}
        <span
          className="
      flex h-12 w-12 shrink-0
      items-center justify-center
      rounded-lg
      bg-tint
      text-danger
    "
        >
          <LogoutIcon />
        </span>

        {/* Text */}
        <div className="flex flex-col items-start">
          <p className="text-[14px] font-bold leading-[14px] text-ink">
            Logout
          </p>

          <p className="mt-1 text-[12px] leading-4 text-muted">
            Sign out from your account
          </p>
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
