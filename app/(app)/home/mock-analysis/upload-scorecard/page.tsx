"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { UserMenu } from "@/components/layout/UserMenu";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { DateInput } from "@/components/ui/DateInput";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { submitMock, type MockEntryTier } from "@/lib/api/mock";
import { getSubjectsChapters, type SubjectWithChapters } from "@/lib/api/profile";
import {
  // ArrowLeftIcon,
  // BellIcon,
  RefreshIcon,
  PlusIcon,
  UploadIcon,
  InfoIcon,
} from "@/components/ui/icons";
import { ArrowLeftIcon ,BellIcon} from "@/assets/icons";
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

// No exam-type picker exists on this page yet — every submission from here
// is a practice mock.
const EXAM_TYPE = "Practice";

function sourceLabel(value: string): string {
  return SOURCE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

/** Parses free-text durations like "2h 30m" or "3h" into total minutes. */
function parseDurationMinutes(text: string): number {
  const hours = Number(text.match(/(\d+)\s*h/i)?.[1] ?? 0);
  const minutes = Number(text.match(/(\d+)\s*m/i)?.[1] ?? 0);
  return hours * 60 + minutes;
}

/** DateInput reports dates as DD/MM/YYYY — the API wants YYYY-MM-DD. */
function toIsoDate(display: string): string {
  const [day, month, year] = display.split("/").map(Number);
  if (!day || !month || !year) return "";
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

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

      <div className="rounded-2xl border border-brand/10 bg-surface p-6">
        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Upload method"
          className="mb-6 flex h-[41px] w-full rounded-[8px] bg-[#1A1A4E] p-1 sm:w-fit"
        >
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={`flex h-[33px] flex-1 items-center justify-center whitespace-nowrap rounded-[6px] px-2 text-[12px] font-semibold leading-[21px] transition-colors sm:flex-none sm:px-5 sm:text-[14px] ${tab === item.id
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

type ManualLevel = "basic" | "medium";

const MANUAL_LEVELS: { id: ManualLevel; label: string }[] = [
  { id: "basic", label: "Basic" },
  { id: "medium", label: "Medium" },
];

type ManualFields = {
  mockName: string;
  dateDisplay: string;
  source: string;
  score: string;
  totalMarks: string;
  timeTaken: string;
  testDuration: string;
};

const EMPTY_MANUAL_FIELDS: ManualFields = {
  mockName: "",
  dateDisplay: "",
  source: "",
  score: "",
  totalMarks: "",
  timeTaken: "",
  testDuration: "",
};

type SubjectScoreValue = { score: string; maxScore: string };

/** Keyed by subject id — populated once /profile/subjects-chapters resolves. */
type SubjectScoresState = Record<number, SubjectScoreValue>;

function MockDetailsFields({
  fields,
  onChange,
}: {
  fields: ManualFields;
  onChange: <K extends keyof ManualFields>(key: K, value: ManualFields[K]) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Mock Name"
          name="mockName"
          placeholder="Enter mock name"
          value={fields.mockName}
          onChange={(event) => onChange("mockName", event.target.value)}
        />
        <DateInput
          label="Date Attempted"
          name="dateAttempted"
          defaultValue={fields.dateDisplay}
          onDateChange={(value) => onChange("dateDisplay", value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          label="Source"
          placeholder="Select Source"
          options={SOURCE_OPTIONS}
          value={fields.source}
          onChange={(event) => onChange("source", event.target.value)}
        />
        <div className="flex flex-col gap-1">
          <label className="text-[14px] font-semibold leading-[20px] text-ink">
            Total Marks
          </label>
          <div className="mt-1 flex gap-2">
            <input
              className={FIELD_CLASSES}
              placeholder="Enter score"
              aria-label="Score"
              value={fields.score}
              onChange={(event) => onChange("score", event.target.value)}
            />
            <input
              className={FIELD_CLASSES}
              placeholder="Total marks"
              aria-label="Total marks"
              value={fields.totalMarks}
              onChange={(event) => onChange("totalMarks", event.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Time Taken"
          name="timeTaken"
          placeholder="eg 2h 30m"
          value={fields.timeTaken}
          onChange={(event) => onChange("timeTaken", event.target.value)}
        />
        <Input
          label="Test Duration"
          name="testDuration"
          placeholder="eg 3h"
          value={fields.testDuration}
          onChange={(event) => onChange("testDuration", event.target.value)}
        />
      </div>
    </div>
  );
}

function ManualForm() {
  const [level, setLevel] = useState<ManualLevel>("basic");
  const [basicFields, setBasicFields] = useState<ManualFields>(EMPTY_MANUAL_FIELDS);
  const [mediumFields, setMediumFields] = useState<ManualFields>(EMPTY_MANUAL_FIELDS);
  const [subjects, setSubjects] = useState<SubjectWithChapters[]>([]);
  const [subjectScores, setSubjectScores] = useState<SubjectScoresState>({});
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSubjectsChapters()
      .then(({ data }) => setSubjects(data.subjects))
      .catch(() => {
        // Best-effort — Subject Scores just won't have options if this fails.
      });
  }, []);

  const updateBasicField = <K extends keyof ManualFields>(key: K, value: ManualFields[K]) =>
    setBasicFields((current) => ({ ...current, [key]: value }));

  const updateMediumField = <K extends keyof ManualFields>(key: K, value: ManualFields[K]) =>
    setMediumFields((current) => ({ ...current, [key]: value }));

  const updateSubjectScore = (
    subjectId: number,
    field: keyof SubjectScoreValue,
    value: string,
  ) =>
    setSubjectScores((current) => ({
      ...current,
      [subjectId]: { ...(current[subjectId] ?? { score: "", maxScore: "" }), [field]: value },
    }));

  const handleSave = async () => {
    const fields = level === "basic" ? basicFields : mediumFields;
    const entryTier: MockEntryTier = level === "basic" ? "BASIC" : "MEDIUM";

    setSubmitting(true);
    setError(null);
    try {
      await submitMock({
        attemptedDate: toIsoDate(fields.dateDisplay),
        mockName: fields.mockName.trim(),
        sourceInstitute: sourceLabel(fields.source),
        examType: EXAM_TYPE,
        totalScore: Number(fields.score) || 0,
        maxScore: Number(fields.totalMarks) || 0,
        timeTakenMinutes: parseDurationMinutes(fields.timeTaken),
        testDurationMinutes: fields.testDuration
          ? parseDurationMinutes(fields.testDuration)
          : undefined,
        entryMethod: "MANUAL",
        entryTier,
        subjectScores:
          level === "medium"
            ? subjects
                .filter((subject) => (subjectScores[subject.id]?.score ?? "").trim() !== "")
                .map((subject) => {
                  const value = subjectScores[subject.id]!;
                  return {
                    subjectId: subject.id,
                    score: Number(value.score) || 0,
                    maxScore: Number(value.maxScore) || 0,
                  };
                })
            : undefined,
      });
    } catch {
      setError("Couldn't save this mock. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div
        role="tablist"
        aria-label="Manual entry detail level"
        className="flex h-[41px] w-full rounded-[8px] bg-[#1A1A4E] p-1 sm:w-fit"
      >
        {MANUAL_LEVELS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={level === item.id}
            onClick={() => setLevel(item.id)}
            className={`flex h-[33px] flex-1 items-center justify-center whitespace-nowrap rounded-[6px] px-2 text-[12px] font-semibold leading-[21px] transition-colors sm:flex-none sm:px-5 sm:text-[14px] ${level === item.id
              ? "bg-[#FAF7F2] text-[#1A1A4E]"
              : "bg-transparent text-white hover:bg-white/10"
              }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {level === "basic" && <MockDetailsFields fields={basicFields} onChange={updateBasicField} />}

      {level === "medium" && (
        <div className="flex flex-col gap-5">
          <MockDetailsFields fields={mediumFields} onChange={updateMediumField} />

          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-ink">Subject Scores (Optional)</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {subjects.map((subject) => {
                const value = subjectScores[subject.id] ?? { score: "", maxScore: "" };
                return (
                  <div key={subject.id} className="flex flex-col gap-1">
                    <label className="text-[14px] font-semibold leading-5 text-ink">
                      {subject.name}
                    </label>
                    <div className="flex gap-2">
                      <input
                        className={FIELD_CLASSES}
                        placeholder="Score"
                        aria-label={`${subject.name} score`}
                        value={value.score}
                        onChange={(event) =>
                          updateSubjectScore(subject.id, "score", event.target.value)
                        }
                      />
                      <input
                        className={FIELD_CLASSES}
                        placeholder="Max score"
                        aria-label={`${subject.name} max score`}
                        value={value.maxScore}
                        onChange={(event) =>
                          updateSubjectScore(subject.id, "maxScore", event.target.value)
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex flex-col items-center gap-2 pt-2">
        <Button variant="primary" onClick={handleSave} disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save & Analyze Later"}
        </Button>
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

type QuickLogFieldsState = {
  mockName: string;
  source: string;
  dateDisplay: string;
  score: string;
  totalMarks: string;
  timeTakenHours: string;
  timeTakenMinutes: string;
  durationHours: string;
  durationMinutes: string;
  notes: string;
};

const EMPTY_QUICK_LOG_FIELDS: QuickLogFieldsState = {
  mockName: "",
  source: "",
  dateDisplay: "",
  score: "",
  totalMarks: "",
  timeTakenHours: "",
  timeTakenMinutes: "",
  durationHours: "",
  durationMinutes: "",
  notes: "",
};

function QuickLogForm() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [fields, setFields] = useState<QuickLogFieldsState>(EMPTY_QUICK_LOG_FIELDS);
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = <K extends keyof QuickLogFieldsState>(
    key: K,
    value: QuickLogFieldsState[K],
  ) => setFields((current) => ({ ...current, [key]: value }));

  const handleSave = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const hasDuration = fields.durationHours !== "" || fields.durationMinutes !== "";
      await submitMock({
        attemptedDate: toIsoDate(fields.dateDisplay),
        mockName: fields.mockName.trim(),
        sourceInstitute: sourceLabel(fields.source),
        examType: EXAM_TYPE,
        totalScore: Number(fields.score) || 0,
        maxScore: Number(fields.totalMarks) || 0,
        timeTakenMinutes:
          (Number(fields.timeTakenHours) || 0) * 60 + (Number(fields.timeTakenMinutes) || 0),
        testDurationMinutes: hasDuration
          ? (Number(fields.durationHours) || 0) * 60 + (Number(fields.durationMinutes) || 0)
          : undefined,
        entryMethod: "QUICK_LOG",
        entryTier: "QUICK",
      });
    } catch {
      setError("Couldn't save this mock. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

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
            value={fields.mockName}
            onChange={(event) => updateField("mockName", event.target.value)}
          />
          <DateInput
            label="Date"
            name="quickDate"
            defaultValue={fields.dateDisplay}
            onDateChange={(value) => updateField("dateDisplay", value)}
          />
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_2fr]">
          

          <div className="grid grid-cols-2 gap-4">
            <Input
              type="number"
              label="Score"
              name="quickScore"
              placeholder="Enter score"
              value={fields.score}
              onChange={(event) => updateField("score", event.target.value)}
            />

            <Select
              label="Total Marks"
              placeholder="Select total marks"
              options={TOTAL_MARKS_OPTIONS}
              value={fields.totalMarks}
              onChange={(event) => updateField("totalMarks", event.target.value)}
            />
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        {/* Buttons */}
        <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Button
            variant="secondary"
            style={isDark ? { borderColor: "#FAF7F2" } : undefined}
            onClick={handleSave}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save & Analyze Now"}
          </Button>

          <Button
            variant="primary"
            className={isDark ? "border border-[#FAF7F2]" : undefined}
            onClick={handleSave}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
