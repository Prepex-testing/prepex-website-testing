"use client";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { CircularProgress } from "@/components/ui/CircularProgress";
import { RecoveryModeModal } from "@/components/home/RecoveryModeModal";
import {
  ArrowLeftIcon,
  BellIcon,
  AlertTriangleIcon,
  ClockIcon,
  BoltIcon,
  CalendarIcon,
  ListIcon,
  MoreIcon,
  GlobeIcon,
  FlaskIcon,
  CalculatorIcon,
} from "@/components/ui/icons";

type Subject = "physics" | "chemistry" | "maths";

const SUBJECT_ICONS: Record<Subject, React.ReactNode> = {
  physics: <GlobeIcon />,
  chemistry: <FlaskIcon />,
  maths: <CalculatorIcon />,
};

const SUBJECT_LABELS: Record<Subject, string> = {
  physics: "Physics",
  chemistry: "Chemistry",
  maths: "Maths",
};

type PriorityItem = {
  id: string;
  breadcrumb: string;
  title: string;
  overdueDays: number;
  weight: number;
};

const PRIORITY_ITEMS: PriorityItem[] = [
  {
    id: "tangents",
    breadcrumb: "Maths › Coordinate Geometry",
    title: "Tangents",
    overdueDays: 5,
    weight: 0.75,
  },
  {
    id: "lens",
    breadcrumb: "Physics › Optics",
    title: "Lens",
    overdueDays: 3,
    weight: 0.85,
  },
];

type OtherBacklogItem = {
  id: string;
  subject: Subject;
  title: string;
  overdueDays: number;
  weight: number;
};

const OTHER_BACKLOG: OtherBacklogItem[] = [
  { id: "mole-concept", subject: "chemistry", title: "Mole Concept", overdueDays: 2, weight: 0.08 },
  { id: "kinematics", subject: "physics", title: "Kinematics", overdueDays: 2, weight: 0.08 },
  { id: "quadratic", subject: "maths", title: "Quadratic Equations", overdueDays: 7, weight: 0.15 },
  { id: "atomic-structure", subject: "chemistry", title: "Atomic Structure", overdueDays: 4, weight: 0.05 },
  { id: "electrostatics", subject: "physics", title: "Electrostatics", overdueDays: 4, weight: 0.05 },
  { id: "complex-numbers", subject: "maths", title: "Complex Numbers", overdueDays: 4, weight: 0.05 },
];

export default function BacklogPage() {
  const [isRecoveryOpen, setRecoveryOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/home" aria-label="Back to Home" className="text-ink">
            <ArrowLeftIcon />
          </Link>
          <h1 className="text-h1 text-ink">Your Backlog</h1>
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

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-brand/10 bg-surface p-4">
          <CircularProgress percent={65} displayValue={8} suffix="" label="Tasks" size={72} />
          <span className="rounded-full bg-cta/10 px-2 py-0.5 text-[10px] font-bold uppercase text-cta">
            Growing
          </span>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-brand/10 bg-surface p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cta/10 text-cta">
            <AlertTriangleIcon />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
              Total Backlog
            </p>
            <p className="text-lg font-extrabold text-ink">8 tasks</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-brand/10 bg-surface p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tint text-ink">
            <ClockIcon />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
              Time Span
            </p>
            <p className="text-lg font-extrabold text-ink">Last 9 days</p>
          </div>
        </div>

        <div className="flex flex-col justify-center rounded-2xl border border-brand/10 bg-surface p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
            Weekly Forecast
          </p>
          <p className="text-lg font-extrabold text-ink">Clear by Friday</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-brand/10 bg-surface p-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tint text-ink">
            <BoltIcon />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-ink">Your backlog is building.</p>
            <p className="text-xs text-muted">
              Want to enter Recovery Mode to get back on track?
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <button type="button" className="text-xs font-semibold text-ink underline">
            Learn more
          </button>
          <Button variant="secondary" size="sm" onClick={() => setRecoveryOpen(true)}>
            Start Recovery
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-cta">
          <AlertTriangleIcon />
          Priority <span className="font-normal text-muted">(high-impact first)</span>
        </p>

        {PRIORITY_ITEMS.map((item) => (
          <div key={item.id} className="rounded-2xl border border-brand/10 bg-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted">{item.breadcrumb}</p>
                <p className="text-base font-bold text-ink">{item.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 font-semibold text-cta">
                    <CalendarIcon />
                    {item.overdueDays} days overdue
                  </span>
                  <span className="text-muted">weight {item.weight}</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-tint-strong">
                  <div
                    className="h-1.5 rounded-full bg-brand"
                    style={{ width: `${item.weight * 100}%` }}
                  />
                </div>
              </div>
              <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
                <Button variant="primary" size="sm">
                  Add to plan
                </Button>
                <Button variant="secondary" size="sm">
                  Hold
                </Button>
                <button
                  type="button"
                  aria-label={`More options for ${item.title}`}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-tint-strong"
                >
                  <span className="inline-block rotate-90">
                    <MoreIcon />
                  </span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted">
          <ListIcon />
          Other Backlog
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {OTHER_BACKLOG.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-2 rounded-xl border border-brand/10 bg-surface p-3"
            >
              <div className="flex items-start gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-tint text-ink">
                  {SUBJECT_ICONS[item.subject]}
                </span>
                <div>
                  <span className="rounded-full bg-tint-strong px-2 py-0.5 text-[9px] font-semibold text-ink">
                    {SUBJECT_LABELS[item.subject]}
                  </span>
                  <p className="text-sm font-bold text-ink">{item.title}</p>
                  <p className="text-[11px] text-muted">
                    {item.overdueDays} days overdue, weight {item.weight}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label={`More options for ${item.title}`}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-tint-strong"
              >
                <span className="inline-block rotate-90">
                  <MoreIcon />
                </span>
              </button>
            </div>
          ))}
        </div>
      </div>

      <RecoveryModeModal open={isRecoveryOpen} onClose={() => setRecoveryOpen(false)} />
    </div>
  );
}
