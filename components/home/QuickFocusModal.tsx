"use client";

import { useId } from "react";
import { WhiteModal } from "@/components/ui/WhiteModal";
import {
  TargetIcon,
  BookIcon,
  PencilIcon,
  PlayIcon,
  XIcon,
  ChevronDownIcon,
} from "@/components/ui/icons";

const SUBJECT_OPTIONS = ["Physics", "Chemistry", "Maths", "Biology"];
const TOPIC_OPTIONS = ["Optics", "Kinematics", "Newton's Laws", "Electrostatics"];
const TYPE_OPTIONS = ["Practice", "Concept Review", "Mock Questions", "Flashcards"];

const ROWS = [
  { label: "Subject", icon: <BookIcon />, options: SUBJECT_OPTIONS, defaultValue: "Physics" },
  { label: "Topic", icon: <TargetIcon />, options: TOPIC_OPTIONS, defaultValue: "Optics" },
  { label: "Type", icon: <PencilIcon />, options: TYPE_OPTIONS, defaultValue: "Practice" },
];

type QuickFocusModalProps = {
  open: boolean;
  onClose: () => void;
};

export function QuickFocusModal({ open, onClose }: QuickFocusModalProps) {
  return (
    <WhiteModal open={open} onClose={onClose} ariaLabel="Quick Focus">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-tint text-ink">
            <TargetIcon />
          </span>
          <div>
            <h2 className="text-h2 text-ink">Quick Focus</h2>
            <p className="text-sm text-muted">
              Focus on a specific area to improve faster.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-brand/15 text-muted hover:bg-tint-strong"
        >
          <XIcon />
        </button>
      </div>

      <div className="mt-6 rounded-2xl bg-tint-strong/40">
        {ROWS.map((row, index) => (
          <QuickFocusRow key={row.label} {...row} isLast={index === ROWS.length - 1} />
        ))}
      </div>

      <button
        type="button"
        onClick={onClose}
        className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-cta text-base font-semibold text-white hover:bg-cta/90"
      >
        <PlayIcon />
        Start Quick Focus
      </button>

      <p className="mt-3 text-center text-xs text-muted">
        You&apos;ll get a focused practice session with targeted questions and instant
        feedback.
      </p>
    </WhiteModal>
  );
}

type QuickFocusRowProps = {
  label: string;
  icon: React.ReactNode;
  options: string[];
  defaultValue: string;
  isLast: boolean;
};

function QuickFocusRow({ label, icon, options, defaultValue, isLast }: QuickFocusRowProps) {
  const selectId = useId();

  return (
    <div
      className={`flex items-center gap-3 p-3 ${isLast ? "" : "border-b border-brand/10"}`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface text-ink">
        {icon}
      </span>
      <label
        htmlFor={selectId}
        className="w-20 shrink-0 text-xs font-bold uppercase tracking-wide text-muted"
      >
        {label}
      </label>
      <div className="relative flex-1">
        <select
          id={selectId}
          defaultValue={defaultValue}
          className="w-full appearance-none rounded-xl border border-brand/15 bg-surface px-4 py-3 pr-9 text-sm text-body-text outline-none focus:border-focus-ring"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      </div>
    </div>
  );
}
