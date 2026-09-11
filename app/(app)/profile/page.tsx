"use client";

import { useEffect, useState } from "react";
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
} from "@/components/ui/icons";
import { Button } from "@/components/ui/Button";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Switch } from "@/components/ui/Switch";
import { notificationGroupIcon } from "@/components/profile/notificationGroupIcons";
import {
  getNotificationSettings,
  updateNotificationSettings,
  type NotificationSettings,
} from "@/lib/api/notifications";
import { AvatarProgressRing } from "@/components/ui/AvatarProgressRing";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { SettingRow } from "@/components/profile/SettingRow";
import { ToggleRow } from "@/components/profile/ToggleRow";
import { EditProfileModal } from "@/components/profile/EditProfileModal";
import { StudyPreferencesModal } from "@/components/profile/StudyPreferencesModal";
import {
  ACADEMIC_LEVEL_LABEL,
  COACHING_TYPE_LABEL,
  STUDY_WINDOW_LABEL,
  getProfileOverview,
  type ProfileOverview,
} from "@/lib/api/profile";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useTheme } from "@/components/theme/ThemeProvider";
import { UserMenu } from "@/components/layout/UserMenu";
import { useStoredFullName } from "@/lib/auth/useStoredFullName";
import { useAvatarSrc } from "@/lib/profile/avatar";
import { performLogout } from "@/lib/api/auth";
import { getParentConnection, parentConnectionSummary, type ParentConnectionState } from "@/lib/api/parent";
import { QuickIcon, Coaching, GraduationCapIcon, UserIcons, CalendarIcons, ClockIcon, CalendarIcon, Patners, UserIcon } from "@/assets/icons";
/** How many preference groups the profile page previews before "Manage All". */
const PROFILE_NOTIFICATION_COUNT = 6;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2027-01-25" -> "25 Jan 2027". Parsed by hand so no timezone shifts the day. */
function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return `${d} ${MONTHS[(m ?? 1) - 1]} ${y}`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** "Today 9:24 AM" / "Yesterday 9:24 AM" / "3 Sep 2026". */
function formatLastSeen(iso: string): string {
  const seen = new Date(iso);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const dayMs = 86_400_000;
  if (seen.getTime() >= startOfToday.getTime()) return `Today ${formatTime(seen)}`;
  if (seen.getTime() >= startOfToday.getTime() - dayMs) return `Yesterday ${formatTime(seen)}`;
  return formatDate(seen.toISOString().slice(0, 10));
}

function countdownLabel(overview: ProfileOverview): string | null {
  const days = overview.daysUntilExam;
  if (days === null) return null;
  const exam = overview.exam?.name ?? "your exam";
  if (days < 0) return `${exam} date has passed`;
  if (days === 0) return `${exam} is today`;
  return `${days} ${days === 1 ? "Day" : "Days"} Until ${exam}`;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "S";
  const first = parts[0]![0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]![0] ?? "" : "";
  return (first + last).toUpperCase();
}

const THEME_OPTIONS = [
  { id: "light", label: "Light Mode", icon: <SunIcon /> },
  { id: "dark", label: "Dark Mode", icon: <MoonIcon /> },
  { id: "system", label: "System Default", icon: <MonitorIcon /> },
] as const;


export default function ProfilePage() {
  const router = useRouter();
  const storedFullName = useStoredFullName();
  const avatarSrc = useAvatarSrc();
  const fullName = storedFullName || "Student";
  const [isEditOpen, setEditOpen] = useState(false);
  const [isPrefsOpen, setPrefsOpen] = useState(false);
  const [overview, setOverview] = useState<ProfileOverview | null>(null);
  const [overviewError, setOverviewError] = useState(false);
  const [isLogoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  // PRD 19.9 — the same server-owned preferences the full settings screen
  // edits. This section shows the first few groups as a shortcut; "Manage All"
  // goes to /profile/notifications for the rest.
  //
  // (This replaced a local useState whose keys — "daily-plan", "weekly-journal"
  // — did not match the ids it was read by, so four of the six switches
  // rendered permanently off no matter what the student had chosen.)
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null);
  // Section 13 — the Connections row shows the parent connection's real state.
  const [parentState, setParentState] = useState<ParentConnectionState | null>(null);
  const [parentLoaded, setParentLoaded] = useState(false);

  useEffect(() => {
    getParentConnection()
      .then(({ data }) => setParentState(data))
      .catch(() => undefined)
      .finally(() => setParentLoaded(true));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    getNotificationSettings()
      .then(({ data }) => {
        if (!controller.signal.aborted) setNotificationSettings(data);
      })
      .catch(() => {
        // The section simply stays hidden — notification preferences failing
        // to load must not take the rest of the profile with them.
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    getProfileOverview()
      .then(({ data }) => {
        if (!controller.signal.aborted) setOverview(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setOverviewError(true);
      });
    return () => controller.abort();
  }, []);

  // The server's copy wins once it arrives; the stored name only bridges the
  // first paint so the header isn't blank.
  const displayName = overview?.fullName || fullName;
  const completion = overview?.completion.percent ?? 0;
  const examYear = overview?.examDate?.slice(0, 4);
  const inCoaching = overview?.coachingType === "COACHING";
  const prefs = overview?.studyPreferences ?? null;

  // Batch only means something for a coaching student, so it's left out
  // rather than shown as a blank for everyone else.
  const details = overview
    ? [
        { label: "Target Exam", value: overview.exam?.name ?? "—", icon: <QuickIcon /> },
        {
          label: "Coaching",
          value: inCoaching
            ? overview.coachingName || "Coaching"
            : overview.coachingType
              ? COACHING_TYPE_LABEL[overview.coachingType]
              : "—",
          icon: <Coaching />,
        },
        {
          label: "Class",
          value: overview.currentLevel ? ACADEMIC_LEVEL_LABEL[overview.currentLevel] : "—",
          icon: <GraduationCapIcon />,
        },
        ...(inCoaching
          ? [{ label: "Batch", value: overview.batchName || "—", icon: <UserIcons /> }]
          : []),
        {
          label: overview.examDateIsDefault ? "Exam Date (default)" : "Exam Date",
          value: overview.examDate ? formatDate(overview.examDate) : "Not set",
          icon: <CalendarIcons />,
        },
      ]
    : [];

  const partnerSummary = !overview?.partner
    ? "Not connected"
    : overview.partner.status === "PENDING"
      ? "Match pending"
      : overview.partner.name ?? "Connected";

  const notificationGroups = (notificationSettings?.categories ?? [])
    .flatMap((category) => category.groups)
    .slice(0, PROFILE_NOTIFICATION_COUNT);

  const setNotificationGroup = (groupId: string, enabled: boolean) => {
    setNotificationSettings((current) =>
      current
        ? {
            ...current,
            categories: current.categories.map((category) => ({
              ...category,
              groups: category.groups.map((group) =>
                group.id === groupId ? { ...group, enabled } : group,
              ),
            })),
          }
        : current,
    );

    void updateNotificationSettings({ groups: { [groupId]: enabled } })
      .then(({ data }) => setNotificationSettings(data))
      // Re-read rather than guess: a failed write leaves the switch showing
      // whatever the server actually has.
      .catch(() =>
        getNotificationSettings()
          .then(({ data }) => setNotificationSettings(data))
          .catch(() => undefined),
      );
  };

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-h1 text-ink">Profile</h1>
          <p className="text-xs text-muted">
            Manage your account, preferences and connection
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <ThemeToggle />
          <NotificationBell />
          <UserMenu />
        </div>
      </div>


      <div className="w-full rounded-3xl border border-brand/10 bg-surface p-6">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:gap-40">

          {/* LEFT SECTION */}
          <div className="flex w-full shrink-0 flex-col items-center border-b border-brand/10 pb-8 lg:w-[277px] lg:border-b-0 lg:border-r lg:pb-0 lg:pl-10 lg:pr-10">

            {/* Progress */}
            <AvatarProgressRing
              percent={completion}
              initials={initialsOf(displayName)}
              imageUrl={avatarSrc}
              onCameraClick={() => setEditOpen(true)}
            />

            {/* Hover lists what's still missing, so the number is actionable. */}
            <p
              className="mt-2 text-[10px] font-medium text-muted"
              title={
                overview && overview.completion.missing.length > 0
                  ? `Still to add: ${overview.completion.missing.join(", ")}`
                  : undefined
              }
            >
              {overview ? `${completion}% Profile complete` : " "}
            </p>

            <h2 className="mt-4 text-center text-2xl font-bold text-ink">
              {displayName}
            </h2>

            <div className="mt-3 flex flex-col items-center gap-2">
              {overview?.exam && (
                <p className="text-center text-[14px] font-semibold text-ink">
                  {overview.exam.name}
                  {examYear ? ` ${examYear}` : ""}
                </p>
              )}

              {overview && countdownLabel(overview) && (
                <p className="flex items-center gap-2 text-[14px] font-semibold text-ink">
                  <CalendarIcon />
                  {countdownLabel(overview)}
                </p>
              )}

              {overview?.lastSeenAt && (
                <p className="text-[14px] text-muted">
                  Last seen · {formatLastSeen(overview.lastSeenAt)}
                </p>
              )}

              {overviewError && (
                <p className="text-center text-[12px] text-muted">
                  Couldn&apos;t load your profile details.
                </p>
              )}
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

              {details.map((detail) => (
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

                    <p className="mt-1 truncate text-[14px] font-bold leading-5 text-ink">
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
                    : "border-[#E2E8F0] dark:border-white/25 bg-transparent hover:bg-tint/40"
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
              onClick={() => setPrefsOpen(true)}
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
                    {!prefs
                      ? "—"
                      : prefs.sameDailyTarget
                        ? `${prefs.weekdayHours} hrs every day`
                        : `${prefs.weekdayHours} hrs (Weekdays) • ${prefs.weekendHours} hrs (Weekends)`}
                  </p>
                </div>
              </div>

              <ChevronRightIcon className="h-5 w-5 text-muted" />
            </button>

            <button
              type="button"
              onClick={() => setPrefsOpen(true)}
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
                    {prefs && prefs.studyWindows.length > 0
                      ? prefs.studyWindows.map((w) => STUDY_WINDOW_LABEL[w]).join(", ")
                      : "—"}
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
                      {overview ? partnerSummary : " "}
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
                      {parentLoaded ? parentConnectionSummary(parentState) : " "}
                    </p>
                  </div>
                </div>

                <ChevronRightIcon className="h-5 w-5 text-muted" />

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

        {/* Body — the first few groups from the server catalog, split into
            two columns. The full set lives behind "Manage All". */}
        {notificationGroups.length === 0 ? (
          <p className="mt-8 text-sm text-muted">Loading your preferences…</p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-x-12 gap-y-6 lg:grid-cols-2">
            {[
              notificationGroups.slice(0, Math.ceil(notificationGroups.length / 2)),
              notificationGroups.slice(Math.ceil(notificationGroups.length / 2)),
            ].map((column, columnIndex) => (
              <div key={columnIndex} className="space-y-6">
                {column.map((group) => (
                  <div key={group.id} className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-tint text-ink">
                        {notificationGroupIcon(group.id)}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-semibold leading-5 text-ink">
                          {group.label}
                        </p>
                        <p className="text-[12px] leading-4 text-muted">{group.description}</p>
                      </div>
                    </div>

                    {group.alwaysOn ? (
                      /* No opt-out by design — see the settings screen. */
                      <span className="shrink-0 rounded-full bg-tint px-2.5 py-1 text-[10px] font-bold text-muted">
                        Always on
                      </span>
                    ) : (
                      <Switch
                        checked={group.enabled}
                        onChange={(checked) => setNotificationGroup(group.id, checked)}
                        label={group.label}
                      />
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
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

      <EditProfileModal
        open={isEditOpen}
        onClose={() => setEditOpen(false)}
        overview={overview}
        onSaved={setOverview}
      />
      <StudyPreferencesModal
        open={isPrefsOpen}
        onClose={() => setPrefsOpen(false)}
        preferences={prefs}
        onSaved={setOverview}
      />
      <ConfirmModal
        open={isLogoutConfirmOpen}
        onClose={() => setLogoutConfirmOpen(false)}
        onConfirm={async () => {
          await performLogout();
          router.push("/login");
        }}
        title="Log out"
        description="Are you sure you want to logout?"
        confirmLabel="Logout"
      />
    </div>
  );
}
