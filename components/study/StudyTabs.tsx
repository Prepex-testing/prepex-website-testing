import Link from "next/link";
import { focusSessionHref } from "@/lib/focus/startFocusSession";
import { GlidePill } from "@/components/motion/GlidePill";

const TABS = [
  { href: focusSessionHref({ originSource: "standalone" }), label: "Focus" },
  { href: "/sessions", label: "Sessions" },
  { href: "/notebooks", label: "Notebooks" },
  { href: "/logs", label: "Logs" },
] as const;

/** The study screens share one segmented switcher at the top (they live behind the "Study" tab). */
export function StudyTabs({ current }: { current: (typeof TABS)[number]["href"] }) {
  return (
    <nav aria-label="Study" className="grid grid-cols-4 gap-1 rounded-xl bg-tint-strong p-1 dark:bg-[#FAF7F214]" data-testid="study-tabs">
      {TABS.map((tab) => {
        const active = tab.href === current;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`relative flex min-h-11 items-center justify-center rounded-lg px-1 text-[13px] font-bold transition-colors sm:px-3 sm:text-[14px] ${
              active ? "text-ink" : "text-muted hover:text-ink"
            }`}
          >
            {active && <GlidePill id="study-tabs" className="rounded-lg bg-surface shadow-sm" />}
            <span className="relative">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
