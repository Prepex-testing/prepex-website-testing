import Link from "next/link";

const TABS = [
  { href: "/focus", label: "Focus" },
  { href: "/sessions", label: "Log" },
  { href: "/mistakes", label: "Mistakes" },
] as const;

/** The three study screens share one segmented switcher at the top (they live behind the "Study" tab). */
export function StudyTabs({ current }: { current: (typeof TABS)[number]["href"] }) {
  return (
    <nav aria-label="Study" className="grid grid-cols-3 gap-1 rounded-xl bg-tint-strong p-1 dark:bg-[#FAF7F214]" data-testid="study-tabs">
      {TABS.map((tab) => {
        const active = tab.href === current;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 items-center justify-center rounded-lg px-3 text-[14px] font-bold transition-colors ${
              active ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
