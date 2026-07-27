"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { EditIcon, MoonIcon, PencilIcon, RefreshIcon, SmileIcon } from "@/components/ui/icons";
import { ProfileSubpageHeader } from "@/components/profile/ProfileSubpageHeader";
import { SettingRow } from "@/components/profile/SettingRow";
import { ToggleRow } from "@/components/profile/ToggleRow";
import { Switch } from "@/components/ui/Switch";
import { ClockIcon, CalendarIcon, TargetIcon, BellIcon, EditIcons, Patners, StarIcon } from "@/assets/icons";
const GROUPS = [
  {
    id: "critical",
    title: "Critical",
    subtitle: "Essential reminders that keep you on track.",
    items: ["Daily Plan Ready", "Daily Check-In", "Revision Reminder", "Streak Alerts"],
    enabled: true,
  },
  {
    id: "awareness",
    title: "Awareness",
    subtitle: " and learning awareness notifications.",
    items: ["Weekly Win Journal", "Accountability Partner Signals", "Mock Test Reminders"],
    enabled: true,
  },
  {
    id: "engagements",
    title: "Engagements",
    subtitle: "Stay engaged and informed weekly.",
    items: ["Weekly Report"],
    enabled: false,
  },
];

const INDIVIDUAL_ITEMS = [
  {
    id: "daily-plan",
    icon: <CalendarIcon />,
    label: "Daily Plan Ready",
    subtitle: "Get notified when your daily plan is ready",
  },
  {
    id: "weekly-journal",
    icon: <EditIcons />,
    label: "Weekly Win Journal",
    subtitle: "Your weekly summary and wins",
  },
  {
    id: "check-in",
    icon: <CalendarIcon />,
    label: "Daily Check-In",
    subtitle: "Reminder to check-in every morning",
  },
  {
    id: "partner-signals",
    icon: <Patners />,
    label: "Accountability Partner Signals",
    subtitle: "Updates and nudges from your partner",
  },
  {
    id: "revision",
    icon: <RefreshIcon />,
    label: "Revision Reminder",
    subtitle: "Reminders for scheduled revision tasks",
  },
  {
    id: "mock-test",
    icon: <CalendarIcon />,
    label: "Mock Test Reminder",
    subtitle: "Reminders for upcoming mock tests",
  },
  {
    id: "streak-alert",
    icon: <StarIcon />,
    label: "Streak Alert",
    subtitle: "Alerts for streak milestones and updates",
  },
  {
    id: "weekly-report",
    icon: <TargetIcon />,
    label: "Weekly Report",
    subtitle: "Weekly progress report for your parent",
  },
];

export default function NotificationSettingsPage() {
  const [master, setMaster] = useState(true);
  const [groups, setGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(GROUPS.map((group) => [group.id, group.enabled])),
  );
  const [individual, setIndividual] = useState<Record<string, boolean>>({
    "daily-plan": true,
    "weekly-journal": true,
    "check-in": true,
    "partner-signals": false,
    revision: true,
    "mock-test": true,
    "streak-alert": true,
    "weekly-report": false,
  });

  const resetToDefault = () => {
    setIndividual({
      "daily-plan": true,
      "weekly-journal": true,
      "check-in": true,
      "partner-signals": false,
      revision: true,
      "mock-test": true,
      "streak-alert": true,
      "weekly-report": false,
    });
  };

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <ProfileSubpageHeader title="Notification setting" />

      <SettingRow
        icon={<BellIcon />}
        title="Master Notifications"
        subtitle="Enable or disable all notifications from Prepex."
        iconClassName="bg-[#EEF0F8] text-[#1A1A4E] dark:border-[#FAF7F2] dark:bg-[#FAF7F2]/8 dark:text-[#FAF7F2]"
        right={
          <Switch
            checked={master}
            onChange={setMaster}
            label="Master Notifications"
          />
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {GROUPS.map((group) => (
          <div
            key={group.id}
            className="
        flex h-full min-h-[226px] flex-col
        rounded-xl
        border border-brand/10
        bg-surface
        p-6
        shadow-sm
      "
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="max-w-[170px]">
                <h3 className="text-[16px] font-bold leading-6 text-ink">
                  {group.title}
                </h3>

                <p className="mt-1 text-[11px] leading-[14px] text-muted">
                  {group.subtitle}
                </p>
              </div>

              <Switch
                checked={groups[group.id]}
                onChange={(checked) =>
                  setGroups((current) => ({
                    ...current,
                    [group.id]: checked,
                  }))
                }
                label={group.title}
              />
            </div>

            {/* Items */}
            <ul className="mt-6 flex flex-1 flex-col gap-[11px]">
              {group.items.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-3"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-ink shrink-0" />

                  <span className="text-[12px] leading-4 text-muted">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-brand/10 bg-surface p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

          {/* Left */}
          <SettingRow
            icon={<MoonIcon />}
            title="Quiet Hours"
            subtitle="Pause notifications during the time you choose."
            iconClassName="h-12 w-12 rounded-xl bg-tint text-ink"
          />

          {/* Right */}
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end lg:shrink-0">

            <div className="flex items-end gap-4">

              {/* From */}
              <div className="flex flex-1 flex-col sm:flex-none">
                <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted sm:text-[11px]">
                  From
                </p>

                <div className="flex h-9 w-full items-center gap-2 rounded-lg border border-brand/10 bg-surface px-3 sm:w-32">
                  <ClockIcon className="size-4 shrink-0" />

                  <span className="text-xs font-semibold leading-5 text-ink sm:text-sm">
                    11:00 PM
                  </span>
                </div>
              </div>


              <span className="pb-2 text-muted">—</span>

              {/* To */}
              <div className="flex flex-1 flex-col sm:flex-none">
                <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted sm:text-[11px]">
                  To
                </p>

                <div className="flex h-9 w-full items-center gap-2 rounded-lg border border-brand/10 bg-surface px-3 sm:w-32">
                  <ClockIcon className="size-4 shrink-0" />

                  <span className="text-xs font-semibold leading-5 text-ink sm:text-sm">
                    06:00 AM
                  </span>
                </div>
              </div>

            </div>

            <Button
              variant="secondary"
              className="h-9.5! w-full gap-2 rounded-lg border px-4 py-2 text-xs! font-semibold whitespace-nowrap sm:w-[168.64px] sm:text-caption"
            >
              <PencilIcon />
              Edit Quiet Hours
            </Button>

          </div>

        </div>
      </div>

      <div className="flex flex-col gap-4 pb-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3"> <div> <p className="text-sm font-bold text-ink">Individual Notification Preferences</p> <p className="text-xs text-muted"> Fine-tune individual notifications as per your preference </p> </div> <Button variant="secondary" size="sm" onClick={resetToDefault}> <RefreshIcon /> Reset to Default </Button> </div>

        {/* Body */}
        <div className="grid grid-cols-1 gap-x-6 gap-y-3 lg:grid-cols-2">

          {INDIVIDUAL_ITEMS.map((item) => (
            <div
              key={item.id}
              className="flex h-[74px] items-center justify-between rounded-xl border border-brand/10 bg-surface px-4 shadow-sm"
            >

              {/* Left */}
              <div className="flex items-center gap-4">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg  bg-[#EEF0F8] text-[#1A1A4E]  dark:bg-[#FAF7F2]/8 dark:text-[#FAF7F2]">
                  {item.icon}
                </div>

                <div>
                  <h3 className="text-[14px] font-bold leading-5 text-ink">
                    {item.label}
                  </h3>

                  <p className="mt-0.5 text-[12px] leading-4 text-muted">
                    {item.subtitle}
                  </p>
                </div>

              </div>

              {/* Switch */}
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={individual[item.id] ?? false}
                  onChange={(e) =>
                    setIndividual((current) => ({
                      ...current,
                      [item.id]: e.target.checked,
                    }))
                  }
                />

                <div
                  className="
              relative h-6 w-11 rounded-full
              border border-brand/15
              bg-tint
              transition-colors
              peer-checked:border-transparent
              peer-checked:bg-toggle-on

              after:absolute
              after:left-[2px]
              after:top-[2px]
              after:h-5
              after:w-5
              after:rounded-full
              after:bg-white
              after:transition-transform
              peer-checked:after:bg-surface
              peer-checked:after:translate-x-5
            "
                />
              </label>

            </div>
          ))}

        </div>

      </div>
    </div>
  );
}
