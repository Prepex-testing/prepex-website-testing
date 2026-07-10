"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { UserMenu } from "@/components/layout/UserMenu";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { DateInput } from "@/components/ui/DateInput";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  ArrowLeftIcon,
  BellIcon,
  RefreshIcon,
  PlusIcon,
  UploadIcon,
  InfoIcon,
} from "@/components/ui/icons";

type Tab = "manual" | "upload-image" | "quick-log";

const TABS: { id: Tab; label: string }[] = [
  { id: "manual", label: "Manual" },
  { id: "upload-image", label: "Upload Image" },
  { id: "quick-log", label: "Quick Log" },
];

const TAB_SUBTITLES: Record<Tab, string> = {
  manual: "Enter your mock test details manually",
  "upload-image": "Upload a screenshot and we'll extract the details",
  "quick-log": "Save now and analyze in detail later",
};

const SOURCE_OPTIONS = [
  { value: "allen", label: "Allen" },
  { value: "pw", label: "PW" },
  { value: "fiitjee", label: "FIITJEE" },
  { value: "aakash", label: "Aakash" },
  { value: "resonance", label: "Resonance" },
  { value: "other", label: "Other" },
];

const TOTAL_MARKS_OPTIONS = [
  { value: "300", label: "300" },
  { value: "360", label: "360" },
  { value: "720", label: "720" },
];

const SUPPORTED_SOURCES = ["Allen", "PW", "FIITJEE", "Aakash", "Resonance", "Other"];

const FIELD_CLASSES =
  "w-full rounded-xl border border-brand/15 bg-surface px-3 py-3 text-sm text-body-text outline-none placeholder:text-muted/70 focus:border-focus-ring";

export default function UploadScorecardPage() {
  const [tab, setTab] = useState<Tab>("manual");

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/home/mock-analysis"
            aria-label="Back to Mock Analysis"
            className="text-ink"
          >
            <ArrowLeftIcon />
          </Link>
          <div>
            <h1 className="text-h1 text-ink">Upload Mock Analysis</h1>
            <p className="text-sm text-muted">{TAB_SUBTITLES[tab]}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Refresh"
            className="flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-tint-strong"
          >
            <RefreshIcon />
          </button>
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

      <div
        role="tablist"
        aria-label="Upload method"
        className="inline-flex w-fit flex-wrap rounded-full bg-tint-strong p-1"
      >
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              tab === item.id
                ? "bg-brand text-white"
                : "text-muted hover:text-ink"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-brand/10 bg-surface p-6">
        {tab === "manual" && <ManualForm />}
        {tab === "upload-image" && <UploadImageForm />}
        {tab === "quick-log" && <QuickLogForm />}
      </div>
    </div>
  );
}

function ManualForm() {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Mock Name" name="mockName" placeholder="Enter mock name" />
        <DateInput label="Date Attempted" name="dateAttempted" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select label="Source" placeholder="Select Source" options={SOURCE_OPTIONS} />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-ink">Total Marks</label>
          <div className="mt-1 flex gap-2">
            <input className={FIELD_CLASSES} placeholder="Enter score" aria-label="Score" />
            <input className={FIELD_CLASSES} placeholder="Total marks" aria-label="Total marks" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Time Taken" name="timeTaken" placeholder="eg 2h 30m" />
        <Input label="Test Duration" name="testDuration" placeholder="eg 3h" />
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-ink">Subject Scores (Optional)</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input label="Physics" name="physicsScore" placeholder="Score" />
          <Input label="Chemistry" name="chemistryScore" placeholder="Score" />
          <Input label="Maths" name="mathsScore" placeholder="Score" />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand/10 pt-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">
            Topic Breakdown <span className="font-normal text-muted">(Optional)</span>
          </p>
          <p className="text-xs text-muted">
            Add a per-topic breakdown for a deeper analysis later
          </p>
        </div>
        <button
          type="button"
          className="flex shrink-0 items-center gap-1 text-xs font-semibold text-ink"
        >
          <PlusIcon />
          Add Topic Breakdown
        </button>
      </div>

      <div className="flex flex-col items-center gap-2 pt-2">
        <Button variant="primary">Save &amp; Analyze Later</Button>
        <button type="button" className="text-sm font-semibold text-ink underline">
          Generate Basic Analysis
        </button>
      </div>
    </div>
  );
}

function UploadImageForm() {
  const fileInputId = useId();

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm font-bold text-ink">1. Upload Screenshot</p>

      <label
        htmlFor={fileInputId}
        className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-brand/20 bg-surface px-6 py-10 text-center"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-tint text-ink">
          <UploadIcon />
        </span>
        <p className="text-sm font-semibold text-ink">
          Drag &amp; drop your screenshot here
        </p>
        <span className="flex h-9 items-center justify-center rounded-lg border border-brand/15 bg-surface px-4 text-sm font-semibold text-body-text hover:bg-tint-strong">
          Browse Files
        </span>
        <p className="text-xs text-muted">Max. 20 MB • JPG, PNG, HEIC</p>
        <input
          id={fileInputId}
          type="file"
          accept="image/jpeg,image/png,image/heic"
          className="sr-only"
        />
      </label>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-ink">Supported Sources</p>
        <div className="flex flex-wrap gap-2">
          {SUPPORTED_SOURCES.map((source) => (
            <Chip key={source}>{source}</Chip>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-xl bg-tint-strong p-3">
        <span className="mt-0.5 text-ink">
          <InfoIcon />
        </span>
        <p className="text-xs text-muted">
          We&apos;ll auto-analyze your score, time etc. Question-level detail won&apos;t be
          detected automatically.
        </p>
      </div>

      <Button variant="primary">Upload &amp; Analyze</Button>
    </div>
  );
}

function QuickLogForm() {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Mock Name" name="quickMockName" placeholder="e.g. Allen GT 14" />
        <Select label="Source" placeholder="Select source" options={SOURCE_OPTIONS} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DateInput label="Date" name="quickDate" />
        <div className="grid grid-cols-2 gap-2">
          <Input label="Score" name="quickScore" placeholder="Enter score" />
          <Select
            label="Total Marks"
            placeholder="Select total marks"
            options={TOTAL_MARKS_OPTIONS}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-ink">Time Taken</label>
          <div className="mt-1 flex gap-2">
            <input className={FIELD_CLASSES} placeholder="0h" aria-label="Time taken hours" />
            <input className={FIELD_CLASSES} placeholder="0m" aria-label="Time taken minutes" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-ink">Test Duration</label>
          <div className="mt-1 flex gap-2">
            <input className={FIELD_CLASSES} placeholder="0h" aria-label="Test duration hours" />
            <input className={FIELD_CLASSES} placeholder="0m" aria-label="Test duration minutes" />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="quick-log-notes" className="text-sm font-semibold text-ink">
          Notes <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea
          id="quick-log-notes"
          rows={3}
          maxLength={500}
          placeholder="Add any quick notes about how the mock went..."
          className="mt-1 w-full resize-none rounded-xl border border-brand/15 bg-surface px-4 py-3 text-sm text-body-text outline-none placeholder:text-muted/70 focus:border-focus-ring"
        />
        <p className="self-end text-xs text-muted">0/500</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex-1">
          <Button variant="secondary">Save &amp; Analyze Now</Button>
        </div>
        <div className="flex-1">
          <Button variant="primary">Save</Button>
        </div>
      </div>
    </div>
  );
}
