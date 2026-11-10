import { StatCard } from "@/components/stats/StatCard";
import { COMPONENT_LABELS, COPY } from "@/lib/rankGps/labels";
import { signed } from "@/lib/rankGps/format";
import type { ChangeDriver, WeeklyChange } from "@/lib/rankGps/types";

function Drivers({ title, items, tone }: { title: string; items: ChangeDriver[]; tone: "up" | "down" }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-[12px] font-bold uppercase tracking-[0.5px] text-muted">{title}</p>
      <ul className="mt-2 flex flex-col gap-2">
        {items.map((d) => (
          <li key={d.chapterId} className="flex items-start justify-between gap-3 text-[14px]">
            <span className="min-w-0">
              <span className="font-semibold text-ink">{d.name}</span>
              <span className="block text-[13px] text-muted">{d.why}</span>
            </span>
            <span className={`shrink-0 font-bold ${tone === "up" ? "text-success" : "text-danger"}`}>{signed(d.points)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function WhyMoved({ change }: { change: WeeklyChange }) {
  const parts = change.components.filter((c) => Math.abs(c.delta) >= 0.1);
  return (
    <StatCard title={COPY.whyMoved} subtitle={`${signed(change.delta)} POINTS SINCE THE LAST REPORT`}>
      <div className="flex flex-col gap-4" data-testid="why-moved">
        {parts.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {parts.map((c) => (
              <li key={c.key} className={`rounded-full px-3 py-1 text-[12px] font-bold ${c.delta > 0 ? "bg-success-bg text-success" : "bg-danger-bg text-danger"}`}>
                {COMPONENT_LABELS[c.key].label} {signed(c.delta)}
              </li>
            ))}
          </ul>
        )}
        <Drivers title="What helped" items={change.positives} tone="up" />
        <Drivers title="What held you back" items={change.negatives} tone="down" />
        {change.positives.length === 0 && change.negatives.length === 0 && <p className="text-[14px] text-muted">Nothing moved much this week. A steady week is still a good week.</p>}
      </div>
    </StatCard>
  );
}
