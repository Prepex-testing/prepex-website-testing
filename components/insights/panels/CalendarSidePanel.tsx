"use client";

import { HeatLegend } from "@/components/calendar/MonthHeatmap";
import { PanelSection } from "@/components/logs/LogScreenScaffold";
import type { MonthView } from "@/lib/api/calendarView";
import { formatMinutes } from "@/lib/study/format";

/** What a month adds up to, from its day summaries. */
export function monthTotals(month: MonthView) {
  return {
    studied: month.totals.studiedMinutes,
    planned: month.totals.plannedMinutes,
    activeDays: month.totals.activeDays,
    mocks: month.days.reduce((a, d) => a + d.mocks, 0),
    reviews: month.days.filter((d) => d.hasWeeklyDiagnosis).length,
  };
}

/** The calendar's right column: the legend, the month's totals, and a hint. */
export function CalendarSidePanel({ month }: { month: MonthView | null }) {
  const t = month ? monthTotals(month) : null;
  return (
    <>
      <PanelSection title="Legend" testId="cal-legend">
        <HeatLegend />
      </PanelSection>
      <PanelSection title="This month" testId="cal-month-totals">
        {t ? (
          <dl className="grid grid-cols-2 gap-3 text-[14px]">
            {[
              ["Studied", formatMinutes(t.studied)],
              ["Planned", formatMinutes(t.planned)],
              ["Active days", String(t.activeDays)],
              ["Mocks", String(t.mocks)],
              ["Weekly reviews", String(t.reviews)],
            ].map(([k, v]) => (
              <div key={k} className="flex flex-col">
                <dt className="text-[12px] text-muted">{k}</dt>
                <dd className="font-semibold text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-[13px] text-muted">Switch to month view to see the totals.</p>
        )}
      </PanelSection>
      <p className="text-[12px] text-muted" data-testid="cal-hint">
        Click a cell to open that day.
      </p>
    </>
  );
}
