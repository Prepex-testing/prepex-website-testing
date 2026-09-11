import { CORE_API_BASE_URL } from "@/lib/api/config";
import { authenticatedRequest } from "@/lib/api/authRequest";

function authRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  return authenticatedRequest<T>(`${CORE_API_BASE_URL}/api/notifications${path}`, options);
}

/**
 * In-app notifications.
 *
 * The server owns both the copy and when a notification is due — the client
 * asks what's waiting and renders it. Types are a stable handle for icons and
 * grouping; the strings themselves can change server-side without a release.
 */
export type NotificationType =
  | "PLAN_READY"
  | "PARTNER_MATCH_AVAILABLE"
  | "PARTNER_INACTIVE_2D"
  | "PARTNER_INACTIVE_7D"
  | "PARTNER_INACTIVE_14D"
  | "PARTNER_MESSAGE"
  | "PARTNER_GOAL_SUNDAY"
  | "PARTNER_GOAL_FRIDAY"
  | "PARTNER_GOAL_SATURDAY"
  | "WIN_JOURNAL_READY"
  | "STREAK_MILESTONE"
  | "BACKLOG_HELD_NUDGE"
  | "MOCK_DAY_BEFORE"
  | "MOCK_DAY_MORNING"
  | "MOCK_HOUR_BEFORE"
  | "MOCK_DAY_AFTER"
  | "MOCK_RESULT_PENDING"
  | "MOCK_RECOVERY_DEFER"
  | "BURNOUT_RECOVERY_SUGGESTED"
  | "BURNOUT_RECOVERY_ACTIVATED"
  | "BURNOUT_CRITICAL";

export type NotificationCard = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  /** In-app route the card opens, or null for a purely informational one. */
  actionUrl: string | null;
  metadata: Record<string, unknown> | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
};

export type NotificationFeed = {
  /** Every unread row the student has — not just the ones in this page. */
  unreadCount: number;
  /** What lights the dot on the bell. */
  hasUnread: boolean;
  /** Unread first, newest within each group. */
  notifications: NotificationCard[];
};

export function getNotifications(options: { limit?: number; unreadOnly?: boolean } = {}) {
  const params = new URLSearchParams();
  if (options.limit !== undefined) params.set("limit", String(options.limit));
  if (options.unreadOnly) params.set("unreadOnly", "true");
  const query = params.toString();

  return authRequest<{ success: true; data: NotificationFeed }>(query ? `/?${query}` : "/");
}

/** Dot only — for a poll that doesn't need the list. */
export function getUnreadCount() {
  return authRequest<{ success: true; data: { unreadCount: number; hasUnread: boolean } }>(
    "/unread-count",
  );
}

export function markNotificationRead(id: string) {
  return authRequest<{ success: true; data: NotificationCard }>(`/${id}/read`, {
    method: "PATCH",
  });
}

export function markAllNotificationsRead() {
  return authRequest<{
    success: true;
    data: { markedRead: number; unreadCount: number; hasUnread: boolean };
  }>("/read-all", { method: "PATCH" });
}

// ---------------------------------------------------------------------------
// PRD 19.9 — notification settings
// ---------------------------------------------------------------------------

/** PRD 19.2 — Functional (A), Engagement (B), Relational (C). */
export type NotificationCategoryId = "FUNCTIONAL" | "ENGAGEMENT" | "RELATIONAL";

/**
 * One switch on the settings screen. Several notification types can sit under
 * one group (all six mock reminders, say) — the server owns that mapping, so
 * a new notification type appears here on its own without a client release.
 */
export type PreferenceGroup = {
  id: string;
  category: NotificationCategoryId;
  label: string;
  description: string;
  types: NotificationType[];
  enabled: boolean;
  /** No opt-out — the tier-5 wellbeing message. Render it locked, not off. */
  alwaysOn: boolean;
};

export type NotificationCategory = {
  id: NotificationCategoryId;
  label: string;
  description: string;
  /** PRD 19.6 ceiling for this category. Not yet enforced — see `enforced`. */
  dailyCap: number;
  enabled: boolean;
  groups: PreferenceGroup[];
};

export type NotificationSettings = {
  masterEnabled: boolean;
  categories: NotificationCategory[];
  quietHours: {
    enabled: boolean;
    /** "HH:MM", 24-hour. */
    start: string;
    end: string;
    /** False until a push channel exists — the preference is stored only. */
    enforced: boolean;
  };
  dailyCaps: {
    total: number;
    functional: number;
    engagement: number;
    relational: number;
    enforced: boolean;
  };
};

/** Every field optional — send only what changed. */
export type NotificationSettingsPatch = {
  masterEnabled?: boolean;
  categories?: Partial<Record<NotificationCategoryId, boolean>>;
  /** Keyed by preference-group id. */
  groups?: Record<string, boolean>;
  quietHours?: { enabled?: boolean; start?: string; end?: string };
};

export function getNotificationSettings() {
  return authRequest<{ success: true; data: NotificationSettings }>("/settings");
}

export function updateNotificationSettings(patch: NotificationSettingsPatch) {
  return authRequest<{ success: true; data: NotificationSettings }>("/settings", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

/** PRD 19.9 defaults: everything on, quiet hours 23:00–06:00. */
export function resetNotificationSettings() {
  return authRequest<{ success: true; data: NotificationSettings }>("/settings/reset", {
    method: "POST",
  });
}
