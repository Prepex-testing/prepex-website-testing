"use client";

import { Fragment, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { getMessages, type MessageCategory, type PartnerMessage } from "@/lib/api/partner";

/** Signals shown at first, and fetched per "older" page. */
export const SIGNALS_PAGE_SIZE = 6;

/** Distance from the top (px) at which scrolling up pulls in the next page. */
const LOAD_THRESHOLD_PX = 24;

type RecentSignalsProps = {
  /** The latest page, oldest first. Remount (via `key`) when it changes so the
   *  older pages start over from the new latest page. */
  messages: PartnerMessage[];
  partnerName: string;
  isDark: boolean;
  categoryMeta: Record<MessageCategory, { label: string; icon: ReactNode }>;
};

function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** "Today" / "Yesterday" / "12 Sep 2026" — the separator above a day's signals. */
function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(iso) === dayKey(today.toISOString())) return "Today";
  if (dayKey(iso) === dayKey(yesterday.toISOString())) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function timeOfDay(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/**
 * Recent Signals — the latest six, newest at the bottom like a chat. Scrolling
 * to the top (or "Show older signals" when the list is too short to scroll)
 * loads the previous six, keeping the reader's place, with a date separator
 * wherever the day changes.
 */
export function RecentSignals({ messages, partnerName, isDark, categoryMeta }: RecentSignalsProps) {
  const [older, setOlder] = useState<PartnerMessage[]>([]);
  const [hasMore, setHasMore] = useState(messages.length >= SIGNALS_PAGE_SIZE);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  // scrollHeight before a page of older signals is prepended, so the view can
  // be shifted down by exactly what was added.
  const heightBeforePrepend = useRef<number | null>(null);

  const all = [...older, ...messages.filter((m) => !older.some((o) => o.id === m.id))];

  // Open at the newest signal.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  // Keep the reader's place when older signals land above them.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || heightBeforePrepend.current === null) return;
    el.scrollTop += el.scrollHeight - heightBeforePrepend.current;
    heightBeforePrepend.current = null;
  }, [older.length]);

  const loadOlder = async () => {
    const oldest = all[0];
    if (!oldest || loadingOlder || !hasMore) return;
    setLoadingOlder(true);
    try {
      const { data } = await getMessages(SIGNALS_PAGE_SIZE, oldest.createdAt);
      heightBeforePrepend.current = scrollRef.current?.scrollHeight ?? null;
      setOlder((current) => [...data.filter((m) => !current.some((c) => c.id === m.id)), ...current]);
      setHasMore(data.length >= SIGNALS_PAGE_SIZE);
    } catch {
      // Best-effort — scrolling up again retries.
    } finally {
      setLoadingOlder(false);
    }
  };

  if (all.length === 0) {
    return <p className="mt-5 text-sm text-muted sm:mt-6">No signals yet — send the first one.</p>;
  }

  return (
    <div
      ref={scrollRef}
      onScroll={(event) => {
        if (event.currentTarget.scrollTop <= LOAD_THRESHOLD_PX) void loadOlder();
      }}
      className="mt-5 flex max-h-[460px] flex-col gap-4 overflow-y-auto pr-1 sm:mt-6 sm:gap-5"
    >
      {hasMore && (
        <button
          type="button"
          onClick={() => void loadOlder()}
          disabled={loadingOlder}
          className="self-center text-xs font-semibold text-muted transition-colors hover:text-ink disabled:opacity-60"
        >
          {loadingOlder ? "Loading older signals…" : "Show older signals"}
        </button>
      )}

      {all.map((signal, index) => {
        const newDay = index === 0 || dayKey(all[index - 1]!.createdAt) !== dayKey(signal.createdAt);
        return (
          <Fragment key={signal.id}>
            {newDay && (
              <div className="flex items-center gap-3" role="separator" aria-label={dayLabel(signal.createdAt)}>
                <span className="h-px flex-1 bg-brand/10" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted sm:text-[11px]">
                  {dayLabel(signal.createdAt)}
                </span>
                <span className="h-px flex-1 bg-brand/10" />
              </div>
            )}
            <div className="flex items-start gap-2.5 sm:gap-3 md:gap-4">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10 md:h-12 md:w-12 ${isDark ? "bg-[#FAF7F2]/8 text-[#FAF7F2]" : "bg-[#EEF0F8] text-[#1A1A4E]"}`}
              >
                {categoryMeta[signal.category].icon}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                  <p className="min-w-0 truncate text-[9px] font-bold uppercase tracking-wider text-muted sm:text-[10px]">
                    {signal.isMine ? "You" : partnerName} · {categoryMeta[signal.category].label}
                  </p>
                  <span className="shrink-0 text-[10px] text-muted sm:text-xs">{timeOfDay(signal.createdAt)}</span>
                </div>

                <p className="mt-1 break-words text-[13px] font-bold leading-5 text-ink sm:text-sm sm:leading-6 md:text-base">
                  {signal.text}
                </p>
              </div>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
