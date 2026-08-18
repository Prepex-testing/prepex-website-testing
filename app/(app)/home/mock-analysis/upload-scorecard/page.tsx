"use client";

import { Suspense, useEffect, useId, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { UserMenu } from "@/components/layout/UserMenu";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { DateInput } from "@/components/ui/DateInput";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ApiError } from "@/lib/api/http";
import {
  extractMockImage,
  getMockById,
  submitMock,
  updateMock,
  type MockEntryTier,
  type MockSubjectScoreInput,
} from "@/lib/api/mock";
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
  { value: "aakash", label: "Aakash Institute" },
  { value: "allen", label: "Allen Career Institute" },
  { value: "fiitjee", label: "FIITJEE" },
  { value: "resonance", label: "Resonance" },
  { value: "pw", label: "PW" },
  { value: "unacademy", label: "Unacademy" },
  { value: "narayana", label: "Narayana" },
  { value: "other", label: "Other" },
];

const SUPPORTED_SOURCES = ["Allen Career Institute", "PW", "FIITJEE", "Aakash Institute", "Resonance", "Other"];

const FIELD_CLASSES =
  "w-full rounded-xl border border-brand/15 bg-surface px-3 py-3 text-sm text-body-text outline-none placeholder:text-muted/70 focus:border-focus-ring";

// No exam-type picker exists on this page yet, so there's never a real
// value to send for it.
const EXAM_TYPE = undefined;

function sourceLabel(value: string): string | undefined {
  if (!value) return undefined;
  return SOURCE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

/** Parses a free-text field like "2h 30m" or "3h" into a whole-number string. */
function parseOptionalNumber(text: string): number | undefined {
  const trimmed = text.trim();
  if (trimmed === "") return undefined;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : undefined;
}

/**
 * Parses free-text durations like "2h 30m" or "3h" into total minutes. A
 * plain number (no "h"/"m" suffix, e.g. "120") is treated as minutes
 * directly. Empty input is omitted.
 */
function parseDurationMinutes(text: string): number | undefined {
  const trimmed = text.trim();
  if (trimmed === "") return undefined;
  if (/^\d+$/.test(trimmed)) return Number(trimmed);

  const hours = Number(trimmed.match(/(\d+)\s*h/i)?.[1] ?? 0);
  const minutes = Number(trimmed.match(/(\d+)\s*m/i)?.[1] ?? 0);
  return hours * 60 + minutes;
}

/** DateInput reports dates as DD/MM/YYYY — the API wants YYYY-MM-DD. */
function toIsoDate(display: string): string {
  const [day, month, year] = display.split("/").map(Number);
  if (!day || !month || !year) return "";
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** The API returns attemptedDate as an ISO date/datetime — DateInput wants DD/MM/YYYY. */
function toDisplayDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

/** Inverse of sourceLabel — maps an API label (e.g. "Allen") back to its Select value. */
function sourceValue(label: string | null | undefined): string {
  if (!label) return "";
  return SOURCE_OPTIONS.find((option) => option.label === label)?.value ?? "";
}

/** Inverse of parseDurationMinutes — formats total minutes back into "2h 30m" style text. */
function formatDurationMinutes(minutes: number | null | undefined): string {
  if (minutes == null || minutes <= 0) return "";
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (remainder > 0) parts.push(`${remainder}m`);
  return parts.join(" ");
}

export default function UploadScorecardPage() {
  return (
    <Suspense fallback={null}>
      <UploadScorecardContent />
    </Suspense>
  );
}

function UploadScorecardContent() {
  const searchParams = useSearchParams();
  const editMockId = searchParams.get("id");
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
          {TABS.map((item) => {
            const locked = !!editMockId && item.id !== "manual";
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                disabled={locked}
                onClick={() => !locked && setTab(item.id)}
                className={`flex h-[33px] flex-1 items-center justify-center whitespace-nowrap rounded-[6px] px-2 text-[12px] font-semibold leading-[21px] transition-colors sm:flex-none sm:px-5 sm:text-[14px] ${tab === item.id
                  ? "bg-[#FAF7F2] text-[#1A1A4E]"
                  : "bg-transparent text-white hover:bg-white/10"
                  } ${locked ? "cursor-not-allowed opacity-40" : ""}`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Form */}
        {tab === "manual" && <ManualForm mockId={editMockId} />}
        {tab === "upload-image" && <UploadImageForm disabled={!!editMockId} />}
        {tab === "quick-log" && <QuickLogForm disabled={!!editMockId} />}
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

type SubjectScoreValue = {
  score: string;
  maxScore: string;
  timeTaken: string;
  testDuration: string;
};

const EMPTY_SUBJECT_SCORE: SubjectScoreValue = {
  score: "",
  maxScore: "",
  timeTaken: "",
  testDuration: "",
};

/** Keyed by subject id — populated once /profile/subjects-chapters resolves. */
type SubjectScoresState = Record<number, SubjectScoreValue>;

/** Only subjects with both a score and a max score are included. Returns
 * `undefined` (not `[]`) when none qualify, so the key is omitted from the
 * request body rather than sent as an empty array. Time Taken/Test Duration
 * are optional per subject and omitted individually when blank. */
function buildSubjectScores(
  subjects: SubjectWithChapters[],
  subjectScores: SubjectScoresState,
): MockSubjectScoreInput[] | undefined {
  const result = subjects
    .filter((subject) => {
      const value = subjectScores[subject.id];
      return value && value.score.trim() !== "" && value.maxScore.trim() !== "";
    })
    .map((subject) => {
      const value = subjectScores[subject.id]!;
      return {
        subjectId: subject.id,
        score: Number(value.score),
        maxScore: Number(value.maxScore),
        timeTakenMinutes: parseOptionalNumber(value.timeTaken),
        testDurationMinutes: parseOptionalNumber(value.testDuration),
      };
    });

  return result.length > 0 ? result : undefined;
}

function MockDetailsFields({
  fields,
  onChange,
  dateInputKey,
}: {
  fields: ManualFields;
  onChange: <K extends keyof ManualFields>(key: K, value: ManualFields[K]) => void;
  dateInputKey?: string | number;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Mock Name"
          name="mockName"
          placeholder="Enter mock name"
          required
          value={fields.mockName}
          onChange={(event) => onChange("mockName", event.target.value)}
        />
        <DateInput
          key={dateInputKey}
          label="Date Attempted"
          name="dateAttempted"
          required
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
              placeholder="Marks Scored"
              aria-label="Marks Scored"
              value={fields.score}
              onChange={(event) => onChange("score", event.target.value)}
            />
            <input
              className={FIELD_CLASSES}
              placeholder="Maximum Marks"
              aria-label="Maximum Marks"
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

function ManualForm({ mockId }: { mockId?: string | null }) {
  const router = useRouter();
  const [level, setLevel] = useState<ManualLevel>(mockId ? "medium" : "basic");
  const [basicFields, setBasicFields] = useState<ManualFields>(EMPTY_MANUAL_FIELDS);
  const [mediumFields, setMediumFields] = useState<ManualFields>(EMPTY_MANUAL_FIELDS);
  const [subjects, setSubjects] = useState<SubjectWithChapters[]>([]);
  const [subjectScores, setSubjectScores] = useState<SubjectScoresState>({});
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPrefilling, setPrefilling] = useState(!!mockId);
  const [prefillTick, setPrefillTick] = useState(0);
  const [showSubjectScores, setShowSubjectScores] = useState(!mockId);

  useEffect(() => {
    getSubjectsChapters()
      .then(({ data }) => setSubjects(data.subjects))
      .catch(() => {
        // Best-effort — Subject Scores just won't have options if this fails.
      });
  }, []);

  useEffect(() => {
    if (!mockId) return;
    let cancelled = false;
    setPrefilling(true);
    setError(null);

    getMockById(mockId)
      .then(({ data }) => {
        if (cancelled) return;
        setLevel("medium");
        setMediumFields({
          mockName: data.mockName ?? "",
          dateDisplay: toDisplayDate(data.attemptedDate),
          source: sourceValue(data.sourceInstitute),
          score: data.totalScore != null ? String(data.totalScore) : "",
          totalMarks: data.maxScore != null ? String(data.maxScore) : "",
          timeTaken: formatDurationMinutes(data.timeTakenMinutes),
          testDuration: formatDurationMinutes(data.testDurationMinutes),
        });
        const scores: SubjectScoresState = {};
        for (const subjectAnalysis of data.subjectAnalysis ?? []) {
          scores[subjectAnalysis.subjectId] = {
            score: String(subjectAnalysis.score),
            maxScore: String(subjectAnalysis.maxScore),
            timeTaken:
              subjectAnalysis.timeTakenMinutes != null ? String(subjectAnalysis.timeTakenMinutes) : "",
            testDuration:
              subjectAnalysis.testDurationMinutes != null
                ? String(subjectAnalysis.testDurationMinutes)
                : "",
          };
        }
        setSubjectScores(scores);
        setPrefillTick((tick) => tick + 1);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load this mock's details. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setPrefilling(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mockId]);

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
      [subjectId]: { ...(current[subjectId] ?? EMPTY_SUBJECT_SCORE), [field]: value },
    }));

  const handleSave = async () => {
    const fields = level === "basic" ? basicFields : mediumFields;
    const entryTier: MockEntryTier = level === "basic" ? "BASIC" : "MEDIUM";
    const attemptedDate = toIsoDate(fields.dateDisplay);

    if (!fields.mockName.trim() || !attemptedDate) {
      setError("Mock Name and Date Attempted are required.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        attemptedDate,
        mockName: fields.mockName.trim(),
        sourceInstitute: sourceLabel(fields.source),
        examType: EXAM_TYPE,
        totalScore: parseOptionalNumber(fields.score),
        maxScore: parseOptionalNumber(fields.totalMarks),
        timeTakenMinutes: parseDurationMinutes(fields.timeTaken),
        testDurationMinutes: parseDurationMinutes(fields.testDuration),
        entryMethod: "MANUAL" as const,
        entryTier,
        subjectScores: level === "medium" ? buildSubjectScores(subjects, subjectScores) : undefined,
      };

      const savedId = mockId ? (await updateMock(mockId, payload)).data.id : (await submitMock(payload)).data.id;
      router.push(`/home/mock-analysis/view-analytics?id=${savedId}`);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Couldn't save this mock. Please try again.",
      );
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
        {MANUAL_LEVELS.map((item) => {
          const locked = !!mockId && item.id !== "medium";
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={level === item.id}
              disabled={locked}
              onClick={() => !locked && setLevel(item.id)}
              className={`flex h-[33px] flex-1 items-center justify-center whitespace-nowrap rounded-[6px] px-2 text-[12px] font-semibold leading-[21px] transition-colors sm:flex-none sm:px-5 sm:text-[14px] ${level === item.id
                ? "bg-[#FAF7F2] text-[#1A1A4E]"
                : "bg-transparent text-white hover:bg-white/10"
                } ${locked ? "cursor-not-allowed opacity-40" : ""}`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {level === "basic" && <MockDetailsFields fields={basicFields} onChange={updateBasicField} />}

      {level === "medium" && (
        <div className="flex flex-col gap-5">
          <MockDetailsFields
            fields={mediumFields}
            onChange={updateMediumField}
            dateInputKey={mockId ? `prefill-${prefillTick}` : "medium"}
          />

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-ink">Subject Scores (Optional)</p>
              {!showSubjectScores && (
                <button
                  type="button"
                  onClick={() => setShowSubjectScores(true)}
                  className="flex items-center gap-1 text-sm font-semibold text-cta"
                >
                  <PlusIcon />
                  Add Subject Score
                </button>
              )}
            </div>

            {showSubjectScores && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {subjects.map((subject) => {
                  const value = subjectScores[subject.id] ?? EMPTY_SUBJECT_SCORE;
                  return (
                    <div key={subject.id} className="flex flex-col gap-2">
                      <label className="text-[14px] font-semibold leading-5 text-ink">
                        {subject.name}
                      </label>
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-medium text-muted">Score / Max Score</span>
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
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-medium text-muted">
                          Time Taken / Test Duration (min)
                        </span>
                        <div className="flex gap-2">
                          <input
                            className={FIELD_CLASSES}
                            placeholder="Time taken (min)"
                            aria-label={`${subject.name} time taken`}
                            value={value.timeTaken}
                            onChange={(event) =>
                              updateSubjectScore(subject.id, "timeTaken", event.target.value)
                            }
                          />
                          <input
                            className={FIELD_CLASSES}
                            placeholder="Test duration (min)"
                            aria-label={`${subject.name} test duration`}
                            value={value.testDuration}
                            onChange={(event) =>
                              updateSubjectScore(subject.id, "testDuration", event.target.value)
                            }
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex flex-col items-center gap-2 pt-2">
        <Button variant="primary" onClick={handleSave} disabled={isSubmitting || isPrefilling}>
          {isSubmitting ? "Saving..." : isPrefilling ? "Loading..." : "Save & Analyze"}
        </Button>
      </div>
    </div>
  );
}

function UploadImageForm({ disabled = false }: { disabled?: boolean }) {
  const fileInputId = useId();
  const router = useRouter();

  const [isExtracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [parsedSuccessfully, setParsedSuccessfully] = useState(true);
  const [missingRequiredFields, setMissingRequiredFields] = useState<string[]>([]);

  const [subjects, setSubjects] = useState<SubjectWithChapters[]>([]);
  const [fields, setFields] = useState<ManualFields | null>(null);
  const [subjectScores, setSubjectScores] = useState<SubjectScoresState>({});
  const [extractedSubjectIds, setExtractedSubjectIds] = useState<number[]>([]);
  const [showAllSubjects, setShowAllSubjects] = useState(false);
  const [prefillTick, setPrefillTick] = useState(0);

  const [isSubmitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    getSubjectsChapters()
      .then(({ data }) => setSubjects(data.subjects))
      .catch(() => {
        // Best-effort — Subject Scores just won't have options if this fails.
      });
  }, []);

  const updateField = <K extends keyof ManualFields>(key: K, value: ManualFields[K]) =>
    setFields((current) => (current ? { ...current, [key]: value } : current));

  const updateSubjectScore = (
    subjectId: number,
    field: keyof SubjectScoreValue,
    value: string,
  ) =>
    setSubjectScores((current) => ({
      ...current,
      [subjectId]: { ...(current[subjectId] ?? EMPTY_SUBJECT_SCORE), [field]: value },
    }));

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setExtracting(true);
    setExtractError(null);
    setSaveError(null);
    setShowAllSubjects(false);
    setMissingRequiredFields([]);
    try {
      const { data } = await extractMockImage(file);
      const extracted = data.extractedData;

      setFields({
        mockName: extracted.mockName ?? "",
        dateDisplay: extracted.attemptedDate ? toDisplayDate(extracted.attemptedDate) : "",
        source: sourceValue(extracted.sourceInstitute),
        score: extracted.totalScore != null ? String(extracted.totalScore) : "",
        totalMarks: extracted.maxScore != null ? String(extracted.maxScore) : "",
        timeTaken: formatDurationMinutes(extracted.timeTakenMinutes),
        testDuration: formatDurationMinutes(extracted.testDurationMinutes),
      });

      const scores: SubjectScoresState = {};
      for (const subjectScore of extracted.subjectScores ?? []) {
        scores[subjectScore.subjectId] = {
          score: String(subjectScore.score),
          maxScore: String(subjectScore.maxScore),
          timeTaken:
            subjectScore.timeTakenMinutes != null ? String(subjectScore.timeTakenMinutes) : "",
          testDuration:
            subjectScore.testDurationMinutes != null ? String(subjectScore.testDurationMinutes) : "",
        };
      }
      setSubjectScores(scores);
      setExtractedSubjectIds((extracted.subjectScores ?? []).map((s) => s.subjectId));
      setPrefillTick((tick) => tick + 1);
      setSummary(data.summary || null);
      setParsedSuccessfully(data.parsedSuccessfully);

      const missing: string[] = [];
      if (!extracted.mockName) missing.push("Mock Name");
      if (!extracted.attemptedDate) missing.push("Date Attempted");
      setMissingRequiredFields(missing);
    } catch {
      setExtractError("Couldn't read this scorecard. Please try again or enter details manually.");
    } finally {
      setExtracting(false);
    }
  };

  const handleSave = async () => {
    if (!fields) return;
    const attemptedDate = toIsoDate(fields.dateDisplay);

    if (!fields.mockName.trim() || !attemptedDate) {
      setSaveError("Mock Name and Date Attempted are required.");
      return;
    }

    setSubmitting(true);
    setSaveError(null);
    try {
      const { data } = await submitMock({
        attemptedDate,
        mockName: fields.mockName.trim(),
        sourceInstitute: sourceLabel(fields.source),
        examType: EXAM_TYPE,
        totalScore: parseOptionalNumber(fields.score),
        maxScore: parseOptionalNumber(fields.totalMarks),
        timeTakenMinutes: parseDurationMinutes(fields.timeTaken),
        testDurationMinutes: parseDurationMinutes(fields.testDuration),
        entryMethod: "OCR",
        entryTier: "MEDIUM",
        subjectScores: buildSubjectScores(subjects, subjectScores),
      });
      router.push(`/home/mock-analysis/view-analytics?id=${data.id}`);
    } catch (err) {
      setSaveError(
        err instanceof ApiError ? err.message : "Couldn't save this mock. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm font-bold text-ink">1. Upload Screenshot</p>

      <label
        htmlFor={fileInputId}
        className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-brand/20 bg-surface px-6 py-10 text-center ${
          disabled || isExtracting ? "cursor-not-allowed opacity-60" : "cursor-pointer"
        }`}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-tint text-ink">
          <UploadIcon />
        </span>

        <p className="text-sm font-semibold text-ink">
          {isExtracting ? "Reading your scorecard…" : "Drag & drop your screenshot here"}
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
          disabled={disabled || isExtracting}
          onChange={handleFileChange}
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

      {extractError && <p className="text-sm text-danger">{extractError}</p>}

      {fields && (
        <div className="flex flex-col gap-5 border-t border-brand/10 pt-5">
          <p className="text-sm font-bold text-ink">2. Review Extracted Details</p>

          {summary && (
            <p className="text-xs text-muted">
              {parsedSuccessfully
                ? summary
                : `${summary} We couldn't read everything — please check the fields below.`}
            </p>
          )}

          {missingRequiredFields.length > 0 && (
            <p className="text-xs font-semibold text-danger">
              We couldn&apos;t detect the {missingRequiredFields.join(" and ")} from the image —
              please fill {missingRequiredFields.length > 1 ? "them" : "it"} in below.
            </p>
          )}

          <MockDetailsFields
            fields={fields}
            onChange={updateField}
            dateInputKey={`extracted-${prefillTick}`}
          />

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-ink">Subject Scores (Optional)</p>
              {extractedSubjectIds.length === 0 && !showAllSubjects && (
                <button
                  type="button"
                  onClick={() => setShowAllSubjects(true)}
                  className="flex items-center gap-1 text-sm font-semibold text-cta"
                >
                  <PlusIcon />
                  Add Subject Score
                </button>
              )}
            </div>

            {(() => {
              const subjectRows =
                extractedSubjectIds.length > 0
                  ? extractedSubjectIds.map((id) => ({
                      id,
                      name: subjects.find((subject) => subject.id === id)?.name ?? `Subject ${id}`,
                    }))
                  : showAllSubjects
                    ? subjects.map((subject) => ({ id: subject.id, name: subject.name }))
                    : [];

              if (subjectRows.length === 0) return null;

              return (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {subjectRows.map(({ id, name }) => {
                    const value = subjectScores[id] ?? EMPTY_SUBJECT_SCORE;
                    return (
                      <div key={id} className="flex flex-col gap-2">
                        <label className="text-[14px] font-semibold leading-5 text-ink">
                          {name}
                        </label>
                        <div className="flex gap-2">
                          <input
                            className={FIELD_CLASSES}
                            placeholder="Score"
                            aria-label={`${name} score`}
                            value={value.score}
                            onChange={(event) => updateSubjectScore(id, "score", event.target.value)}
                          />
                          <input
                            className={FIELD_CLASSES}
                            placeholder="Max score"
                            aria-label={`${name} max score`}
                            value={value.maxScore}
                            onChange={(event) =>
                              updateSubjectScore(id, "maxScore", event.target.value)
                            }
                          />
                        </div>
                        <div className="flex gap-2">
                          <input
                            className={FIELD_CLASSES}
                            placeholder="Time taken (min)"
                            aria-label={`${name} time taken`}
                            value={value.timeTaken}
                            onChange={(event) =>
                              updateSubjectScore(id, "timeTaken", event.target.value)
                            }
                          />
                          <input
                            className={FIELD_CLASSES}
                            placeholder="Test duration (min)"
                            aria-label={`${name} test duration`}
                            value={value.testDuration}
                            onChange={(event) =>
                              updateSubjectScore(id, "testDuration", event.target.value)
                            }
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {saveError && <p className="text-sm text-danger">{saveError}</p>}

          <Button variant="primary" onClick={handleSave} disabled={isSubmitting || disabled}>
            {isSubmitting ? "Saving..." : "Save & Analyze"}
          </Button>
        </div>
      )}
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

function QuickLogForm({ disabled = false }: { disabled?: boolean }) {
  const router = useRouter();
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
    const attemptedDate = toIsoDate(fields.dateDisplay);

    if (!fields.mockName.trim() || !attemptedDate) {
      setError("Mock Name and Date are required.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const hasTimeTaken = fields.timeTakenHours !== "" || fields.timeTakenMinutes !== "";
      const hasDuration = fields.durationHours !== "" || fields.durationMinutes !== "";
      const { data } = await submitMock({
        attemptedDate,
        mockName: fields.mockName.trim(),
        sourceInstitute: sourceLabel(fields.source),
        examType: EXAM_TYPE,
        totalScore: parseOptionalNumber(fields.score),
        maxScore: parseOptionalNumber(fields.totalMarks),
        timeTakenMinutes: hasTimeTaken
          ? (Number(fields.timeTakenHours) || 0) * 60 + (Number(fields.timeTakenMinutes) || 0)
          : undefined,
        testDurationMinutes: hasDuration
          ? (Number(fields.durationHours) || 0) * 60 + (Number(fields.durationMinutes) || 0)
          : undefined,
        entryMethod: "QUICK_LOG",
        entryTier: "QUICK",
      });
      router.push(`/home/mock-analysis/view-analytics?id=${data.id}`);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Couldn't save this mock. Please try again.",
      );
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
            required
            value={fields.mockName}
            onChange={(event) => updateField("mockName", event.target.value)}
          />
          <DateInput
            label="Date"
            name="quickDate"
            required
            defaultValue={fields.dateDisplay}
            onDateChange={(value) => updateField("dateDisplay", value)}
          />
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_2fr]">
          

          <div className="grid grid-cols-2 gap-4">
            <Input
              type="number"
              label="Marks Scored"
              name="quickScore"
              placeholder="Marks Scored"
              value={fields.score}
              onChange={(event) => updateField("score", event.target.value)}
            />

            <Input
              type="number"
              label="Maximum Marks"
              name="quickTotalMarks"
              placeholder="Maximum Marks"
              value={fields.totalMarks}
              onChange={(event) => updateField("totalMarks", event.target.value)}
            />
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        {/* Buttons */}
        <div className="">
          <Button
            variant="primary"
            className={isDark ? "border border-[#FAF7F2]" : undefined}
            onClick={handleSave}
            disabled={isSubmitting || disabled}
          >
            {isSubmitting ? "Saving..." : "Save & Analyze"}
          </Button>
        </div>
      </div>
    </div>
  );
}
