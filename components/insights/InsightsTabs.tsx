import Link from "next/link";

const TABS = [
  { href: "/analytics", label: "Dashboard" },
  { href: "/calendar", label: "Calendar" },
  { href: "/syllabus", label: "Syllabus" },
  { href: "/stats", label: "Details" },
] as const;

export type InsightsHref = (typeof TABS)[number]["href"];

/** The Stats tab opens onto four screens that share one switcher: the dashboard, calendar, syllabus and the older detailed stats. */
export function InsightsTabs({ current }: { current: InsightsHref }) {
  return (
    <nav aria-label="Insights" className="grid grid-cols-4 gap-1 rounded-xl bg-tint-strong p-1 dark:bg-[#FAF7F214]" data-testid="insights-tabs">
      {TABS.map((tab) => {
        const active = tab.href === current;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 items-center justify-center rounded-lg px-1 text-[13px] font-bold transition-colors sm:px-3 sm:text-[14px] ${active ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
