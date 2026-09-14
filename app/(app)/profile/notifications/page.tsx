"use client";

import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { Button } from "@/components/ui/Button";
import { MoonIcon, RefreshIcon, LockIcon } from "@/components/ui/icons";
import { ProfileSubpageHeader } from "@/components/profile/ProfileSubpageHeader";
import { SettingRow } from "@/components/profile/SettingRow";
import { Switch } from "@/components/ui/Switch";
import { PageLoader } from "@/components/ui/PageLoader";
import { ClockIcon, BellIcon } from "@/assets/icons";
import { notificationGroupIcon } from "@/components/profile/notificationGroupIcons";
import {
  getNotificationSettings,
  updateNotificationSettings,
  resetNotificationSettings,
  type NotificationSettings,
  type NotificationSettingsPatch,
  type PreferenceGroup,
} from "@/lib/api/notifications";



/**
 * Opens the native time picker from anywhere in a Quiet Hours field. The
 * browser's own picker icon is hidden (it overflowed the narrow box, leaving a
 * second clock outside the border), so our clock icon is the only one shown.
 */
function openTimePicker(event: MouseEvent<HTMLElement>) {
  const input = event.currentTarget.querySelector("input");
  try {
    input?.showPicker();
  } catch {
    // showPicker isn't available everywhere — fall back to focusing the field.
    input?.focus();
  }
}

function allGroups(settings: NotificationSettings): PreferenceGroup[] {
  return settings.categories.flatMap((category) => category.groups);
}

export default function NotificationSettingsPage() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [isLoaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getNotificationSettings()
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        setSettings(data);
        setLoaded(true);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setError("Couldn't load your notification settings. Pull to refresh or try again shortly.");
        setLoaded(true);
      });
    return () => controller.abort();
  }, []);

  const save = useCallback(
    (patch: NotificationSettingsPatch, optimistic: (current: NotificationSettings) => NotificationSettings) => {
      setSettings((current) => (current ? optimistic(current) : current));
      setError(null);

      return updateNotificationSettings(patch)
        .then(({ data }) => setSettings(data))
        .catch(() => {
          setError("That change didn't save. Check your connection and try again.");
          return getNotificationSettings()
            .then(({ data }) => setSettings(data))
            .catch(() => undefined);
        });
    },
    [],
  );

  const setMaster = (enabled: boolean) =>
    void save({ masterEnabled: enabled }, (current) => ({ ...current, masterEnabled: enabled }));

  const setCategory = (id: NotificationSettings["categories"][number]["id"], enabled: boolean) =>
    void save({ categories: { [id]: enabled } }, (current) => ({
      ...current,
      categories: current.categories.map((category) =>
        category.id === id ? { ...category, enabled } : category,
      ),
    }));

  const setGroup = (groupId: string, enabled: boolean) =>
    void save({ groups: { [groupId]: enabled } }, (current) => ({
      ...current,
      categories: current.categories.map((category) => ({
        ...category,
        groups: category.groups.map((group) =>
          group.id === groupId ? { ...group, enabled } : group,
        ),
      })),
    }));

  const setQuietHours = (patch: { enabled?: boolean; start?: string; end?: string }) =>
    void save({ quietHours: patch }, (current) => ({
      ...current,
      quietHours: { ...current.quietHours, ...patch },
    }));

  const resetToDefault = () => {
    setError(null);
    void resetNotificationSettings()
      .then(({ data }) => setSettings(data))
      .catch(() => setError("Couldn't reset your preferences. Try again shortly."));
  };

  if (!isLoaded) return <PageLoader label="Loading your notification settings…" />;

  if (!settings) {
    return (
      <div className="flex flex-col gap-5 p-4 sm:p-6 lg:p-8">
        <ProfileSubpageHeader title="Notification setting" />
        <p className="rounded-xl border border-brand/10 bg-surface px-5 py-6 text-sm text-muted">
          {error ?? "Notification settings are unavailable right now."}
        </p>
      </div>
    );
  }

  const groups = allGroups(settings);

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <ProfileSubpageHeader title="Notification setting" />

      {error && (
        <p
          role="status"
          className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-xs font-semibold text-warning"
        >
          {error}
        </p>
      )}

      <SettingRow
        icon={<BellIcon />}
        title="Master Notifications"
        subtitle="Enable or disable all notifications from prepex."
        iconClassName="bg-[#EEF0F8] text-[#1A1A4E] dark:border-[#FAF7F2] dark:bg-[#FAF7F2]/8 dark:text-[#FAF7F2]"
        right={
          <Switch checked={settings.masterEnabled} onChange={setMaster} label="Master Notifications" />
        }
      />

      {/* PRD 19.2 — the three categories, each with its own toggle (19.9). */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {settings.categories.map((category) => (
          <div
            key={category.id}
            className="flex h-full min-h-[226px] flex-col rounded-xl border border-brand/10 bg-surface p-6 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className="max-w-[170px]">
                <h3 className="text-[16px] font-bold leading-6 text-ink">{category.label}</h3>
                <p className="mt-1 text-[11px] leading-[14px] text-muted">{category.description}</p>
              </div>

              <Switch
                checked={category.enabled}
                onChange={(checked) => setCategory(category.id, checked)}
                label={category.label}
              />
            </div>

            <ul className="mt-6 flex flex-1 flex-col gap-[11px]">
              {category.groups.map((group) => (
                <li key={group.id} className="flex items-center gap-3">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ink" />
                  <span className="text-[12px] leading-4 text-muted">{group.label}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

 
      <div className="rounded-xl border border-brand/10 bg-surface p-2 shadow-sm">
        {/* Stacked until xl — side by side at lg, the time fields and button
            (~500px) left the description only ~200px. The header is inline
            rather than SettingRow, whose fixed 24px padding, 48px tile and
            16/14px text can't step down on phones. */}
        <div className="flex flex-col gap-4 p-3 sm:gap-5 sm:p-6 xl:flex-row xl:items-center xl:justify-between xl:gap-6">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4 xl:flex-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tint text-ink sm:h-12 sm:w-12">
              {/* 24×24 frame from sm (the moon draws ~17px, 2px stroke); 20×20 on phones. */}
              <MoonIcon className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0">
              <h3 className="text-[15px] font-bold leading-6 text-ink sm:text-[16px]">Quiet Hours</h3>
              <p className="mt-0.5 text-[12px] leading-4.5 text-muted sm:mt-1 sm:text-[14px] sm:leading-5">
                {settings.quietHours.enforced
                  ? "Pause notifications during the time you choose."
                  : "Saved for when Prepex sends notifications to your phone. The in-app bell is never interrupting, so nothing is held back today."}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4 xl:shrink-0">
            {/* The window only matters while quiet hours are on — hidden until
                "Enable Quiet Hours" is pressed, and again after "No Quiet Hours". */}
            {settings.quietHours.enabled && (
            <div className="flex items-end gap-4">
              <div className="flex flex-1 flex-col sm:flex-none">
                <label
                  htmlFor="quiet-from"
                  className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted sm:text-[11px]"
                >
                  From
                </label>
                <div
                  onClick={openTimePicker}
                  className="flex h-10 w-full cursor-pointer items-center gap-2 rounded-lg border border-[#F1F5F9] bg-[#F8FAFC] px-3 dark:border-(--border-card,#FAF7F214) dark:bg-(--bg-card,#111145) sm:h-9 sm:w-34"
                >
                  <ClockIcon className="size-4 shrink-0" />
                  <input
                    id="quiet-from"
                    type="time"
                    value={settings.quietHours.start}
                    onChange={(event) => setQuietHours({ start: event.target.value })}
                    className="w-full min-w-0 cursor-pointer bg-transparent text-[13px] font-semibold leading-5 text-ink outline-none sm:text-sm [&::-webkit-calendar-picker-indicator]:hidden"
                  />
                </div>
              </div>

              <span className="pb-2.5 text-muted sm:pb-2">—</span>

              <div className="flex flex-1 flex-col sm:flex-none">
                <label
                  htmlFor="quiet-to"
                  className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted sm:text-[11px]"
                >
                  To
                </label>
                <div
                  onClick={openTimePicker}
                  className="flex h-10 w-full cursor-pointer items-center gap-2 rounded-lg border border-[#F1F5F9] bg-[#F8FAFC] px-3 dark:border-(--border-card,#FAF7F214) dark:bg-(--bg-card,#111145) sm:h-9 sm:w-34"
                >
                  <ClockIcon className="size-4 shrink-0" />
                  <input
                    id="quiet-to"
                    type="time"
                    value={settings.quietHours.end}
                    onChange={(event) => setQuietHours({ end: event.target.value })}
                    className="w-full min-w-0 cursor-pointer bg-transparent text-[13px] font-semibold leading-5 text-ink outline-none sm:text-sm [&::-webkit-calendar-picker-indicator]:hidden"
                  />
                </div>
              </div>
            </div>
            )}

            <Button
              variant="secondary"
              onClick={() => setQuietHours({ enabled: !settings.quietHours.enabled })}
              className="h-10! w-full gap-2 rounded-lg border px-4 py-2 text-[13px]! font-semibold whitespace-nowrap sm:h-9.5! sm:w-[168.64px] sm:text-caption!"
            >
              {settings.quietHours.enabled ? "No Quiet Hours" : "Enable Quiet Hours"}
            </Button>
          </div>
        </div>
      </div>

      {/* PRD 19.9 — granular per-notification opt-out. */}
      <div className="flex flex-col gap-4 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-sans text-[14px] font-bold leading-5 tracking-normal align-middle text-ink sm:text-[16px] sm:leading-6">
              Individual Notification Preferences
            </p>
            <p className="text-xs text-muted">
              Fine-tune individual notifications as per your preference
            </p>
          </div>
        
          <Button
            variant="secondary"
            size="sm"
            onClick={resetToDefault}
            className="h-8.5! gap-2! rounded-lg! border! border-[#EEF0F8]! bg-white! px-4! py-2! font-sans text-[12px]! font-bold! leading-4 tracking-normal text-center align-middle dark:border-(--border-card,#FAF7F214)! dark:bg-(--bg-card,#111145)!"
          >
            {/* 16×16 frame: the 24-unit icon draws ~11px with a 1.33px line. */}
            <RefreshIcon className="h-4 w-4 shrink-0" /> Reset to Default
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-x-6 gap-y-3 lg:grid-cols-2">
          {groups.map((group) => (
            <div
              key={group.id}
              className="flex h-[74px] items-center justify-between rounded-xl border border-brand/10 bg-surface px-4 shadow-sm"
            >
              <div className="flex min-w-0 items-center gap-4">
                {/* Every group icon in a 20×20 frame with a 1.67px line (Figma), set
                    from the tile since the shared icon map hands back ready-made
                    elements drawn at 14–24px. */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EEF0F8] text-[#1A1A4E] dark:bg-[#FAF7F2]/8 dark:text-[#FAF7F2] [&_svg]:h-5 [&_svg]:w-5 [&_svg]:shrink-0 **:stroke-[1.67px] **:[vector-effect:non-scaling-stroke]">
                  {notificationGroupIcon(group.id)}
                </div>

                <div className="min-w-0">
                  <h3 className="truncate text-[14px] font-bold leading-5 text-ink">{group.label}</h3>
                  <p className="mt-0.5 text-[11px] leading-4 text-muted">{group.description}</p>
                </div>
              </div>

              {group.alwaysOn ? (
                /* No opt-out by design — a student in a hard stretch must not
                   have silenced the one message pointing them at support. */
                <span
                  title="Always on"
                  className="flex shrink-0 items-center gap-1.5 rounded-full bg-tint px-2.5 py-1 text-[10px] font-bold text-muted"
                >
                  <LockIcon />
                  Always on
                </span>
              ) : (
                <Switch
                  checked={group.enabled}
                  onChange={(checked) => setGroup(group.id, checked)}
                  label={group.label}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
