"use client";

import { ChevronDown } from "lucide-react";
import { useState, type KeyboardEvent, type ReactNode } from "react";
import { ProfileSubpageHeader } from "@/components/profile/ProfileSubpageHeader";

export type LogTab<T extends string> = { id: T; label: string; icon?: ReactNode };

type Props<T extends string> = {
  /** Ids and aria names; also the test id prefix (`<name>-tab-<id>`, `<name>-panel-<id>`). */
  name: string;
  title: string;
  subtitle?: string;
  backHref?: string;
  tabs: LogTab<T>[];
  activeTab: T;
  onTabChange: (id: T) => void;
  /** Fills the right column on a desktop; sits under the content as a collapsible section on smaller screens. */
  sidePanel?: ReactNode;
  /** Label of the collapsible section on smaller screens. */
  sidePanelLabel?: string;
  /** Tablet only: the side panel's headline numbers as a scrolling chip row under the tabs. */
  summaryChips?: { label: string; value: string }[];
  /** Right side of the subtitle row, e.g. the screen's primary action. */
  headerActions?: ReactNode;
  children: ReactNode;
};

/**
 * One layout for Revision, Backlog, Practice and Mocks: title, pill tabs, then the active tab's content on the left
 * and a side panel on the right (desktop, up to 1400px wide) so the screen never leaves its corners empty. Below 1024px
 * it is one column and the side panel moves to the bottom.
 */
export function LogScreenScaffold<T extends string>({ name, title, subtitle, backHref = "/logs", tabs, activeTab, onTabChange, sidePanel, sidePanelLabel = "More", summaryChips, headerActions, children }: Props<T>) {
  const [panelOpen, setPanelOpen] = useState(false);

  function onKey(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = tabs[(index + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length]!;
    onTabChange(next.id);
    document.getElementById(`${name}-tab-${next.id}`)?.focus();
  }

  return (
    <div className="min-h-full bg-surface-base" data-testid={`${name}-page`}>
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 p-4 sm:p-6" data-testid="log-scaffold">
        <ProfileSubpageHeader title={title} backHref={backHref} />
        {(subtitle || headerActions) && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            {subtitle ? <p className="text-[14px] text-muted">{subtitle}</p> : <span />}
            {headerActions}
          </div>
        )}

        <div role="tablist" aria-label={name} className="flex gap-1 overflow-x-auto rounded-full border border-border-subtle bg-surface-elevated p-1" data-testid={`${name}-tabs`}>
          {tabs.map((tab, i) => {
            const active = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                id={`${name}-tab-${tab.id}`}
                role="tab"
                type="button"
                aria-selected={active}
                aria-controls={`${name}-panel`}
                tabIndex={active ? 0 : -1}
                data-testid={`${name}-tab-${tab.id}`}
                onClick={() => onTabChange(tab.id)}
                onKeyDown={(e) => onKey(e, i)}
                className={`flex min-h-11 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border-b-2 px-4 text-[14px] font-semibold transition-colors ${
                  active ? "border-saffron bg-surface-elevated-2 text-ink" : "border-transparent text-muted hover:text-ink"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>

        {summaryChips && summaryChips.length > 0 && (
          <div className="hidden gap-2 overflow-x-auto md:flex lg:hidden" data-testid="summary-chips">
            {summaryChips.map((c) => (
              <span key={c.label} className="shrink-0 rounded-full border border-border-subtle bg-surface-elevated px-3 py-1.5 text-[13px] text-ink">
                <span className="text-muted">{c.label}</span> <strong className="font-semibold">{c.value}</strong>
              </span>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(320px,1fr)]" data-testid="log-grid">
          <div className="flex min-w-0 flex-col gap-5" data-testid="log-main">
            {children}
          </div>
          {sidePanel && (
            <aside aria-label={sidePanelLabel} className="min-w-0 lg:sticky lg:top-6 lg:self-start" data-testid="log-side-panel">
              <button
                type="button"
                aria-expanded={panelOpen}
                data-testid="side-panel-toggle"
                onClick={() => setPanelOpen((o) => !o)}
                className="flex min-h-11 w-full items-center justify-between rounded-2xl border border-border-subtle bg-surface-elevated px-4 text-[14px] font-semibold text-ink lg:hidden"
              >
                {sidePanelLabel}
                <ChevronDown className={`size-4 transition-transform ${panelOpen ? "rotate-180" : ""}`} aria-hidden />
              </button>
              <div className={`${panelOpen ? "mt-3 block" : "hidden"} lg:mt-0 lg:block`} data-testid="side-panel-body">
                <div className="flex flex-col gap-5 rounded-2xl border border-border-subtle bg-surface-elevated p-5">{sidePanel}</div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}

/** A titled block inside a side panel. */
export function PanelSection({ title, children, testId }: { title: string; children: ReactNode; testId?: string }) {
  return (
    <section className="flex flex-col gap-2" data-testid={testId}>
      <h3 className="text-[13px] font-semibold uppercase tracking-wide text-muted">{title}</h3>
      {children}
    </section>
  );
}

/** A horizontal bar row for the panels' small charts: label, bar, value. Never coral. */
export function BarRow({ label, value, max, text, color }: { label: string; value: number; max: number; text: string; color?: string }) {
  const width = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-3 text-[13px]">
      <span className="w-24 shrink-0 truncate text-ink">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-[3px] bg-black/[0.08] dark:bg-white/[0.08]">
        <div className="h-full rounded-[3px] bg-slate-700 dark:bg-white/50" style={{ width: `${width}%`, ...(color ? { background: color } : {}) }} />
      </div>
      <span className="w-12 shrink-0 text-right text-muted">{text}</span>
    </div>
  );
}

/** A tiny line for a trend: points are 0..max, drawn left to right. */
export function Sparkline({ points, label }: { points: number[]; label: string }) {
  if (points.length < 2) return <p className="text-[13px] text-muted">Not enough data yet.</p>;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const span = max - min || 1;
  const w = 240;
  const h = 48;
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${((i / (points.length - 1)) * w).toFixed(1)},${(h - 4 - ((p - min) / span) * (h - 8)).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label} className="h-12 w-full text-ink" preserveAspectRatio="none">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" opacity="0.7" />
    </svg>
  );
}
