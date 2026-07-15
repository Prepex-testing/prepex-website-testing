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
  TargetIcon,
  ChevronDownIcon,
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
    breadcrumb: "Maths",
    title: "Tangents",
    overdueDays: 5,
    weight: 0.75,
  },
  {
    id: "lens",
    breadcrumb: "Physics",
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

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {/* Progress Card */}
        <div className="flex h-[142px] flex-col items-center justify-center rounded-2xl  p-6">
          <CircularProgress
            percent={65}
            displayValue={8}
            suffix=""
            label="Tasks"
            size={72}
          />

          <span className="mt-3 inline-flex h-[23px] items-center justify-center rounded-full bg-[#4C1D95] px-3 text-[10px] font-bold uppercase tracking-[0.8px] text-white shadow-[0px_1px_2px_0px_#0000000D]">
            Growing
          </span>
        </div>

        {/* Total Backlog */}
        <div className="flex h-[142px] items-center rounded-2xl border border-[#EEF0F8] bg-white p-6">
          <span className="mr-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#FFFBEB] text-[#F59E0B]">
            <AlertTriangleIcon />
          </span>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.6px] text-[#6B7280]">
              Total Backlog
            </p>

            <p className="mt-1 text-[24px] font-semibold leading-[31px] text-[#191C1D]">
              8 tasks
            </p>
          </div>
        </div>

        {/* Time Span */}
        <div className="flex h-[142px] items-center rounded-2xl border border-[#EEF0F8] bg-white p-6">
          <span className="mr-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#EEF2FF] text-[#1A1A4B]">
            <ClockIcon />
          </span>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.6px] text-[#6B7280]">
              Time Span
            </p>

            <p className="mt-1 text-[24px] font-semibold leading-[31px] text-[#191C1D]">
              Last 9 days
            </p>
          </div>
        </div>

        {/* Weekly Forecast */}
        <div className="flex h-[142px] items-center rounded-2xl border border-[#EEF0F8] bg-white p-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.6px] text-[#6B7280]">
              Weekly Forecast
            </p>

            <p className="mt-1 text-[24px] font-semibold leading-[31px] text-[#191C1D]">
              Clear by Friday
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-[#FFFFFF4D] bg-white p-6 backdrop-blur-[12px] lg:h-[98px] lg:flex-row lg:items-center lg:justify-between">
        {/* Left */}
        <div className="flex items-center gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[#1A1A4E] bg-[#EEF0F8] text-[#1A1A4E]">
            <BoltIcon />
          </span>

          <div>
            <h3 className="text-[14px] font-semibold leading-5 text-[#1D2447]">
              Your backlog is building.
            </h3>

            <p className="mt-0.5 text-[12px] leading-4 text-[#64748B]">
              Want to enter Recovery Mode to get back on track?
            </p>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            className="flex h-12 items-center justify-center px-4 text-[16px] font-semibold text-[#64748B] transition-colors hover:text-[#1A1A4E]"
          >
            Learn more
          </button>
          <button
            type="button"
            onClick={() => setRecoveryOpen(true)}
            className="flex h-12 w-[163px] items-center justify-center whitespace-nowrap rounded-lg border border-[#1A1A4E] bg-white px-6 text-[16px] font-semibold text-[#1A1A4E] transition-colors hover:bg-[#F8FAFC]"
          >
            Start Recovery
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <span className="h-[18px] w-[4px] rounded-full bg-[#F59E0B]" />

          <h2 className="text-[20px] font-semibold uppercase leading-7 text-[#171658]">
            Priority
          </h2>

          <span className="text-[14px] font-normal leading-[21px] text-[#464650]">
            (high-impact first)
          </span>
        </div>

        {PRIORITY_ITEMS.map((item) => (
          <div
            key={item.id}
            className="relative flex flex-col justify-between rounded-2xl bg-white px-8 py-8 shadow-[0px_4px_20px_0px_#00000008] lg:flex-row lg:items-center"
          >
            {/* Left */}
            <div className="flex-1">
              {/* Subject */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-[#EEF2FF] px-2 py-1 text-[11px] font-medium leading-[13px] text-[#1A1A4E]">
                  {item.breadcrumb}
                </span>

                <ChevronDownIcon className="h-3 w-3 -rotate-90 text-[#9CA3AF]" />

                <span className="text-[12px] font-semibold tracking-[0.24px] text-[#464650]">
                  {item.title}
                </span>
              </div>

              {/* Title */}
              <h3 className="mt-2 text-[20px] font-semibold leading-7 text-[#191C1D]">
                {item.title}
              </h3>

              {/* Meta */}
              <div className="mt-2 flex flex-wrap items-center gap-4">
                <span className="flex items-center gap-1 text-[12px] font-semibold tracking-[0.24px] text-[#F59E0B]">
                  <CalendarIcon />
                  {item.overdueDays} days overdue
                </span>

                <span className="flex items-center gap-1 text-[12px] font-semibold tracking-[0.24px] text-[#464650]">
                  <TargetIcon />
                  weight {item.weight}
                </span>
              </div>

              {/* Progress */}
              <div className="mt-4 h-2 w-full max-w-[482px] rounded-full bg-[#EEF2FF]">
                <div
                  className="h-2 rounded-full bg-[#2D2E6E]"
                  style={{
                    width: `${item.weight * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* Right */}
            <div className="mt-6 flex items-center gap-2 lg:mt-0 lg:ml-8">
              <button
                type="button"
                className="flex h-[44px] w-32 items-center justify-center rounded-lg bg-[#FF7A59] text-[16px] font-semibold text-white transition hover:brightness-105"
              >
                Add to plan
              </button>

              <button
                type="button"
                className="flex h-[44px] w-20 items-center justify-center rounded-lg border border-[#D1D5DB] bg-white text-[16px] font-medium text-[#3F3F46] transition hover:bg-[#F8FAFC]"
              >
                Hold
              </button>

              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-[#6B7280] hover:bg-[#F8FAFC]"
              >
                <span className="rotate-90">
                  <MoreIcon />
                </span>
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <ListIcon/>

          <h2 className="text-[20px] font-semibold uppercase leading-7 tracking-[-0.5px] text-[#1A1A4E]">
            Other Backlog
          </h2>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {OTHER_BACKLOG.map((item) => (
            <div
              key={item.id}
              className="flex h-[90px] items-center justify-between rounded-2xl border border-[#C7C5D14D] bg-white p-5 shadow-[0px_4px_20px_0px_#00000008]"
            >
              {/* Left */}
              <div className="flex items-center gap-4">
                {/* Subject Icon */}
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#1A1A4E]">
                  {SUBJECT_ICONS[item.subject]}
                </span>

                {/* Content */}
                <div>
                  <span className="inline-flex rounded-md bg-[#EEF2FF] px-2 py-[2px] text-[10px] font-medium text-[#1A1A4E]">
                    {SUBJECT_LABELS[item.subject]}
                  </span>

                  <h3 className="mt-1 text-[18px] font-semibold leading-5 text-[#191C1D]">
                    {item.title}
                  </h3>

                  <p className="mt-1 text-[11px] font-medium leading-4 text-[#64748B]">
                    {item.overdueDays} days overdue, weight {item.weight}
                  </p>
                </div>
              </div>

              {/* More Button */}
              <button
                type="button"
                aria-label={`More options for ${item.title}`}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F8FAFC]"
              >
                <span className="rotate-90">
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
