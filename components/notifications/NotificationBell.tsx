"use client";

import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationCard,
  type NotificationFeed,
} from "@/lib/api/notifications";
import { BellIcon } from "@/assets/icons";

/**
 * The bell in every page header.
 *
 * Reads the feed on mount and on every navigation — which is what makes "a
 * dot appears when something new arrived" true without a socket — and again
 * when the tab regains focus, so a screen left open overnight isn't showing
 * yesterday's state. A slow poll covers a session that sits on one screen.
 *
 * Ordering, copy and the unread count all come from the server; this only
 * decides how they look. Marking read is optimistic: the row is already open
 * in front of the student, and a failed PATCH is corrected by the next fetch
 * rather than by an error the student can do nothing about.
 */

const POLL_INTERVAL_MS = 60_000;
const FEED_LIMIT = 20;

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";

  const minutes = Math.round((Date.now() - then) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(then).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

type NotificationBellProps = {
  /**
   * Header styling varies by page (the stats header uses a flatter chip than
   * the home header), so the trigger's classes stay with the page that owns
   * the header rather than being hard-coded here.
   */
  className?: string;
};

const DEFAULT_TRIGGER_CLASS =
  "flex h-11 w-11 items-center justify-center rounded-full bg-icon-action-bg text-icon-action-text transition-colors hover:bg-tint-strong";

export function NotificationBell({ className }: NotificationBellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationCard[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoaded, setLoaded] = useState(false);
  // Below `sm` the panel is pinned to the viewport rather than to the bell —
  // the bell isn't at the header's right edge, so a right-anchored 22rem panel
  // would spill off the left of a phone screen. This is where it starts.
  const [panelTop, setPanelTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const applyFeed = useCallback((feed: NotificationFeed) => {
    setItems(feed.notifications);
    setUnreadCount(feed.unreadCount);
    setLoaded(true);
  }, []);

  /**
   * A failed fetch leaves the last good feed on screen — the bell is ambient,
   * and an error state here would be louder than the feature itself.
   */
  const refresh = useCallback(
    () =>
      getNotifications({ limit: FEED_LIMIT })
        .then(({ data }) => applyFeed(data))
        .catch(() => setLoaded(true)),
    [applyFeed],
  );

  // On mount and on every navigation — the "check on each refresh" pass.
  // Written as a promise chain rather than a call to `refresh` so the state
  // writes land in a callback, and so a navigation mid-flight can't apply a
  // feed to the next screen's bell.
  useEffect(() => {
    const controller = new AbortController();
    getNotifications({ limit: FEED_LIMIT })
      .then(({ data }) => {
        if (!controller.signal.aborted) applyFeed(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoaded(true);
      });
    return () => controller.abort();
  }, [applyFeed, pathname]);

  // Back from another tab, plus a slow poll for a session parked on one screen.
  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === "visible") void refresh();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    const timer = window.setInterval(() => void refresh(), POLL_INTERVAL_MS);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      window.clearInterval(timer);
    };
  }, [refresh]);

  // Close on an outside click or Escape, matching UserMenu.
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleOpen = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setPanelTop(rect.bottom + 8);
    setOpen((open) => {
      // Opening is also the freshest moment to re-check — the poll may be up
      // to a minute stale.
      if (!open) void refresh();
      return !open;
    });
  };

  const handleItemClick = (item: NotificationCard) => {
    if (!item.isRead) {
      setItems((current) =>
        current.map((row) =>
          row.id === item.id ? { ...row, isRead: true, readAt: new Date().toISOString() } : row,
        ),
      );
      setUnreadCount((count) => Math.max(0, count - 1));
      void markNotificationRead(item.id).catch(() => void refresh());
    }

    if (item.actionUrl) {
      setOpen(false);
      router.push(item.actionUrl);
    }
  };

  const handleMarkAllRead = () => {
    const readAt = new Date().toISOString();
    setItems((current) => current.map((row) => (row.isRead ? row : { ...row, isRead: true, readAt })));
    setUnreadCount(0);
    void markAllNotificationsRead().catch(() => void refresh());
  };

  const hasUnread = unreadCount > 0;

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        aria-label={hasUnread ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={`relative ${className ?? DEFAULT_TRIGGER_CLASS}`}
      >
        <BellIcon />

        {/* The glow: a solid dot with a slow ping ring behind it. */}
        {hasUnread && (
          <span className="absolute right-2.5 top-2.5 flex h-2.5 w-2.5" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cta opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cta ring-2 ring-surface" />
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="Notifications"
          style={{ "--panel-top": `${panelTop}px` } as CSSProperties}
          className="
            fixed inset-x-3 top-(--panel-top) z-40
            flex max-h-[min(26rem,calc(100dvh-var(--panel-top)-0.75rem))] flex-col
            overflow-hidden rounded-xl border border-brand/10
            bg-surface shadow-modal
            sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2
            sm:max-h-[26rem] sm:w-[22rem] sm:max-w-[calc(100vw-2rem)]
          "
        >
          <div className="flex items-center justify-between gap-3 border-b border-brand/10 px-3 py-3 sm:px-4">
            <p className="text-sm font-bold text-ink">
              Notifications
              {hasUnread && <span className="ml-1.5 font-semibold text-cta">{unreadCount}</span>}
            </p>
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={!hasUnread}
              className="text-xs font-semibold text-muted transition-colors hover:text-ink disabled:cursor-default disabled:opacity-40 disabled:hover:text-muted"
            >
              Mark all read
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted">
                {isLoaded ? "You're all caught up." : "Loading…"}
              </p>
            ) : (
              <ul>
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => handleItemClick(item)}
                      className={`flex w-full gap-2.5 border-b border-brand/5 px-3 py-3 text-left sm:gap-3 sm:px-4 transition-colors last:border-b-0 hover:bg-tint-strong ${
                        item.isRead ? "" : "bg-tint"
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                          item.isRead ? "bg-transparent" : "bg-cta"
                        }`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span
                            className={`truncate text-sm text-ink ${
                              item.isRead ? "font-semibold" : "font-bold"
                            }`}
                          >
                            {item.title}
                          </span>
                          <span className="shrink-0 text-[11px] font-medium text-muted">
                            {relativeTime(item.createdAt)}
                          </span>
                        </span>
                        <span className="mt-0.5 block break-words text-xs leading-5 text-muted">
                          {item.message}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
