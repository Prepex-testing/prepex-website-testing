"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { BellIcon, MoonIcon, RefreshIcon } from "@/components/ui/icons";
import { ProfileSubpageHeader } from "@/components/profile/ProfileSubpageHeader";
import { SettingRow } from "@/components/profile/SettingRow";
import { ToggleRow } from "@/components/profile/ToggleRow";
import { Switch } from "@/components/ui/Switch";

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
    subtitle: "Progress and learning awareness notifications.",
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
  { id: "daily-plan", label: "Daily Plan Ready", subtitle: "Get notified when your daily plan is ready" },
  { id: "weekly-journal", label: "Weekly Win Journal", subtitle: "Your weekly summary and wins" },
  { id: "check-in", label: "Daily Check-In", subtitle: "Reminder to check-in every morning" },
  { id: "partner-signals", label: "Accountability Partner Signals", subtitle: "Updates and nudges from your partner" },
  { id: "revision", label: "Revision Reminder", subtitle: "Reminders for scheduled revision tasks" },
  { id: "mock-test", label: "Mock Test Reminder", subtitle: "Reminders for upcoming mock tests" },
  { id: "streak-alert", label: "Streak Alert", subtitle: "Alerts for streak milestones and updates" },
  { id: "weekly-report", label: "Weekly Report", subtitle: "Weekly progress report for your parent" },
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

      <div className="rounded-2xl border border-brand/10 bg-surface p-5">
        <SettingRow
          icon={<BellIcon />}
          title="Master Notifications"
          subtitle="Enable or disable all notifications from Prepex."
          right={<Switch checked={master} onChange={setMaster} label="Master Notifications" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {GROUPS.map((group) => (
          <div key={group.id} className="rounded-2xl border border-brand/10 bg-surface p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-ink">{group.title}</p>
                <p className="mt-0.5 text-xs text-muted">{group.subtitle}</p>
              </div>
              <Switch
                checked={groups[group.id]}
                onChange={(checked) => setGroups((current) => ({ ...current, [group.id]: checked }))}
                label={group.title}
              />
            </div>
            <ul className="mt-3 flex flex-col gap-1.5">
              {group.items.map((item) => (
                <li key={item} className="text-xs text-muted">
                  • {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-brand/10 bg-surface p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <SettingRow
            icon={<MoonIcon />}
            title="Quiet Hours"
            subtitle="Pause notifications during the time you choose."
          />
          <div className="flex flex-wrap items-center gap-3 sm:shrink-0">
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-wide text-muted">From</p>
              <p className="flex items-center gap-1 text-sm font-semibold text-ink">
                11:00 PM
              </p>
            </div>
            <span className="text-muted">—</span>
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-wide text-muted">To</p>
              <p className="text-sm font-semibold text-ink">06:00 AM</p>
            </div>
            <Button variant="secondary" size="sm">
              Edit Quiet Hours
            </Button>
          </div>
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-ink">Individual Notification Preferences</p>
            <p className="text-xs text-muted">
              Fine-tune individual notifications as per your preference
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={resetToDefault}>
            <RefreshIcon />
            Reset to Default
          </Button>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-x-6 rounded-2xl border border-brand/10 bg-surface p-5 sm:grid-cols-2">
          {INDIVIDUAL_ITEMS.map((item) => (
            <ToggleRow
              key={item.id}
              title={item.label}
              subtitle={item.subtitle}
              checked={individual[item.id]}
              onChange={(checked) =>
                setIndividual((current) => ({ ...current, [item.id]: checked }))
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
