"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DayModal } from "@/components/calendar/DayModal";
import { MonthHeatmap } from "@/components/calendar/MonthHeatmap";
import { WeekList } from "@/components/calendar/WeekList";
import { InsightsTabs } from "@/components/insights/InsightsTabs";
import { CalendarSidePanel } from "@/components/insights/panels/CalendarSidePanel";
import { LogScreenScaffold } from "@/components/logs/LogScreenScaffold";
import { ApiError } from "@/lib/api/http";
import { getMonthView, getWeekView, type MonthView, type WeekView } from "@/lib/api/calendarView";
import { isoWeekMondayKey, isoWeekOf, monthTitle, shiftMonth, shiftWeek, swipeDirection } from "@/lib/insights/heatmap";
import { dayKey } from "@/lib/logs/dates";

type Mode = "month" | "week";

export default function CalendarPage() {
  const todayKey = dayKey(new Date());
  const [mode, setMode] = useState<Mode>("month");
  const [cursor, setCursor] = useState(() => ({ year: Number(todayKey.slice(0, 4)), month: Number(todayKey.slice(5, 7)) }));
  const [isoWeek, setIsoWeek] = useState(() => isoWeekOf(todayKey));
  const [month, setMonth] = useState<MonthView | null>(null);
  const [week, setWeek] = useState<WeekView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const seq = useRef(0);
  const touch = useRef<{ x: number; y: number } | null>(null);

  const load = useCallback(async () => {
    const mine = ++seq.current;
    setError(null);
    try {
      if (mode === "month") {
        const res = await getMonthView(cursor.year, cursor.month);
        if (mine === seq.current) setMonth(res.data);
      } else {
        const res = await getWeekView(isoWeek);
        if (mine === seq.current) setWeek(res.data);
      }
    } catch (err) {
      if (mine === seq.current) setError(err instanceof ApiError ? err.message : "We couldn't load your calendar. Please try again.");
    }
  }, [mode, cursor, isoWeek]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load the period when it changes
    void load();
  }, [load]);

  const step = useCallback(
    (delta: number) => {
      if (mode === "month") {
        setMonth(null);
        setCursor((c) => shiftMonth(c.year, c.month, delta));
      } else {
        setWeek(null);
        setIsoWeek((w) => shiftWeek(w, delta));
      }
    },
    [mode],
  );

  const title = useMemo(() => {
    if (mode === "month") return monthTitle(cursor.year, cursor.month);
    const monday = isoWeekMondayKey(isoWeek);
    const [y, m, d] = monday.split("-").map(Number) as [number, number, number];
    const end = new Date(Date.UTC(y, m - 1, d + 6));
    const fmt = (dt: Date) => dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
    return `${fmt(new Date(Date.UTC(y, m - 1, d)))} – ${fmt(end)}`;
  }, [mode, cursor, isoWeek]);

  const current = mode === "month" ? month : week;

  return (
    <LogScreenScaffold name="calendar" title="Calendar" backHref="/home" tabBar={<InsightsTabs current="/calendar" />} sidePanelLabel="Legend and month totals" sidePanel={<CalendarSidePanel month={month} />}>

      <div role="radiogroup" aria-label="View" className="grid grid-cols-2 gap-1 rounded-xl bg-tint-strong p-1 dark:bg-[#FAF7F214]">
        {(["month", "week"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            data-testid={`cal-mode-${m}`}
            onClick={() => setMode(m)}
            className={`min-h-11 rounded-lg px-2 text-[14px] font-bold capitalize ${mode === m ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <button type="button" aria-label={mode === "month" ? "Previous month" : "Previous week"} data-testid="cal-prev" onClick={() => step(-1)} className="flex size-11 items-center justify-center rounded-full border border-brand/15 bg-surface text-[20px] font-bold text-ink hover:bg-tint-strong">
          ‹
        </button>
        <h2 className="text-center text-[18px] font-extrabold text-ink" data-testid="cal-title" aria-live="polite">
          {title}
        </h2>
        <button type="button" aria-label={mode === "month" ? "Next month" : "Next week"} data-testid="cal-next" onClick={() => step(1)} className="flex size-11 items-center justify-center rounded-full border border-brand/15 bg-surface text-[20px] font-bold text-ink hover:bg-tint-strong">
          ›
        </button>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
          {error}{" "}
          <button type="button" className="font-bold underline" onClick={() => void load()}>
            Try again
          </button>
        </p>
      )}

      <div
        data-testid="cal-swipe-area"
        className="touch-pan-y"
        onTouchStart={(e) => {
          const t = e.touches[0];
          touch.current = t ? { x: t.clientX, y: t.clientY } : null;
        }}
        onTouchEnd={(e) => {
          const t = e.changedTouches[0];
          if (!touch.current || !t) return;
          const dir = swipeDirection(touch.current, { x: t.clientX, y: t.clientY });
          touch.current = null;
          if (dir) step(dir === "next" ? 1 : -1);
        }}
      >
        {!current && !error ? (
          <div className="h-72 animate-pulse rounded-xl bg-tint-strong" aria-hidden />
        ) : mode === "month" && month ? (
          <MonthHeatmap year={month.year} month={month.month} days={month.days} todayKey={todayKey} selected={selected} onSelect={setSelected} />
        ) : mode === "week" && week ? (
          <WeekList week={week} todayKey={todayKey} onSelect={setSelected} />
        ) : null}
      </div>

      <DayModal date={selected} onClose={() => setSelected(null)} />
    </LogScreenScaffold>
  );
}
