import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import { Button } from "@/components/ui/Button";
import {TargetIcon } from "@/components/ui/icons";
import {BellIcon} from "@/assets/icons";
type FocusItem = {
  id: string;
  subjectLabel: string;
  title: string;
  accuracy: number;
  deltaDirection: "up" | "down";
  deltaValue: number;
  highlight?: boolean;
};

const FOCUS_ITEMS: FocusItem[] = [
  {
    id: "coord-geo-tangents",
    subjectLabel: "M",
    title: "Coord Geo · Common Tangents",
    accuracy: 38,
    deltaDirection: "down",
    deltaValue: 4,
    highlight: true,
  },
  {
    id: "optics-lens",
    subjectLabel: "P",
    title: "Optics · Lens Combinations",
    accuracy: 42,
    deltaDirection: "up",
    deltaValue: 3,
  },
  {
    id: "inorganic-coordination",
    subjectLabel: "C",
    title: "Inorganic · Coordination Cmpds",
    accuracy: 45,
    deltaDirection: "up",
    deltaValue: 2,
  },
  {
    id: "calculus-implicit-diff",
    subjectLabel: "M",
    title: "Calculus · Implicit Diff",
    accuracy: 47,
    deltaDirection: "down",
    deltaValue: 1,
  },
  {
    id: "thermodynamics-cycles",
    subjectLabel: "P",
    title: "Thermodynamics · Cycles",
    accuracy: 51,
    deltaDirection: "up",
    deltaValue: 5,
  },
];

export default function FocusNextPage() {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-h1 text-ink">Where to focus next</h1>
          <p className="text-sm text-muted">Fixing these gains you the most marks.</p>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <ThemeToggle />
          <button
            type="button"
            aria-label="Notifications"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-icon-action-bg text-icon-action-text transition-colors hover:bg-tint-strong"
          >
            <BellIcon />
          </button>
          <UserMenu />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {FOCUS_ITEMS.map((item) => (
          <div
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-brand/10 bg-surface p-5"
          >
            <div className="flex min-w-0 items-center gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-brand/15 bg-tint text-sm font-bold text-ink">
                {item.subjectLabel}
              </span>
              <p className="truncate text-base font-semibold text-ink">{item.title}</p>
            </div>

            <div className="flex shrink-0 items-center gap-6">
              <div className="flex flex-col items-end">
                <span className="text-2xl font-extrabold leading-none text-ink">
                  {item.accuracy}%
                </span>
                <span className="mt-1 text-[10px] font-bold uppercase tracking-wide text-muted">
                  Accuracy
                </span>
                <span
                  className={`mt-1 text-xs font-semibold ${item.deltaDirection === "up" ? "text-success" : "text-warning"
                    }`}
                >
                  {item.deltaDirection === "up" ? "↑" : "↓"} {item.deltaDirection === "up" ? "+" : "-"}
                  {item.deltaValue}% this week
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="flex items-center justify-center gap-2 text-sm text-muted">
        <TargetIcon />
        Tap any for targeted practice
      </p>
    </div>
  );
}
