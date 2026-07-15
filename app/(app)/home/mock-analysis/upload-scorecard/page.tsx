"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { UserMenu } from "@/components/layout/UserMenu";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
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
          <ThemeToggle />
          <button
            type="button"
            aria-label="Notifications"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-muted hover:bg-tint-strong"
          >
            <BellIcon />
          </button>
          <UserMenu />
        </div>
      </div>

      <div className="rounded-2xl border border-brand/10 bg-surface p-6">
        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Upload method"
          className="mb-6 flex h-[41px] w-fit rounded-[8px] bg-[#1A1A4E] p-1"
        >
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={`flex h-[33px] items-center justify-center whitespace-nowrap rounded-[6px] px-5 text-[14px] font-semibold leading-[21px] transition-colors ${tab === item.id
                ? "bg-[#FAF7F2] text-[#1A1A4E]"
                : "bg-transparent text-white hover:bg-white/10"
                }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Form */}
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
          <label className="text-[14px] font-semibold leading-[20px] text-ink">
            Total Marks
          </label>
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
          className="flex h-[34px] w-[186px] shrink-0 items-center justify-center gap-2 rounded-[8px] border border-brand bg-surface px-4 py-2 font-['Plus_Jakarta_Sans'] text-[12px] font-bold leading-4 text-brand transition-colors"
        >
          <span className="flex h-4 w-4 items-center justify-center">
            <PlusIcon />
          </span>

          <span>Add Topic Breakdown</span>
        </button>
      </div>

      <div className="flex flex-col items-center gap-2 pt-2">
        <Button variant="primary">Save &amp; Analyze Later</Button>
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

        <p className="text-xs font-medium text-muted">
          or
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
    <div className="rounded-2xl border border-brand/10 bg-surface p-6">
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div>
          <h2 className="font-['Plus_Jakarta_Sans'] text-[20px] font-bold leading-7 text-ink">
            Quickly log your mock score
          </h2>

          <p className="mt-1 font-['Inter'] text-[16px] font-normal leading-6 text-muted">
            Save now and analyze in detail later.
          </p>
        </div>

        {/* Row 1 */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Input
            label="Mock Name"
            name="quickMockName"
            placeholder="e.g. Allen GT 14"
          />

          <Select
            label="Source"
            placeholder="Select source"
            options={SOURCE_OPTIONS}
          />
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_2fr]">
          <DateInput
            label="Date"
            name="quickDate"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              type="number"
              label="Score"
              name="quickScore"
              placeholder="Enter score"
            />

            <Select
              label="Total Marks"
              placeholder="Select total marks"
              options={TOTAL_MARKS_OPTIONS}
            />
          </div>
        </div>

        {/* Row 3 */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-[14px] font-semibold text-ink">
              Time Taken
            </label>

            <div className="grid grid-cols-2 gap-3">
              <input
                className={FIELD_CLASSES}
                placeholder="hh"
                aria-label="Time taken hours"
              />

              <input
                className={FIELD_CLASSES}
                placeholder="mm"
                aria-label="Time taken minutes"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-[14px] font-semibold text-ink">
              Test Duration <span className="text-muted">(optional)</span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <input
                className={FIELD_CLASSES}
                placeholder="hh"
                aria-label="Duration hours"
              />

              <input
                className={FIELD_CLASSES}
                placeholder="mm"
                aria-label="Duration minutes"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label
            htmlFor="quick-log-notes"
            className="mb-2 block text-[14px] font-semibold text-ink"
          >
            Notes <span className="text-muted">(optional)</span>
          </label>

          <textarea
            id="quick-log-notes"
            rows={5}
            maxLength={200}
            placeholder="Add any quick notes about this mock..."
            className="w-full resize-none rounded-xl border border-brand/15 bg-surface px-4 py-3 text-sm text-body-text outline-none placeholder:text-muted/70 focus:border-focus-ring"
          />

          <p className="mt-2 text-right text-xs text-muted">
            0 / 200
          </p>
        </div>

        {/* Buttons */}
        <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Button variant="secondary">
            Save &amp; Analyze Now
          </Button>

          <Button variant="primary">
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
