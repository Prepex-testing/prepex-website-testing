"use client";

import { Suspense, useEffect, useId, useMemo, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { UserMenu } from "@/components/layout/UserMenu";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { DateInput } from "@/components/ui/DateInput";
import { Input } from "@/components/ui/Input";
import { CustomSelect } from "@/components/ui/CustomSelect";
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
  RefreshIcon,
  PlusIcon,
  UploadIcon,
  InfoIcon,
} from "@/components/ui/icons";
import { ArrowLeftIcon } from "@/assets/icons";
import { DateField } from "@/components/ui/DateField";
import { DurationInput } from "@/components/ui/DurationInput";

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

// Animation presets
const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const fadeTransition = {
  duration: 0.25,
  ease: [0.4, 0, 0.2, 1] as const,
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
  "min-w-0 flex-1 rounded-xl border border-input-border bg-surface px-4 py-3 font-['Plus_Jakarta_Sans'] text-[14px] font-medium leading-[14px] tracking-normal text-ink outline-none transition-colors placeholder:text-[14px] placeholder:font-normal placeholder:leading-5 placeholder:text-[#666666] focus:border-input-border dark:placeholder:text-[#8B8998] sm:text-[16px] sm:leading-[16px] sm:placeholder:text-[14px]";

const EXAM_TYPE = undefined;

function sourceLabel(value: string): string | undefined {
  if (!value) return undefined;
  return SOURCE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

const validateScores = (
  score: string,
  totalMarks: string,
): string | null => {
  if (score === "" || totalMarks === "") {
    return null;
  }

  const scored = Number(score);
  const maximum = Number(totalMarks);

  if (!Number.isFinite(scored) || !Number.isFinite(maximum)) {
    return "Please enter valid marks.";
  }

  if (scored < 0 || maximum < 0) {
    return "Marks cannot be negative.";
  }

  if (scored > maximum) {
    return `maxScore (${maximum}) must be >= totalScore (${scored})`;
  }

  return null;
};

function parseOptionalNumber(text: string): number | undefined {
  const trimmed = text.trim();
  if (trimmed === "") return undefined;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : undefined;
}

function parseDurationMinutes(text: string): number | undefined {
  const trimmed = text.trim();
  if (trimmed === "") return undefined;
  if (/^\d+$/.test(trimmed)) return Number(trimmed);

  const hours = Number(trimmed.match(/(\d+)\s*h/i)?.[1] ?? 0);
  const minutes = Number(trimmed.match(/(\d+)\s*m/i)?.[1] ?? 0);
  return hours * 60 + minutes;
}

function toIsoDate(display: string): string {
  const [day, month, year] = display.split("/").map(Number);
  if (!day || !month || !year) return "";
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** A dd/mm/yyyy date later than today (local) — a mock can't be attempted in the future. */
function isFutureDisplayDate(display: string): boolean {
  const iso = toIsoDate(display);
  if (!iso) return false;
  const now = new Date();
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return iso > todayIso;
}

const FUTURE_DATE_ERROR = "Date attempted can't be in the future.";

function toDisplayDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

function sourceValue(label: string | null | undefined): string {
  if (!label) return "";
  return SOURCE_OPTIONS.find((option) => option.label === label)?.value ?? "";
}

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
  const [level, setLevel] = useState<ManualLevel>(editMockId ? "medium" : "basic");

  return (
    <motion.div
      {...fadeIn}
      transition={{ ...fadeTransition, duration: 0.35 }}
      className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8"
    >
      {/* Header */}
      <motion.div
        {...fadeIn}
        transition={{ ...fadeTransition, duration: 0.3 }}
        className="flex flex-wrap items-center justify-between gap-3"
      >
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
            <AnimatePresence mode="wait">
              <motion.p
                key={tab}
                {...fadeIn}
                transition={{ ...fadeTransition, duration: 0.2 }}
                className="text-sm text-muted"
              >
                {TAB_SUBTITLES[tab]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <ThemeToggle />
          <NotificationBell />
          <UserMenu />
        </div>
      </motion.div>

      <motion.div
        {...fadeIn}
        transition={{ ...fadeTransition, delay: 0.05 }}
        className="rounded-2xl border border-brand/10 bg-surface p-6"
      >
        {/* Tabs */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div
            role="tablist"
            aria-label="Upload method"
            className="flex h-[41px] w-full rounded-[8px] bg-[#1A1A4E] p-1 sm:w-fit"
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

          {tab === "manual" && (
            <div
              role="tablist"
              aria-label="Manual entry detail level"
              className="flex h-[41px] w-full rounded-[8px] border border-brand bg-surface p-1 sm:w-fit dark:border-white"
            >
              {MANUAL_LEVELS.map((item) => {
                const locked = !!editMockId && item.id !== "medium";

                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={level === item.id}
                    disabled={locked}
                    onClick={() => !locked && setLevel(item.id)}
                    className={`flex h-[33px] flex-1 items-center justify-center whitespace-nowrap rounded-[6px] px-2 text-[12px] font-semibold leading-[21px] transition-colors sm:flex-none sm:px-5 sm:text-[14px] ${level === item.id
                      ? "bg-brand text-surface dark:bg-white dark:text-[#1A1A4E]"
                      : "bg-transparent text-brand hover:bg-brand/5 dark:text-white dark:hover:bg-white/10"
                      } ${locked ? "cursor-not-allowed opacity-40" : ""
                      }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Form with AnimatePresence for smooth tab transitions */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            {...fadeIn}
            transition={fadeTransition}
          >
            {tab === "manual" && <ManualForm mockId={editMockId} level={level} setLevel={setLevel} />}
            {tab === "upload-image" && <UploadImageForm disabled={!!editMockId} />}
            {tab === "quick-log" && <QuickLogForm disabled={!!editMockId} />}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </motion.div>
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
  timeTaken: number | undefined;
  testDuration: number | undefined;
};

const EMPTY_MANUAL_FIELDS: ManualFields = {
  mockName: "",
  dateDisplay: "",
  source: "",
  score: "",
  totalMarks: "",
  timeTaken: undefined,
  testDuration: undefined,
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

type SubjectScoresState = Record<number, SubjectScoreValue>;

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
  onScoreError,
  scoreError,
  dateError,
  dateInputKey,
}: {
  fields: ManualFields;
  onChange: <K extends keyof ManualFields>(key: K, value: ManualFields[K]) => void;
  onScoreError: (error: string | null) => void;
  scoreError?: string | null;
  dateError?: string | null;
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
          labelClassName="text-[13px] font-medium leading-5 text-body-text dark:text-ink sm:text-[14px] sm:leading-5"
        />
        <DateField
          key={dateInputKey}
          label="Date Attempted"
          name="dateAttempted"
          required
          disableFuture
          error={dateError}
          defaultValue={fields.dateDisplay}
          onDateChange={(value) => onChange("dateDisplay", value)}
          labelClassName="text-[13px] font-medium leading-5 text-body-text dark:text-ink sm:text-[14px] sm:leading-5"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CustomSelect
          label="Source"
          placeholder="Select Source"
          options={SOURCE_OPTIONS}
          value={fields.source}
          onChange={(value) => onChange("source", value)}
          labelClassName="text-[13px] font-medium leading-5 text-body-text dark:text-ink sm:text-[14px] sm:leading-5"
        />

        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-medium leading-5 text-body-text dark:text-ink sm:text-[14px]">
            Total Marks
          </label>

          <div className="flex flex-col gap-1">
            <div className="flex gap-2">
              <input
                type="number"
                className="min-w-0 flex-1 rounded-xl border border-input-border bg-surface px-4 py-3 font-['Plus_Jakarta_Sans'] text-[14px] font-medium leading-[14px] tracking-normal text-ink outline-none transition-colors placeholder:text-[14px] placeholder:font-normal placeholder:leading-5 placeholder:text-[#666666] focus:border-input-border dark:placeholder:text-[#8B8998] sm:text-[16px] sm:leading-[16px]"
                placeholder="Marks Scored"
                aria-label="Marks Scored"
                value={fields.score}
                onChange={(event) => {
                  onChange("score", event.target.value);
                  onScoreError(
                    validateScores(
                      event.target.value,
                      fields.totalMarks,
                    ),
                  );
                }}
              />

              <input
                type="number"
                className="min-w-0 flex-1 rounded-xl border border-input-border bg-surface px-4 py-3 font-['Plus_Jakarta_Sans'] text-[14px] font-medium leading-[14px] tracking-normal text-ink outline-none transition-colors placeholder:text-[14px] placeholder:font-normal placeholder:leading-5 placeholder:text-[#666666] focus:border-input-border dark:placeholder:text-[#8B8998] sm:text-[16px] sm:leading-[16px]"
                placeholder="Maximum Marks"
                aria-label="Maximum Marks"
                value={fields.totalMarks}
                onChange={(event) => {
                  onChange("totalMarks", event.target.value);
                  onScoreError(
                    validateScores(
                      fields.score,
                      event.target.value,
                    ),
                  );
                }}
              />
            </div>
            {scoreError && <p className="text-xs text-danger">{scoreError}</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DurationInput
          label="Time Taken"
          value={fields.timeTaken}
          onChange={(minutes) => onChange("timeTaken", minutes)}
        />

        <DurationInput
          label="Test Duration"
          value={fields.testDuration}
          onChange={(minutes) => onChange("testDuration", minutes)}
        />
      </div>
    </div>
  );
}

function ManualForm({
  mockId,
  level,
  setLevel,
}: {
  mockId?: string | null;
  level: ManualLevel;
  setLevel: (level: ManualLevel) => void;
}) {
  const router = useRouter();
  const [basicFields, setBasicFields] = useState<ManualFields>(EMPTY_MANUAL_FIELDS);
  const [mediumFields, setMediumFields] = useState<ManualFields>(EMPTY_MANUAL_FIELDS);
  const [subjects, setSubjects] = useState<SubjectWithChapters[]>([]);
  const [subjectScores, setSubjectScores] = useState<SubjectScoresState>({});
  const [subjectScoreErrors, setSubjectScoreErrors] = useState<Record<number, string | null>>({});
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [isPrefilling, setPrefilling] = useState(!!mockId);
  const [prefillTick, setPrefillTick] = useState(0);
  const [showSubjectScores, setShowSubjectScores] = useState(!mockId);
  // The stored date of a mock being edited. A scheduled mock can carry a
  // future date; keeping it as-is is allowed, changing to another future
  // date isn't.
  const [originalDateDisplay, setOriginalDateDisplay] = useState("");

  const activeDateDisplay = level === "basic" ? basicFields.dateDisplay : mediumFields.dateDisplay;
  const dateError =
    isFutureDisplayDate(activeDateDisplay) && activeDateDisplay !== originalDateDisplay
      ? FUTURE_DATE_ERROR
      : null;

  const isManualRequiredReady =
    !!(level === "basic" ? basicFields.mockName.trim() : mediumFields.mockName.trim()) &&
    !!toIsoDate(level === "basic" ? basicFields.dateDisplay : mediumFields.dateDisplay);
  const hasInvalidSubjectScore = Object.values(subjectScoreErrors).some((message) => !!message);

  useEffect(() => {
    getSubjectsChapters()
      .then(({ data }) => setSubjects(data.subjects))
      .catch(() => {
        // Best-effort
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

        setOriginalDateDisplay(toDisplayDate(data.attemptedDate));
        setMediumFields({
          mockName: data.mockName ?? "",
          dateDisplay: toDisplayDate(data.attemptedDate),
          source: sourceValue(data.sourceInstitute),
          score: data.totalScore != null ? String(data.totalScore) : "",
          totalMarks: data.maxScore != null ? String(data.maxScore) : "",
          timeTaken: data.timeTakenMinutes ?? undefined,
          testDuration: data.testDurationMinutes ?? undefined,
        });

        const scores: SubjectScoresState = {};

        for (const subjectAnalysis of data.subjectAnalysis ?? []) {
          scores[subjectAnalysis.subjectId] = {
            score: String(subjectAnalysis.score),
            maxScore: String(subjectAnalysis.maxScore),
            timeTaken:
              subjectAnalysis.timeTakenMinutes != null
                ? String(subjectAnalysis.timeTakenMinutes)
                : "",
            testDuration:
              subjectAnalysis.testDurationMinutes != null
                ? String(subjectAnalysis.testDurationMinutes)
                : "",
          };
        }

        setSubjectScores(scores);
        setSubjectScoreErrors(
          Object.fromEntries(
            Object.entries(scores).map(([subjectId, value]) => [
              Number(subjectId),
              validateScores(value.score, value.maxScore),
            ]),
          ),
        );
        setPrefillTick((tick) => tick + 1);
      })
      .catch(() => {
        if (!cancelled) {
          setError(
            "Couldn't load this mock's details. Please try again.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPrefilling(false);
        }
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
  ) => {
    setSubjectScores((current) => {
      const nextValue = {
        ...(current[subjectId] ?? EMPTY_SUBJECT_SCORE),
        [field]: value,
      };

      const nextScore = field === "score" ? value : nextValue.score;
      const nextMaxScore = field === "maxScore" ? value : nextValue.maxScore;

      setSubjectScoreErrors((currentErrors) => ({
        ...currentErrors,
        [subjectId]: validateScores(nextScore, nextMaxScore),
      }));

      return {
        ...current,
        [subjectId]: nextValue,
      };
    });
  };

  const handleSave = async () => {
    const fields = level === "basic" ? basicFields : mediumFields;
    const entryTier: MockEntryTier = level === "basic" ? "BASIC" : "MEDIUM";
    const attemptedDate = toIsoDate(fields.dateDisplay);

    if (!fields.mockName.trim() || !attemptedDate || dateError) {
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
        timeTakenMinutes: fields.timeTaken,
        testDurationMinutes: fields.testDuration,
        entryMethod: "MANUAL" as const,
        entryTier,
        subjectScores:
          level === "medium"
            ? buildSubjectScores(subjects, subjectScores)
            : undefined,
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
      <AnimatePresence mode="wait">
        <motion.div
          key={level}
          {...fadeIn}
          transition={fadeTransition}
          className="flex flex-col gap-5"
        >
          {level === "basic" && (
            <MockDetailsFields
              fields={basicFields}
              onChange={updateBasicField}
              onScoreError={setScoreError}
              scoreError={scoreError}
              dateError={dateError}
            />
          )}

          {level === "medium" && (
            <div className="flex flex-col gap-5">
              <MockDetailsFields
                fields={mediumFields}
                onChange={updateMediumField}
                onScoreError={setScoreError}
                scoreError={scoreError}
                dateError={dateError}
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
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {subjects.map((subject) => {
                      const value = subjectScores[subject.id] ?? EMPTY_SUBJECT_SCORE;
                      return (
                        <div
                          key={subject.id}
                          className="flex flex-col gap-2 rounded-xl border border-brand/15 bg-surface p-4 shadow-sm dark:border-white/10 dark:shadow-black/20"
                        >
                          <label className="text-[14px] font-semibold leading-5 text-ink sm:text-[16px]">
                            {subject.name}
                          </label>
                          <div className="flex flex-col gap-2">
                            <label className="text-[13px] font-medium leading-none text-body-text dark:text-ink sm:text-[14px]">
                              Total Marks
                            </label>
                            <div className="flex flex-col gap-1">
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  min={0}
                                  className={FIELD_CLASSES}
                                  placeholder="Score"
                                  aria-label={`${subject.name} score`}
                                  value={value.score}
                                  onChange={(event) =>
                                    updateSubjectScore(subject.id, "score", event.target.value)
                                  }
                                />

                                <input
                                  type="number"
                                  min={0}
                                  className={FIELD_CLASSES}
                                  placeholder="Max score"
                                  aria-label={`${subject.name} max score`}
                                  value={value.maxScore}
                                  onChange={(event) =>
                                    updateSubjectScore(subject.id, "maxScore", event.target.value)
                                  }
                                />
                              </div>
                              {subjectScoreErrors[subject.id] && (
                                <p className="text-xs text-danger">{subjectScoreErrors[subject.id]}</p>
                              )}
                            </div>
                          </div>
                          <DurationInput
                            label="Time Taken"
                            value={parseOptionalNumber(value.timeTaken)}
                            onChange={(minutes) =>
                              updateSubjectScore(
                                subject.id,
                                "timeTaken",
                                minutes == null ? "" : String(minutes),
                              )
                            }
                          />
                          <DurationInput
                            label="Test Duration"
                            value={parseOptionalNumber(value.testDuration)}
                            onChange={(minutes) =>
                              updateSubjectScore(
                                subject.id,
                                "testDuration",
                                minutes == null ? "" : String(minutes),
                              )
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex flex-col items-center gap-2 pt-2">
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={
            isSubmitting ||
            isPrefilling ||
            !isManualRequiredReady ||
            !!scoreError ||
            !!dateError ||
            hasInvalidSubjectScore
          }
        >
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
  const [subjects, setSubjects] = useState<SubjectWithChapters[]>([]);
  const [fields, setFields] = useState<ManualFields | null>(null);
  const [subjectScores, setSubjectScores] = useState<SubjectScoresState>({});
  const [subjectScoreErrors, setSubjectScoreErrors] = useState<Record<number, string | null>>({});
  const [extractedSubjectIds, setExtractedSubjectIds] = useState<number[]>([]);
  const [showAllSubjects, setShowAllSubjects] = useState(false);
  const [prefillTick, setPrefillTick] = useState(0);

  const [isSubmitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [scoreError, setScoreError] = useState<string | null>(null);

  const [previewFile, setPreviewFile] = useState<File | null>(null);

  const previewUrl = useMemo(
    () => (previewFile ? URL.createObjectURL(previewFile) : null),
    [previewFile],
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    getSubjectsChapters()
      .then(({ data }) => setSubjects(data.subjects))
      .catch(() => {
        // Best-effort
      });
  }, []);

  const updateField = <K extends keyof ManualFields>(key: K, value: ManualFields[K]) =>
    setFields((current) => (current ? { ...current, [key]: value } : current));

  const updateSubjectScore = (
    subjectId: number,
    field: keyof SubjectScoreValue,
    value: string,
  ) => {
    setSubjectScores((current) => {
      const nextValue = {
        ...(current[subjectId] ?? EMPTY_SUBJECT_SCORE),
        [field]: value,
      };

      const nextScore = field === "score" ? value : nextValue.score;
      const nextMaxScore = field === "maxScore" ? value : nextValue.maxScore;

      setSubjectScoreErrors((currentErrors) => ({
        ...currentErrors,
        [subjectId]: validateScores(nextScore, nextMaxScore),
      }));

      return {
        ...current,
        [subjectId]: nextValue,
      };
    });
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      setPreviewFile(null);
      return;
    }

    setPreviewFile(file);
    setExtracting(true);
    setExtractError(null);
    setSaveError(null);
    setShowAllSubjects(false);

    try {
      const { data } = await extractMockImage(file);
      const extracted = data.extractedData;

      setFields({
        mockName: extracted.mockName ?? "",
        dateDisplay: extracted.attemptedDate
          ? toDisplayDate(extracted.attemptedDate)
          : "",
        source: sourceValue(extracted.sourceInstitute),
        score: extracted.totalScore != null ? String(extracted.totalScore) : "",
        totalMarks: extracted.maxScore != null ? String(extracted.maxScore) : "",
        timeTaken: extracted.timeTakenMinutes ?? undefined,
        testDuration: extracted.testDurationMinutes ?? undefined,
      });

      const scores: SubjectScoresState = {};

      for (const subjectScore of extracted.subjectScores ?? []) {
        scores[subjectScore.subjectId] = {
          score: String(subjectScore.score),
          maxScore: String(subjectScore.maxScore),
          timeTaken:
            subjectScore.timeTakenMinutes != null
              ? String(subjectScore.timeTakenMinutes)
              : "",
          testDuration:
            subjectScore.testDurationMinutes != null
              ? String(subjectScore.testDurationMinutes)
              : "",
        };
      }

      setSubjectScores(scores);
      setSubjectScoreErrors(
        Object.fromEntries(
          Object.entries(scores).map(([subjectId, value]) => [
            Number(subjectId),
            validateScores(value.score, value.maxScore),
          ]),
        ),
      );
      setExtractedSubjectIds(
        (extracted.subjectScores ?? []).map((s) => s.subjectId),
      );
      setPrefillTick((tick) => tick + 1);
      setSummary(data.summary || null);
      setParsedSuccessfully(data.parsedSuccessfully);
    } catch {
      setExtractError(
        "Couldn't read this scorecard. Please try again or enter details manually.",
      );
    } finally {
      setExtracting(false);
    }
  };

  const hasInvalidSubjectScore = Object.values(subjectScoreErrors).some((message) => !!message);
  // The extracted date is prefilled as read — a misread can land in the future.
  const dateError = fields && isFutureDisplayDate(fields.dateDisplay) ? FUTURE_DATE_ERROR : null;

  const handleSave = async () => {
    if (!fields) return;
    const attemptedDate = toIsoDate(fields.dateDisplay);

    if (!fields.mockName.trim() || !attemptedDate || dateError) {
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
        timeTakenMinutes: fields.timeTaken,
        testDurationMinutes: fields.testDuration,
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
        className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-brand/20 bg-surface px-6 py-6 text-center ${disabled || isExtracting
          ? "cursor-not-allowed opacity-60"
          : "cursor-pointer"
          }`}
      >
        {previewUrl ? (
          <>
            <div className="relative flex h-[180px] w-full max-w-[280px] items-center justify-center overflow-hidden rounded-xl border border-brand/10 bg-tint p-2">
              <img
                src={previewUrl}
                alt={previewFile?.name || "Uploaded scorecard"}
                className="h-full w-full object-contain"
              />

              {isExtracting && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                  <span
                    className="h-8 w-8 animate-spin rounded-full border-2 border-brand/25 border-t-cta"
                    aria-label="Reading scorecard"
                  />
                </div>
              )}
            </div>

            <p className="text-sm font-semibold text-ink">
              {isExtracting
                ? "Reading your scorecard…"
                : "Image uploaded successfully"}
            </p>

            <p className="max-w-full truncate px-2 text-xs font-medium text-muted">
              {previewFile?.name}
            </p>

            <p className="text-xs font-medium text-muted">
              {isExtracting
                ? "Please wait while we extract the details"
                : "Click to replace image"}
            </p>
          </>
        ) : (
          <>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-tint text-ink">
              {isExtracting ? (
                <span
                  className="h-5 w-5 animate-spin rounded-full border-2 border-brand/25 border-t-cta"
                  aria-label="Uploading"
                />
              ) : (
                <UploadIcon />
              )}
            </span>

            <p className="text-sm font-semibold text-ink">
              {isExtracting
                ? "Reading your scorecard…"
                : "Drag & drop your screenshot here"}
            </p>

            <p className="text-xs font-medium text-muted">
              or
            </p>

            <span className="flex h-9 items-center justify-center rounded-lg border border-brand/15 bg-surface px-4 text-sm font-semibold text-body-text hover:bg-tint-strong">
              Browse Files
            </span>

            <p className="text-xs text-muted">
              Max. 20 MB • JPG, PNG, HEIC
            </p>
          </>
        )}

        <input
          id={fileInputId}
          type="file"
          accept="image/jpeg,image/png,image/heic"
          className="sr-only"
          disabled={disabled || isExtracting}
          onChange={handleFileChange}
        />
      </label>

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

      <AnimatePresence>
        {fields && (
          <motion.div
            {...fadeIn}
            transition={{ ...fadeTransition, duration: 0.3 }}
            className="flex flex-col gap-5 border-t border-brand/10 pt-5"
          >
            <p className="text-sm font-bold text-ink">2. Review Extracted Details</p>

            {summary && (
              <p className="text-xs text-muted">
                {parsedSuccessfully
                  ? summary
                  : `${summary} We couldn't read everything — please check the fields below.`}
              </p>
            )}

            <MockDetailsFields
              fields={fields}
              onChange={updateField}
              onScoreError={setScoreError}
              scoreError={scoreError}
              dateError={dateError}
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
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {subjectRows.map(({ id, name }) => {
                      const value = subjectScores[id] ?? EMPTY_SUBJECT_SCORE;
                      return (
                        <div
                          key={id}
                          className="flex flex-col gap-2 rounded-xl border border-brand/15 bg-surface p-4 shadow-sm dark:border-white/10 dark:shadow-black/20"
                        >
                          <label className="text-[14px] font-semibold leading-5 text-ink">
                            {name}
                          </label>
                          <div className="flex flex-col gap-1">
                            <label className="text-[13px] font-medium leading-none text-body-text dark:text-ink sm:text-[14px]">
                              Total Marks
                            </label>
                            <div className="flex flex-col gap-1">
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  min={0}
                                  className={FIELD_CLASSES}
                                  placeholder="Marks Scored"
                                  aria-label={`${name} marks scored`}
                                  value={value.score}
                                  onChange={(event) => updateSubjectScore(id, "score", event.target.value)}
                                />
                                <input
                                  type="number"
                                  min={0}
                                  className={FIELD_CLASSES}
                                  placeholder="Maximum Marks"
                                  aria-label={`${name} maximum marks`}
                                  value={value.maxScore}
                                  onChange={(event) =>
                                    updateSubjectScore(id, "maxScore", event.target.value)
                                  }
                                />
                              </div>
                              {subjectScoreErrors[id] && (
                                <p className="text-xs text-danger">{subjectScoreErrors[id]}</p>
                              )}
                            </div>
                          </div>
                          <DurationInput
                            label="Time Taken"
                            value={parseOptionalNumber(value.timeTaken)}
                            onChange={(minutes) =>
                              updateSubjectScore(id, "timeTaken", minutes == null ? "" : String(minutes))
                            }
                          />
                          <DurationInput
                            label="Test Duration"
                            value={parseOptionalNumber(value.testDuration)}
                            onChange={(minutes) =>
                              updateSubjectScore(
                                id,
                                "testDuration",
                                minutes == null ? "" : String(minutes),
                              )
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {saveError && <p className="text-sm text-danger">{saveError}</p>}

            <Button
              variant="primary"
              onClick={handleSave}
              disabled={
                isSubmitting ||
                disabled ||
                !fields?.mockName.trim() ||
                !toIsoDate(fields.dateDisplay) ||
                !!dateError ||
                !!scoreError ||
                hasInvalidSubjectScore
              }
            >
              {isSubmitting ? "Saving..." : "Save & Analyze"}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
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
  const [scoreError, setScoreError] = useState<string | null>(null);
  const isQuickLogRequiredReady = !!fields.mockName.trim() && !!toIsoDate(fields.dateDisplay);

  const updateField = <K extends keyof QuickLogFieldsState>(
    key: K,
    value: QuickLogFieldsState[K],
  ) => setFields((current) => ({ ...current, [key]: value }));

  const handleSave = async () => {
    const attemptedDate = toIsoDate(fields.dateDisplay);

    if (!fields.mockName.trim() || !attemptedDate) {
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
          <DateField
            label="Date"
            name="quickDate"
            required
            disableFuture
            defaultValue={fields.dateDisplay}
            onDateChange={(value) => updateField("dateDisplay", value)}
          />
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-body-lg font-medium leading-none text-body-text dark:text-ink">
              Total Marks
            </label>

            <div className="mt-1 flex flex-col gap-1">
              <div className="flex gap-2">
                <input
                  type="number"
                  min={0}
                  className="min-w-0 flex-1 rounded-xl border border-input-border bg-surface px-4 py-3 font-['Plus_Jakarta_Sans'] text-[14px] font-medium leading-[14px] tracking-normal text-ink outline-none transition-colors placeholder:text-[14px] placeholder:font-normal placeholder:leading-5 placeholder:text-[#666666] focus:border-input-border dark:placeholder:text-[#8B8998] sm:text-[16px] sm:leading-[16px]"
                  placeholder="Marks Scored"
                  aria-label="Marks Scored"
                  value={fields.score}
                  onChange={(event) => {
                    const value = event.target.value;
                    updateField("score", value);
                    setScoreError(validateScores(value, fields.totalMarks));
                  }}
                />

                <input
                  type="number"
                  min={0}
                  className="min-w-0 flex-1 rounded-xl border border-input-border bg-surface px-4 py-3 font-['Plus_Jakarta_Sans'] text-[14px] font-medium leading-[14px] tracking-normal text-ink outline-none transition-colors placeholder:text-[14px] placeholder:font-normal placeholder:leading-5 placeholder:text-[#666666] focus:border-input-border dark:placeholder:text-[#8B8998] sm:text-[16px] sm:leading-[16px]"
                  placeholder="Maximum Marks"
                  aria-label="Maximum Marks"
                  value={fields.totalMarks}
                  onChange={(event) => {
                    const value = event.target.value;
                    updateField("totalMarks", value);
                    setScoreError(validateScores(fields.score, value));
                  }}
                />
              </div>
              {scoreError && <p className="text-xs text-danger">{scoreError}</p>}
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        {/* Buttons */}
        <div className="">
          <Button
            variant="primary"
            className={isDark ? "border border-[#FAF7F2]" : undefined}
            onClick={handleSave}
            disabled={isSubmitting || disabled || !isQuickLogRequiredReady || !!scoreError}
          >
            {isSubmitting ? "Saving..." : "Save & Analyze"}
          </Button>
        </div>
      </div>
    </div>
  );
}