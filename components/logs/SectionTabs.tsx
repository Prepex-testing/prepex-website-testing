"use client";

import type { KeyboardEvent } from "react";

export interface TabDef<T extends string> {
  id: T;
  label: string;
}

type Props<T extends string> = {
  tabs: TabDef<T>[];
  current: T;
  onChange: (id: T) => void;
  /** Used for ids/aria so two tab strips on a page don't clash. */
  name: string;
};

/** The four-tab strip inside Revision / Backlog / Practice. Arrow keys move between tabs. */
export function SectionTabs<T extends string>({ tabs, current, onChange, name }: Props<T>) {
  function onKey(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = tabs[(index + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length]!;
    onChange(next.id);
    document.getElementById(`${name}-tab-${next.id}`)?.focus();
  }

  return (
    <div role="tablist" aria-label={name} className="grid gap-1 rounded-xl bg-tint-strong p-1 dark:bg-[#FAF7F214]" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }} data-testid={`${name}-tabs`}>
      {tabs.map((tab, i) => {
        const active = tab.id === current;
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
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => onKey(e, i)}
            className={`flex min-h-11 items-center justify-center rounded-lg px-1 text-[13px] font-bold transition-colors sm:text-[14px] ${active ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

/** The panel a tab controls; give it the same `name`. */
export function TabPanel({ name, tab, children }: { name: string; tab: string; children: React.ReactNode }) {
  return (
    <div role="tabpanel" id={`${name}-panel`} aria-labelledby={`${name}-tab-${tab}`} data-testid={`${name}-panel-${tab}`} className="flex flex-col gap-4">
      {children}
    </div>
  );
}
