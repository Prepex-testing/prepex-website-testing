import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import { Button } from "@/components/ui/Button";
import { CircularProgress } from "@/components/ui/CircularProgress";
import {
  ArrowLeftIcon,
  BellIcon,
  ListIcon,
  FileIcon,
  TargetIcon,
  AlertTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  PlayIcon,
  PencilIcon,
  RefreshIcon,
} from "@/components/ui/icons";

type SignalLevel = "high" | "medium";

const SIGNAL_STYLES: Record<SignalLevel, string> = {
  high: "bg-cta/10 text-cta",
  medium: "bg-warning/10 text-warning",
};

const SIGNALS: {
  icon: React.ReactNode;
  title: string;
  signal: SignalLevel | null;
  description: string;
  note?: string;
}[] = [
  {
    icon: <FileIcon />,
    title: "Mock data",
    signal: "high",
    description: "0/3 correct in last mock",
  },
  {
    icon: <TargetIcon />,
    title: "Practice accuracy",
    signal: "high",
    description: "38% across 13 attempts",
  },
  {
    icon: <AlertTriangleIcon />,
    title: "Revision difficulty",
    signal: "medium",
    description: "2 Hard ratings recently",
  },
  {
    icon: <ClockIcon />,
    title: "Task abandonment",
    signal: null,
    description: "Skipped 3 sessions on this topic",
    note: "Corroborated by accuracy data",
  },
];

const FOCUS_ACTIONS = [
  { icon: <PlayIcon />, text: "Watch foundation lecture (Library)" },
  { icon: <PencilIcon />, text: "Practice 10 questions targeted" },
  { icon: <RefreshIcon />, text: "Add to revision rotation" },
];

export default function FocusTopicPage() {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/home" aria-label="Back to Home" className="text-ink">
            <ArrowLeftIcon />
          </Link>
          <h1 className="text-h1 text-ink">This Week&apos;s Focus Topic</h1>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <button
            type="button"
            aria-label="Notifications"
            className="flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-tint-strong"
          >
            <BellIcon />
          </button>
          <UserMenu />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-brand/10 bg-surface">
        <div className="flex flex-wrap items-start justify-between gap-4 p-6">
          <div className="min-w-0">
            <p className="text-lg font-bold text-ink">Coord Geo · Common Tangents</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-full bg-tint-strong px-3 py-1 text-xs font-semibold text-ink">
                Coordinate Geometry
              </span>
              <span className="flex items-center gap-1 rounded-full bg-cta/10 px-3 py-1 text-xs font-semibold text-cta">
                <AlertTriangleIcon />
                High Priority
              </span>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-center gap-1">
            <CircularProgress percent={78} label="Score" suffix="" size={80} />
            <p className="text-xs font-semibold text-ink">Strong Signal</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 border-t border-brand/10 p-6 sm:grid-cols-2">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted">
              <ListIcon />
              Signal Breakdown
            </p>
            <div className="mt-3 flex flex-col divide-y divide-brand/10">
              {SIGNALS.map((signal) => (
                <div key={signal.title} className="flex items-start gap-3 py-3 first:pt-0">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tint text-ink">
                    {signal.icon}
                  </span>
                  <div>
                    <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                      {signal.title}
                      {signal.signal && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${SIGNAL_STYLES[signal.signal]}`}
                        >
                          {signal.signal} Signal
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted">{signal.description}</p>
                    {signal.note && (
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-success">
                        <CheckCircleIcon />
                        {signal.note}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted">
              Focus This Week
            </p>
            <div className="mt-3 flex flex-col gap-3">
              {FOCUS_ACTIONS.map((action) => (
                <div key={action.text} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tint text-ink">
                    {action.icon}
                  </span>
                  <p className="text-sm text-ink">{action.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 bg-brand px-6 py-4">
          <p className="text-sm font-semibold text-white">Plan adjustment available</p>
          <Button variant="primary" size="sm">
            Apply targeted week
          </Button>
        </div>
      </div>
    </div>
  );
}
