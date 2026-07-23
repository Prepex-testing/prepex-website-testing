"use client";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { RadioOption } from "@/components/ui/RadioOption";
import { PartnerMatchModal } from "@/components/home/PartnerMatchModal";
import { GoalSettingModal } from "@/components/home/GoalSettingModal";
import { useTheme } from "@/components/theme/ThemeProvider";
import {
  ArrowLeftIcon,
  BellIcon,
  // FlameIcon,
  CheckCircleIcon,
  // CalendarIcon,
  // ClockIcon,
  // StarIcon,
  TargetIcon,
  AlertTriangleIcon,
  RadarIcon,
  TrophyIcon,
  // FireIcon,
} from "@/components/ui/icons";
import {FlameIcon, ClockIcon, EncourageIcon, GoalIcon,Location ,CheckIcons,CalendarIcon,CheckInIcon,CelebrateIcon,PushIcon} from "@/assets/icons";
const STAT_CARDS = [
  {
    value: "27",
    label: "Day Streak",
    icon: <FlameIcon />,
  },
  {
    value: "78%",
    label: "Completion",
    icon: <CheckIcons />,
  },
  {
    value: "6/7",
    label: "Days Active",
    icon: <CalendarIcon />,
  },
  {
    value: "30",
    label: "Days left",
    icon: <ClockIcon />,
  },
];

const SIGNAL_TYPES = [
  { id: "encourage", label: "Encourage", icon: <EncourageIcon /> },
  { id: "goal-share", label: "Goal Share", icon: <GoalIcon /> },
  { id: "push-back", label: "Push Back", icon: <PushIcon /> },
  { id: "check-in", label: "Check-In", icon: <RadarIcon /> },
  { id: "celebrate", label: "Celebrate", icon: <CelebrateIcon /> },
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
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

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

      <div className="rounded-3xl border border-brand/10 bg-surface p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-8">
          {/* Top Section */}
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              {/* Avatar */}
              <div
                className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-brand/10 text-2xl font-extrabold ${isDark ? "bg-white text-[#1A1A4E]" : "bg-tint text-ink"}`}
              >
                PS
              </div>

              {/* Details */}
              <div className="min-w-0">
                <span className="inline-flex rounded-md bg-tint px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.5px] text-ink">
                  YOUR PARTNER
                </span>

                <h2 className="mt-2 text-[24px] font-bold leading-8 text-ink">
                  Priya Sharma
                </h2>

                <p className="mt-1 text-sm font-semibold text-ink">
                  Priya is active today
                </p>

                <p className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted">
                  <span className="flex items-center gap-1">
                    <Location className="h-4 w-4 shrink-0" />
                    Maharashtra
                  </span>

                  <span>JEE Main + Advanced 2027</span>
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {STAT_CARDS.map((stat) => (
              <div
                key={stat.label}
                className="flex items-center gap-4 rounded-2xl border border-brand/10 bg-surface p-6 shadow-sm transition-colors"
              >
                {/* Icon */}
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-icon-chip-bg text-ink dark:bg-[#FAF7F2]/8">
                  {stat.icon}
                </div>

                {/* Text */}
                <div>
                  <p className="text-[36px] font-extrabold leading-none text-ink">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs font-bold text-muted">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-brand/10 bg-surface p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Left */}
          <div className="flex min-w-0 items-center gap-6">
            {/* Icon */}
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-brand/10 bg-tint shadow-sm">
              <CalendarIcon />
            </div>

            {/* Content */}
            <div className="min-w-0">
              <h3 className="text-[18px] font-semibold leading-none text-ink">
                Goal Setting Sunday
              </h3>

              <p className="mt-3 max-w-[520px] text-sm leading-5 text-muted">
                Set a meaningful goal for the week ahead and stay accountable
                together.
              </p>
            </div>
          </div>

          {/* Right */}
          <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
            <Button
              variant="primary"
              onClick={() => setGoalOpen(true)}
              className="h-12 rounded-xl border border-brand bg-transparent! px-8 text-base font-bold text-ink! hover:bg-cta! hover:text-white!"
            >
              Set Weekly Goal
            </Button>

            <p className="text-center text-[11px] italic text-muted lg:text-right">
              Only available on Sundays
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-brand/10 bg-surface p-5">
          <p className="text-sm font-bold text-ink">Shared Focus This Week</p>
          <p className="mt-2 text-3xl font-extrabold text-ink">19.5 hrs</p>
          <div className="mt-2 h-1.5 rounded-full bg-tint-strong">
            <div className={`h-1.5 w-[78%] rounded-full ${isDark ? "bg-white" : "bg-brand"}`} />
          </div>
          <p className="mt-2 text-xs text-ink">
            You&apos;re 2.5 hrs above your shared weekly target
          </p>
        </div>

        <div className="rounded-2xl border border-brand/10 bg-surface p-5">
          <p className="text-sm font-bold text-ink">Partner Pulse</p>
          <div className="mt-3 flex flex-col gap-3">
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className={`font-semibold ${isDark ? "text-white" : "text-[#64748B]"}`}>
                  Focus Today
                </span>
                <span className={isDark ? "text-white" : "text-muted"}>68%</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-tint-strong">
                <div className={`h-1.5 w-[68%] rounded-full ${isDark ? "bg-white" : "bg-brand"}`} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className={`font-semibold ${isDark ? "text-white" : "text-[#64748B]"}`}>
                  Weekly Consistency
                </span>
                <span className={isDark ? "text-white" : "text-muted"}>86%</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-tint-strong">
                <div className={`h-1.5 w-[86%] rounded-full ${isDark ? "bg-white" : "bg-brand"}`} />
              </div>
            </div>
            <div
              className={`flex items-center justify-between text-xs ${isDark ? "text-white" : "text-[#64748B]"}`}
            >
              <span>Last Active</span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                32 mins ago
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Signals + Send Signal — rebuilt with theme tokens (was hardcoded
          bg-white/hex colors that stayed white in dark mode) and a responsive
          grid (was a fixed w-[1082px]/w-[529px] pair that overflowed on
          anything narrower than that) */}
      <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-2">
        {/* LEFT PANEL */}
        <div className="flex w-full flex-col rounded-2xl border border-brand/10 bg-surface p-6 shadow-sm sm:p-8">
          {/* Header */}
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-ink">Recent Signals</h2>
          </div>

          {/* Signals */}
          <div className="mt-6 flex flex-col gap-5 sm:mt-8">
            {signals.map((signal) => (
              <div
                key={signal.id}
                className="flex items-start gap-4 border-b border-brand/10 pb-5 last:border-0 last:pb-0"
              >
                {/* Icon */}
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-tint text-ink">
                  {SIGNAL_TYPE_ICONS[signal.type]}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
                      {SIGNAL_TYPES.find((t) => t.id === signal.type)?.label}
                    </p>
                    <span className="shrink-0 text-xs text-muted">{signal.time}</span>
                  </div>

                  <p className="mt-1 text-base font-bold text-ink">{signal.message}</p>
                  <p className="mt-1 text-sm text-muted">{signal.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="flex w-full flex-col rounded-2xl border border-brand/10 bg-surface p-6 shadow-sm sm:p-8">
          {/* Heading */}
          <h2 className="text-lg font-bold text-ink">Send Signal</h2>
          <p className="mt-1 text-sm text-muted">Choose a signal type</p>

          {/* Signal Type */}
          <div className="mt-5 grid grid-cols-5 gap-2 sm:gap-3">
            {SIGNAL_TYPES.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => setSignalType(type.id)}
                className="flex flex-col items-center gap-2"
              >
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl border bg-tint text-ink transition-colors sm:h-14 sm:w-14 ${signalType === type.id ? "border-brand/20" : "border-brand/10"
                    } ${isDark ? "hover:bg-white hover:text-[#1A1A4E]" : "hover:bg-tint-strong"}`}
                >
                  {type.icon}
                </div>
                <span className="text-center text-[10px] font-medium leading-tight text-ink sm:text-xs">
                  {type.label}
                </span>
              </button>
            ))}
          </div>

          {/* Message */}
          <h3 className="mt-8 text-sm font-semibold text-ink">Choose a message</h3>

          <div className="mt-4 flex flex-col gap-3">
            {MESSAGES.map((option) => (
              <label
                key={option}
                className={`flex cursor-pointer items-center rounded-xl border px-4 py-4 ${message === option ? "border-brand" : "border-brand/10"
                  }`}
              >
                <input
                  type="radio"
                  checked={message === option}
                  onChange={() => setMessage(option)}
                  className="mr-4 shrink-0"
                />
                <span className="text-sm font-medium text-ink">{option}</span>
              </label>
            ))}
          </div>

          {/* Reaction */}
          <h3 className="mt-8 text-sm font-semibold text-ink">
            Add a reaction (optional)
          </h3>

          <div className="mt-4 flex flex-wrap gap-3">
            {REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setReaction((r) => (r === emoji ? null : emoji))}
                className={`flex h-12 w-12 items-center justify-center rounded-lg border text-xl ${reaction === emoji ? "border-brand bg-tint" : "border-brand/10"
                  }`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Button */}
          <Button
            variant="primary"
            className="mt-10 h-14 w-full rounded-xl text-base font-bold"
            onClick={handleSend}
          >
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