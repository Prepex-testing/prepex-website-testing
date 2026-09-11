"use client";

import { useCallback, useEffect, useState } from "react";
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
 * PRD Section 19.9 — notification settings.
 *
 * The three category cards are the PRD's own categories (19.2): Functional,
 * Engagement, Relational. They replaced an earlier Critical / Awareness /
 * Engagements grouping whose membership disagreed with the PRD's — since the
 * 19.6 daily caps are counted *per category*, a card that groups notifications
 * differently from the cap engine would misreport what it controls.
 *
 * Every switch is server-owned. The catalog of groups arrives from
 * /api/notifications/settings rather than being listed here, so a new
 * notification type gets its switch without a client release — and no switch
 * can exist here for something the backend won't honour.
 */


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

  /**
   * Every switch writes through this. The toggle moves immediately and the
   * server's response replaces local state — a category switch changes what
   * its child groups effectively do, and only the server knows the resolved
   * shape. On failure the previous state is restored so a switch never lies
   * about what was saved.
   */
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

      {/* PRD 19.9 — quiet hours. Stored now, applied when push ships. */}
      <div className="rounded-xl border border-brand/10 bg-surface p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <SettingRow
            icon={<MoonIcon />}
            title="Quiet Hours"
            subtitle={
              settings.quietHours.enforced
                ? "Pause notifications during the time you choose."
                : "Saved for when Prepex sends notifications to your phone. The in-app bell is never interrupting, so nothing is held back today."
            }
            iconClassName="h-12 w-12 rounded-xl bg-tint text-ink"
          />

          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end lg:shrink-0">
            <div className="flex items-end gap-4">
              <div className="flex flex-1 flex-col sm:flex-none">
                <label
                  htmlFor="quiet-from"
                  className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted sm:text-[11px]"
                >
                  From
                </label>
                <div className="flex h-9 w-full items-center gap-2 rounded-lg border border-brand/10 bg-surface px-3 sm:w-32">
                  <ClockIcon className="size-4 shrink-0" />
                  <input
                    id="quiet-from"
                    type="time"
                    value={settings.quietHours.start}
                    disabled={!settings.quietHours.enabled}
                    onChange={(event) => setQuietHours({ start: event.target.value })}
                    className="w-full bg-transparent text-xs font-semibold leading-5 text-ink outline-none disabled:opacity-40 sm:text-sm"
                  />
                </div>
              </div>

              <span className="pb-2 text-muted">—</span>

              <div className="flex flex-1 flex-col sm:flex-none">
                <label
                  htmlFor="quiet-to"
                  className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted sm:text-[11px]"
                >
                  To
                </label>
                <div className="flex h-9 w-full items-center gap-2 rounded-lg border border-brand/10 bg-surface px-3 sm:w-32">
                  <ClockIcon className="size-4 shrink-0" />
                  <input
                    id="quiet-to"
                    type="time"
                    value={settings.quietHours.end}
                    disabled={!settings.quietHours.enabled}
                    onChange={(event) => setQuietHours({ end: event.target.value })}
                    className="w-full bg-transparent text-xs font-semibold leading-5 text-ink outline-none disabled:opacity-40 sm:text-sm"
                  />
                </div>
              </div>
            </div>

            <Button
              variant="secondary"
              onClick={() => setQuietHours({ enabled: !settings.quietHours.enabled })}
              className="h-9.5! w-full gap-2 rounded-lg border px-4 py-2 text-xs! font-semibold whitespace-nowrap sm:w-[168.64px] sm:text-caption"
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
            <p className="text-sm font-bold text-ink">Individual Notification Preferences</p>
            <p className="text-xs text-muted">
              Fine-tune individual notifications as per your preference
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={resetToDefault}>
            <RefreshIcon /> Reset to Default
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-x-6 gap-y-3 lg:grid-cols-2">
          {groups.map((group) => (
            <div
              key={group.id}
              className="flex h-[74px] items-center justify-between rounded-xl border border-brand/10 bg-surface px-4 shadow-sm"
            >
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EEF0F8] text-[#1A1A4E] dark:bg-[#FAF7F2]/8 dark:text-[#FAF7F2]">
                  {notificationGroupIcon(group.id)}
                </div>

                <div className="min-w-0">
                  <h3 className="truncate text-[14px] font-bold leading-5 text-ink">{group.label}</h3>
                  <p className="mt-0.5 text-[12px] leading-4 text-muted">{group.description}</p>
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
