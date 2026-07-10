"use client";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { RadioOption } from "@/components/ui/RadioOption";
import { PartnerMatchModal } from "@/components/home/PartnerMatchModal";
import { GoalSettingModal } from "@/components/home/GoalSettingModal";
import {
  ArrowLeftIcon,
  BellIcon,
  FlameIcon,
  CheckCircleIcon,
  CalendarIcon,
  ClockIcon,
  StarIcon,
  TargetIcon,
  AlertTriangleIcon,
  RadarIcon,
  TrophyIcon,
} from "@/components/ui/icons";

const STAT_CARDS = [
  { icon: <FlameIcon />, value: "27", label: "Day Streak" },
  { icon: <CheckCircleIcon />, value: "78%", label: "Completion" },
  { icon: <CalendarIcon />, value: "6/7", label: "Days Active" },
  { icon: <ClockIcon />, value: "30", label: "Days left" },
];

const SIGNAL_TYPES = [
  { id: "encourage", label: "Encourage", icon: <StarIcon /> },
  { id: "goal-share", label: "Goal Share", icon: <TargetIcon /> },
  { id: "push-back", label: "Push Back", icon: <AlertTriangleIcon /> },
  { id: "check-in", label: "Check-In", icon: <RadarIcon /> },
  { id: "celebrate", label: "Celebrate", icon: <TrophyIcon /> },
];

const SIGNAL_TYPE_ICONS: Record<string, React.ReactNode> = Object.fromEntries(
  SIGNAL_TYPES.map((type) => [type.id, type.icon]),
);

const MESSAGES = [
  "Saw your streak. Real discipline.",
  "Keep showing up. It's adding up.",
  "You're building momentum. Keep going.",
  "Consistency beats motivation. Nice work.",
  "Proud of the effort you're putting in.",
];

const REACTIONS = ["🔥", "👏", "✍️", "👊", "❤️"];

type Signal = {
  id: number;
  type: string;
  message: string;
  note: string;
  time: string;
};

const INITIAL_SIGNALS: Signal[] = [
  { id: 1, type: "encourage", message: "Saw your streak.", note: "Real discipline.", time: "2h ago" },
  {
    id: 2,
    type: "goal-share",
    message: "Going for 6 hours today.",
    note: "You?",
    time: "4h ago",
  },
  {
    id: 3,
    type: "check-in",
    message: "Saw you were quiet.",
    note: "Hope you're alright.",
    time: "Yesterday",
  },
  { id: 4, type: "celebrate", message: "Crushed today.", note: "Feel good.", time: "Yesterday" },
];

export default function PartnerPage() {
  const [isMatchOpen, setMatchOpen] = useState(false);
  const [isGoalOpen, setGoalOpen] = useState(false);
  const [signals, setSignals] = useState(INITIAL_SIGNALS);
  const [signalType, setSignalType] = useState("encourage");
  const [message, setMessage] = useState(MESSAGES[0]);
  const [reaction, setReaction] = useState<string | null>(null);

  const handleSend = () => {
    const typeLabel = SIGNAL_TYPES.find((t) => t.id === signalType)?.label ?? "Encourage";
    setSignals((current) => [
      {
        id: Date.now(),
        type: signalType,
        message: reaction ? `${message} ${reaction}` : message,
        note: typeLabel,
        time: "Just now",
      },
      ...current,
    ]);
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/home" aria-label="Back to Home" className="text-ink">
            <ArrowLeftIcon />
          </Link>
          <h1 className="text-h1 text-ink">Partner</h1>
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

      <div className="flex flex-col gap-4 rounded-2xl border border-brand/10 bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-tint text-sm font-bold text-ink">
            PS
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
              Your Partner
            </p>
            <p className="text-base font-bold text-ink">Priya Sharma</p>
            <p className="flex items-center gap-1 text-xs text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Priya is active today
            </p>
            <p className="text-xs text-muted">Maharashtra · JEE Main + Advanced 2027</p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-3">
          {STAT_CARDS.map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-2 rounded-xl border border-brand/10 px-3 py-2"
            >
              <span className="text-ink">{stat.icon}</span>
              <div>
                <p className="text-sm font-extrabold text-ink">{stat.value}</p>
                <p className="text-[10px] text-muted">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setMatchOpen(true)}
        className="w-fit text-xs font-semibold text-ink underline"
      >
        Find New Partner
      </button>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-brand/10 bg-surface p-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tint text-ink">
            <CalendarIcon />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-ink">Goal Setting Sunday</p>
            <p className="text-xs text-muted">
              Set a meaningful goal for the week ahead and stay accountable together.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Button variant="primary" size="sm" onClick={() => setGoalOpen(true)}>
            Set Weekly Goal
          </Button>
          <p className="text-[10px] text-muted">Only available on Sundays</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-brand/10 bg-surface p-5">
          <p className="text-sm font-bold text-ink">Shared Focus This Week</p>
          <p className="mt-2 text-3xl font-extrabold text-ink">19.5 hrs</p>
          <div className="mt-2 h-1.5 rounded-full bg-tint-strong">
            <div className="h-1.5 w-[78%] rounded-full bg-brand" />
          </div>
          <p className="mt-2 text-xs text-muted">
            You&apos;re 2.5 hrs above your shared weekly target
          </p>
        </div>

        <div className="rounded-2xl border border-brand/10 bg-surface p-5">
          <p className="text-sm font-bold text-ink">Partner Pulse</p>
          <div className="mt-3 flex flex-col gap-3">
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-ink">Focus Today</span>
                <span className="text-muted">68%</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-tint-strong">
                <div className="h-1.5 w-[68%] rounded-full bg-brand" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-ink">Weekly Consistency</span>
                <span className="text-muted">86%</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-tint-strong">
                <div className="h-1.5 w-[86%] rounded-full bg-brand" />
              </div>
            </div>
            <p className="flex items-center gap-1 text-xs text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Last Active · 32 mins ago
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-brand/10 bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-bold text-ink">Recent Signals</p>
            <button type="button" className="text-xs font-semibold text-ink underline">
              View all
            </button>
          </div>
          <div className="mt-3 flex flex-col gap-3">
            {signals.map((signal) => (
              <div key={signal.id} className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tint text-ink">
                  {SIGNAL_TYPE_ICONS[signal.type]}
                </span>
                <div className="flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                    {SIGNAL_TYPES.find((t) => t.id === signal.type)?.label}
                  </p>
                  <p className="text-sm font-semibold text-ink">{signal.message}</p>
                  <p className="text-xs text-muted">{signal.note}</p>
                </div>
                <span className="shrink-0 text-xs text-muted">{signal.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-brand/10 bg-surface p-5">
          <p className="text-sm font-bold text-ink">Send Signal</p>
          <p className="text-xs text-muted">Choose a signal type</p>
          <div className="mt-2 flex gap-2">
            {SIGNAL_TYPES.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => setSignalType(type.id)}
                aria-pressed={signalType === type.id}
                className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
                  signalType === type.id
                    ? "border-brand bg-tint-strong text-ink"
                    : "border-brand/15 text-muted hover:bg-tint-strong"
                }`}
                title={type.label}
              >
                {type.icon}
              </button>
            ))}
          </div>

          <p className="mt-4 text-xs text-muted">Choose a message</p>
          <div className="mt-2 flex flex-col gap-2">
            {MESSAGES.map((option) => (
              <RadioOption
                key={option}
                name="signal-message"
                value={option}
                label={option}
                selected={message === option}
                onSelect={() => setMessage(option)}
              />
            ))}
          </div>

          <p className="mt-4 text-xs text-muted">Add a reaction (optional)</p>
          <div className="mt-2 flex gap-2">
            {REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setReaction((current) => (current === emoji ? null : emoji))}
                aria-pressed={reaction === emoji}
                className={`flex h-9 w-9 items-center justify-center rounded-full border text-base transition-colors ${
                  reaction === emoji
                    ? "border-brand bg-tint-strong"
                    : "border-brand/15 hover:bg-tint-strong"
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>

          <Button variant="primary" className="mt-4" onClick={handleSend}>
            Send Encouragement
          </Button>
        </div>
      </div>

      <PartnerMatchModal
        open={isMatchOpen}
        onClose={() => setMatchOpen(false)}
        onAccept={() => setMatchOpen(false)}
      />
      <GoalSettingModal open={isGoalOpen} onClose={() => setGoalOpen(false)} />
    </div>
  );
}
