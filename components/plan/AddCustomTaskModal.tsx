"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { WhiteModal } from "@/components/ui/WhiteModal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { EditIcon, MinusIcon, PencilIcon, PlusIcon, XIcon } from "@/components/ui/icons";
import {
  addPlannerTask,
  editPlannerTask,
  type QuestionDifficulty,
  type QuestionSource,
  type SuggestedWindow,
} from "@/lib/api/planner";
import { addBacklogTaskToPlan } from "@/lib/api/backlog";
import { addAnchorTask } from "@/lib/api/calendar";
import { getCheckInStatus } from "@/lib/api/checkin";
import {
  getSubjectsChapters,
  type SubjectWithChapters,
} from "@/lib/api/profile";
import { QUICK_FOCUS_TASK_NAME } from "@/components/home/taskTypes";
import { AddTask } from "@/assets/icons";

type TaskModalMode = "add" | "edit" | "planFromBacklog" | "anchor" | "quickFocus";

const HEADER_TEXT: Record<TaskModalMode, { title: string; subtitle: string }> = {
  add: { title: "Add Task", subtitle: "Structure your study plan with precision" },
  edit: { title: "Edit Task", subtitle: "Update the details for this task" },
  planFromBacklog: { title: "Add Backlog to plan", subtitle: "Schedule this backlog item into your plan" },
  anchor: {
    title: "Add Anchor Task",
    subtitle: "AI will build the rest of that day around this",
  },
  quickFocus: {
    title: "Start Quick Focus",
    subtitle: "Pick a topic and start focusing right now",
  },
};

const SUBMIT_LABEL: Record<TaskModalMode, { idle: string; busy: string }> = {
  add: { idle: "Add Task", busy: "Adding..." },
  edit: { idle: "Save Changes", busy: "Saving..." },
  planFromBacklog: { idle: "Add to Plan", busy: "Adding..." },
  anchor: { idle: "Add Anchor Task", busy: "Adding..." },
  quickFocus: { idle: "Start Focus", busy: "Starting..." },
};

/** PRD 9.6 — an anchor has to be worth planning around; the API rejects
 *  anything under 10 minutes. */
const MIN_ANCHOR_MINUTES = 10;

const TASK_TYPES = ["New Learning", "Revision", "Practice", "DPP", "Other"];

const TASK_TYPE_API_VALUES: Record<string, string> = {
  "New Learning": "NEW_LEARNING",
  Revision: "REVISION",
  Practice: "PRACTICE",
  DPP: "PRACTICE",
  Other: "WELLNESS",
};

const SUGGESTED_WINDOW_VALUES: Record<string, SuggestedWindow> = {
  morning: "MORNING",
  midday: "MIDDAY",
  evening: "EVENING",
  night: "NIGHT",
};

const DURATION_STEP_MINUTES = 5;
const MIN_DURATION_MINUTES = 5;
const MAX_DURATION_MINUTES = 1400;

// Practice-only question filters. All three are optional — whatever the
// student leaves untouched is simply not sent, and the API applies no filter
// on that dimension.
const DIFFICULTY_OPTIONS: { value: QuestionDifficulty; label: string }[] = [
  { value: "EASY", label: "Easy" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HARD", label: "Hard" },
  { value: "VERY_HARD", label: "Very Hard" },
];

const SOURCE_OPTIONS: { value: QuestionSource; label: string }[] = [
  { value: "CURATED_PREPEX", label: "Prepex Curated" },
  { value: "JEE_MAIN_PYQ", label: "JEE Main PYQ" },
  { value: "JEE_ADVANCED_PYQ", label: "JEE Advanced PYQ" },
  { value: "OWN_GENERATED", label: "Own Generated" },
];

// Mirrors the API's own ceiling (addManualTaskSchema.questionCount).
const MAX_PRACTICE_QUESTION_COUNT = 50;

const TIME_PREFERENCE_OPTIONS = [
  { value: "morning", label: "Morning (5-11 AM)" },
  { value: "midday", label: "Midday (11 AM-4 PM)" },
  { value: "evening", label: "Evening (4-9 PM)" },
  { value: "night", label: "Night (9 PM-4 AM)" },
];

/** Quick Focus asks for nothing but Subject/Topic (+ optional notes) — every
 *  other field is fixed to these, so the session can start on one tap. */
const QUICK_FOCUS_TASK_TYPE = "New Learning";
const QUICK_FOCUS_DURATION_MINUTES = 60;

/** The TIME_PREFERENCE_OPTIONS bucket the clock is in right now, so a Quick
 *  Focus task is scheduled into the window the student is actually studying
 *  in rather than one they'd have to pick. */
function currentTimePreference(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 16) return "midday";
  if (hour >= 16 && hour < 21) return "evening";
  return "night";
}

export type TaskFormInitialValues = {
  taskName?: string;
  subjectValue?: string;
  topicValue?: string;
  taskType?: string;
  durationValue?: string;
  timePreferenceValue?: string;
  notes?: string;
  /** planFromBacklog only — the fixed chapter/subject/task-type sent to the API as-is. */
  chapterId?: string;
  subjectId?: number;
  taskTypeApiValue?: string;
};

type AddCustomTaskModalProps = {
  open: boolean;
  onClose: () => void;
  mode?: TaskModalMode;
  /** Task being edited — required in edit mode, used as the PATCH target. */
  taskId?: string;
  /** Backlog task being scheduled — required in planFromBacklog mode, used as the POST target. */
  backlogTaskId?: string;
  initialValues?: TaskFormInitialValues;
  /** Receives the new task's id — quickFocus mode uses it to open the session. */
  onTaskAdded?: (taskId?: string) => void;
  onTaskUpdated?: () => void;
  /** Called after a successful planFromBacklog submit so the parent backlog list can refetch. */
  onPlanned?: () => void;
  /** Locks Task Type to this value and hides the picker — used by the revision page. */
  lockedTaskType?: string;
  /** Overrides the modal header title (add mode) — e.g. "Add Custom Practice Task". */
  title?: string;
  /** anchor mode only — the future date (YYYY-MM-DD) the anchor is pinned to. */
  anchorDate?: string;
  /** anchor mode only — receives the server's over-target warning, if any. */
  onAnchorAdded?: (warning: string | null) => void;
};

/** Read-only stand-in for a Select, styled to match — used when scheduling a
 * backlog item, where Subject/Topic are fixed by the backlog entry itself. */
function StaticField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-1">
      <label className="cursor-not-allowed text-body-lg font-medium leading-5 text-body-text dark:text-ink">
        {label}
      </label>

      <div
        aria-readonly="true"
        title={value || "—"}
        className="flex h-11.75 w-full min-w-0 cursor-not-allowed select-none items-center rounded-xl border border-input-border bg-surface px-4"
      >
        <span className="min-w-0 truncate text-sm font-medium leading-5 text-body-text">
          {value || "—"}
        </span>
      </div>
    </div>
  );
}

/** Multi-select pill row, styled to match the Task Type picker. Selecting
 * nothing is a valid state — it means "don't filter on this". */
function FilterPills<T extends string>({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: { value: T; label: string }[];
  selected: T[];
  onToggle: (value: T) => void;
}) {
  return (
    <div className="w-full">
      <p className="text-body-lg font-medium leading-5 text-body-text dark:text-ink">
        {label} <span className="font-normal text-muted">(optional)</span>
      </p>

      <div className="mt-1.5 flex w-full flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selected.includes(option.value);

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onToggle(option.value)}
              aria-pressed={isSelected}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold leading-5 transition-colors sm:px-4 sm:py-2 sm:text-sm ${isSelected
                ? "border-task-type-bg bg-task-type-bg text-task-type-selected-text shadow-task-type"
                : "border-task-type-border bg-transparent text-task-type-text hover:bg-tint-strong"
                }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AddCustomTaskModal({
  open,
  onClose,
  mode = "add",
  taskId,
  backlogTaskId,
  initialValues,
  onTaskAdded,
  onTaskUpdated,
  onPlanned,
  lockedTaskType,
  title,
  anchorDate,
  onAnchorAdded,
}: AddCustomTaskModalProps) {
  const headerTitle = title ?? HEADER_TEXT[mode].title;
  const isQuickFocus = mode === "quickFocus";
  // Quick Focus hides Task Name / Task Type / Duration / Time Preference, so
  // those four are seeded here instead of being asked for.
  const defaults = {
    taskType: isQuickFocus
      ? QUICK_FOCUS_TASK_TYPE
      : lockedTaskType ?? initialValues?.taskType ?? "New Learning",
    taskName: isQuickFocus ? QUICK_FOCUS_TASK_NAME : initialValues?.taskName ?? "",
    durationValue: isQuickFocus
      ? String(QUICK_FOCUS_DURATION_MINUTES)
      : initialValues?.durationValue ?? "30",
    timePreferenceValue: isQuickFocus
      ? currentTimePreference()
      : initialValues?.timePreferenceValue ?? "",
  };
  const [taskType, setTaskType] = useState(defaults.taskType);
  const [taskName, setTaskName] = useState(defaults.taskName);
  const [durationValue, setDurationValue] = useState(defaults.durationValue);
  const [timePreferenceValue, setTimePreferenceValue] = useState(defaults.timePreferenceValue);
  const [notes, setNotes] = useState(initialValues?.notes ?? "");
  const [difficulties, setDifficulties] = useState<QuestionDifficulty[]>([]);
  const [sources, setSources] = useState<QuestionSource[]>([]);
  const [questionCount, setQuestionCount] = useState("");
  const [subjects, setSubjects] = useState<SubjectWithChapters[]>([]);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [chapterId, setChapterId] = useState("");
  const [isLoadingChapters, setLoadingChapters] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dailyTargetMinutes, setDailyTargetMinutes] = useState<number | null>(null);
  const [isDurationConfirmOpen, setDurationConfirmOpen] = useState(false);
  const isEdit = mode === "edit";
  // Task Type is read-only both when editing an existing plan task and when
  // scheduling a backlog item — changing it would change what the task is.
  const isLocked = mode === "edit" || mode === "planFromBacklog";
  // Subject/Topic are only fixed for a backlog item, whose chapter is the
  // backlog entry itself. Editing a plan task can move it to another chapter.
  const isContentLocked = mode === "planFromBacklog";
  // Edit mode keeps Subject/Topic optional, so a task that never had a chapter
  // still saves — but once the student touches either picker, a half-made
  // choice (subject, no topic) isn't a state worth sending.
  const [isContentTouched, setContentTouched] = useState(false);

  // This modal is a single persistent instance shared across every row
  // (e.g. the backlog page opens it for whichever task was clicked), so the
  // useState initializers above only ever run once. Without this, reopening
  // for a different task would keep showing the previous task's form values.
  useEffect(() => {
    if (!open) return;
    setTaskType(defaults.taskType);
    setTaskName(defaults.taskName);
    setDurationValue(defaults.durationValue);
    // Re-derived on every open so the window matches the time of *this* session.
    setTimePreferenceValue(defaults.timePreferenceValue);
    setNotes(initialValues?.notes ?? "");
    setDifficulties([]);
    setSources([]);
    setQuestionCount("");
    // Clear the pickers too, or a fresh "Add Task" opens pre-filled with the
    // previously created task's subject/topic. The loader effect below
    // re-derives these from initialValues when a caller provides them.
    setSubjectId(null);
    setChapterId("");
    setContentTouched(false);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Daily target study hours, used to warn when this task's duration alone
  // would exceed the student's whole-day target.
  useEffect(() => {
    if (!open) return;
    getCheckInStatus()
      .then(({ data }) => setDailyTargetMinutes(data.dailyHours != null ? data.dailyHours * 60 : null))
      .catch(() => {
        // Best-effort — the duration warning just won't show if this fails.
      });
  }, [open]);

  // The API returns every subject with its own chapters nested — fetched once
  // per open, then subject selection filters the already-loaded chapters
  // locally instead of refetching. planFromBacklog shows Subject/Topic as
  // static text (see below), so it has no need for this list.
  useEffect(() => {
    if (!open || isContentLocked) return;

    async function loadSubjectsChapters() {
      setLoadingChapters(true);
      try {
        const { data } = await getSubjectsChapters();
        setSubjects(data.subjects);

        // A task carries its subject/chapter as names, not ids, so both
        // pickers open on the task's current values by matching on name.
        const matchedSubject = initialValues?.subjectValue
          ? data.subjects.find((s) => s.name.toLowerCase() === initialValues.subjectValue?.toLowerCase())
          : undefined;
        setSubjectId((current) => current ?? matchedSubject?.id ?? null);

        const matchedChapter = initialValues?.topicValue
          ? matchedSubject?.chapters.find(
              (c) => c.name.toLowerCase() === initialValues.topicValue?.toLowerCase(),
            )
          : undefined;
        if (matchedChapter) setChapterId((current) => current || matchedChapter.id);
      } catch {
        // Best-effort — the form still works without live subject/chapter data.
      } finally {
        setLoadingChapters(false);
      }
    }

    loadSubjectsChapters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isContentLocked]);

  // Question filters only apply to a task whose questions are drawn fresh from
  // the bank — i.e. a new PRACTICE/DPP task. Editing a task or scheduling a
  // backlog item never re-picks questions, so they'd be inert there.
  const showPracticeFilters = mode === "add" && TASK_TYPE_API_VALUES[taskType] === "PRACTICE";

  function toggleIn<T>(setter: (update: (current: T[]) => T[]) => void, value: T) {
    setter((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  }

  // Empty is the meaningful default here — it means "no cap", so the task gets
  // as many matching questions as the chapter actually has. 0 and anything
  // past the API's own ceiling are never valid counts, so they can't be typed.
  const handleQuestionCountChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    const parsed = Number(digits);
    setQuestionCount(
      digits === "" || parsed < 1 ? "" : String(Math.min(MAX_PRACTICE_QUESTION_COUNT, parsed)),
    );
  };

  const chapters = subjects.find((subject) => subject.id === subjectId)?.chapters ?? [];

  useEffect(() => {
    setChapterId((current) => (chapters.some((chapter) => chapter.id === current) ? current : ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId, subjects]);

  const adjustDuration = (delta: number) => {
    setDurationValue((current) => {
      const next = (Number(current) || 0) + delta;
      return String(Math.min(MAX_DURATION_MINUTES, Math.max(MIN_DURATION_MINUTES, next)));
    });
  };

  // Every field is required except Additional Notes. Subject/Topic aren't
  // user-editable in planFromBacklog mode (they're shown as static text), and
  // in edit mode they're only enforced once the student touches a picker —
  // otherwise a task created without a chapter could never be saved again.
  const isContentValid = isContentLocked
    ? true
    : isEdit && !isContentTouched
      ? true
      : subjectId != null && chapterId.length > 0;

  const isFormValid =
    taskName.trim().length > 0 &&
    timePreferenceValue.length > 0 &&
    Number(durationValue) >= MIN_DURATION_MINUTES &&
    isContentValid;

  const handleSubmit = () => {
    if (!isFormValid) return;
    const exceedsDailyTarget = dailyTargetMinutes != null && Number(durationValue) > dailyTargetMinutes;
    if (exceedsDailyTarget) {
      setDurationConfirmOpen(true);
      return;
    }
    performSubmit();
  };

  const handleProceedAnyway = () => {
    setDurationConfirmOpen(false);
    performSubmit();
  };

  const performSubmit = async () => {
    if (!isFormValid) return;
    if (isEdit) {
      if (!taskId || !taskName.trim()) return;

      setSubmitting(true);
      setError(null);
      try {
        await editPlannerTask(taskId, {
          title: taskName.trim(),
          estimatedMinutes: Number(durationValue),
          description: notes.trim() || undefined,
          suggestedWindow: SUGGESTED_WINDOW_VALUES[timePreferenceValue],
          // Sent as a pair only once a topic is actually picked: the API
          // validates the chapter against the subject, and a task that never
          // had a chapter stays that way rather than being half-assigned one.
          ...(subjectId != null && chapterId.length > 0 && { subjectId, chapterId }),
        });
        onTaskUpdated?.();
        onClose();
      } catch {
        setError("Couldn't save changes. Please try again.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (mode === "planFromBacklog") {
      if (!backlogTaskId || !taskName.trim() || !initialValues?.chapterId || initialValues.subjectId == null) {
        return;
      }

      setSubmitting(true);
      setError(null);
      try {
        await addBacklogTaskToPlan(backlogTaskId, {
          title: taskName.trim(),
          taskType: initialValues.taskTypeApiValue ?? "PRACTICE",
          estimatedMinutes: Number(durationValue),
          chapterId: initialValues.chapterId,
          subjectId: initialValues.subjectId,
          description: notes.trim() || undefined,
          suggestedWindow: SUGGESTED_WINDOW_VALUES[timePreferenceValue],
        });
        onPlanned?.();
        onClose();
      } catch {
        setError("Couldn't add this task to your plan. Please try again.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (mode === "anchor") {
      if (!anchorDate || !taskName.trim()) return;

      if (Number(durationValue) < MIN_ANCHOR_MINUTES) {
        setError(`Anchor tasks need at least ${MIN_ANCHOR_MINUTES} minutes.`);
        return;
      }

      setSubmitting(true);
      setError(null);
      try {
        const topicName = chapters.find((chapter) => chapter.id === chapterId)?.name;
        const { data } = await addAnchorTask({
          date: anchorDate,
          title: topicName ? `${taskName.trim()} . ${topicName}` : taskName.trim(),
          taskType: (TASK_TYPE_API_VALUES[taskType] ?? "CUSTOM") as "CUSTOM",
          durationMinutes: Number(durationValue),
          subjectId: subjectId ?? undefined,
          chapterId: chapterId || undefined,
          preferredWindow: SUGGESTED_WINDOW_VALUES[timePreferenceValue],
          notes: notes.trim() || undefined,
        });
        // The over-target case is surfaced, not blocked — the student decides
        // what to do about it (PRD 9.5.3).
        onAnchorAdded?.(data.warning);
        setTaskName("");
        setNotes("");
        onClose();
      } catch (err) {
        setError(
          err instanceof Error && err.message
            ? err.message
            : "Couldn't add the anchor task. Please try again.",
        );
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!taskName.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      const topicName = chapters.find((chapter) => chapter.id === chapterId)?.name;
      const title = topicName ? `${taskName.trim()} . ${topicName}` : taskName.trim();
      const { data } = await addPlannerTask({
        title,
        taskType: TASK_TYPE_API_VALUES[taskType] ?? "PRACTICE",
        estimatedMinutes: Number(durationValue),
        description: notes.trim() || undefined,
        suggestedWindow: SUGGESTED_WINDOW_VALUES[timePreferenceValue],
        subjectId: subjectId ?? undefined,
        chapterId: chapterId || undefined,
        ...(showPracticeFilters && {
          ...(difficulties.length > 0 && { difficulty: difficulties }),
          ...(sources.length > 0 && { source: sources }),
          ...(questionCount && { questionCount: Number(questionCount) }),
        }),
      });
      onTaskAdded?.(data.id);
      setTaskName("");
      setNotes("");
      onClose();
    } catch (err) {
      // Surface server-side validation messages verbatim (e.g. the max-5
      // custom practice tasks per day limit); fall back to a generic message.
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Couldn't add the task. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <WhiteModal
      open={open}
      onClose={onClose}
      ariaLabel={headerTitle}
      size="lg"
    >
      {/* HEADER */}
      <div className="-mx-5 -mt-5 flex w-[calc(100%+2.5rem)] shrink-0 items-start justify-between gap-3 border-b border-brand/10 px-3 py-4 sm:-mx-8 sm:-mt-8 sm:w-[calc(100%+4rem)] sm:px-5 sm:py-5 lg:px-6 lg:py-6">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl  bg-[#EEF0F8] text-ink dark:bg-[#FAF7F214] sm:size-11">
            <AddTask />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="min-w-0 break-words text-[14px] font-bold leading-5 text-ink sm:truncate sm:text-base sm:leading-6 md:text-lg lg:text-[22px] lg:leading-7">
              {headerTitle}
            </h2>

            <p className="min-w-0 truncate text-[10px] font-normal leading-[15px] text-primary sm:mt-1 sm:text-[11px] sm:leading-4 md:text-xs md:leading-[18px] lg:text-sm">
              {HEADER_TEXT[mode].subtitle}
            </p>
          </div>
        </div>

        <button type="button" onClick={onClose} aria-label="Close" className="flex size-10 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-tint-strong">
          <XIcon className="size-3.5 sm:size-4" />
        </button>
      </div>

      {/* BODY */}
      <div className="-mx-5 w-[calc(100%+2.5rem)] px-3 py-5 sm:-mx-8 sm:w-[calc(100%+4rem)] sm:px-5 sm:py-6 lg:px-6 lg:py-6">
        <div className="flex w-full flex-col gap-4">
          {!isQuickFocus && (
            <Input
              label="Task Name"
              name="taskName"
              placeholder="e.g. Watch PW lecture on Friction"
              value={taskName}
              onChange={(event) => setTaskName(event.target.value)}
              required
            />
          )}

          {/* Subject + Topic */}
          <div className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            {isContentLocked ? (
              <StaticField
                label="Subject"
                value={initialValues?.subjectValue ?? ""}
              />
            ) : (
              <CustomSelect
                label="Subject"
                options={subjects.map((subject) => ({
                  value: String(subject.id),
                  label: subject.name,
                }))}
                value={subjectId != null ? String(subjectId) : ""}
                onChange={(value) => {
                  setSubjectId(Number(value));
                  setContentTouched(true);
                }}
                placeholder={isLoadingChapters ? "Loading subjects..." : "Subject"}
              />
            )}

            {isContentLocked ? (
              <StaticField
                label="Topic"
                value={initialValues?.topicValue ?? ""}
              />
            ) : (
              <CustomSelect
                label="Topic"
                options={chapters.map((chapter) => ({
                  value: chapter.id,
                  label: chapter.name,
                }))}
                value={chapterId}
                onChange={(value) => {
                  setChapterId(value);
                  setContentTouched(true);
                }}
                placeholder={isLoadingChapters ? "Loading chapters..." : "Topic"}
              />
            )}
          </div>

          {/* Task Type */}
          {isQuickFocus ? null : isLocked ? (
            <div className="w-full">
              <p className="text-body-lg font-medium leading-5 text-body-text dark:text-ink">
                Task Type
              </p>

              <div className="mt-1.5">
                <span className="inline-flex max-w-full items-center rounded-full border border-task-type-bg bg-task-type-bg px-3 py-1.5 text-xs font-semibold leading-5 text-task-type-selected-text shadow-task-type sm:px-4 sm:py-2 sm:text-sm">
                  {taskType}
                </span>
              </div>
            </div>
          ) : (
            !lockedTaskType && (
              <div className="w-full">
                <p className="text-body-lg font-medium leading-5 text-body-text dark:text-ink">
                  Task Type
                </p>

                <div className="mt-1.5 flex w-full flex-wrap gap-2">
                  {TASK_TYPES.map((type) => {
                    const isSelected = taskType === type;

                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setTaskType(type)}
                        aria-pressed={isSelected}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold leading-5 transition-colors sm:px-4 sm:py-2 sm:text-sm ${isSelected
                          ? "border-task-type-bg bg-task-type-bg text-task-type-selected-text shadow-task-type"
                          : "border-task-type-border bg-transparent text-task-type-text hover:bg-tint-strong"
                          }`}
                      >
                        {type}
                      </button>
                    );
                  })}
                </div>
              </div>
            )
          )}

          {/* Practice question filters */}
          {showPracticeFilters && (
            <div className="flex w-full flex-col gap-4 rounded-xl border border-input-border bg-surface p-3 sm:p-4">
              <p className="text-body-lg font-semibold leading-5 text-ink">
                Question Filters
              </p>

              <FilterPills
                label="Difficulty"
                options={DIFFICULTY_OPTIONS}
                selected={difficulties}
                onToggle={(value) => toggleIn(setDifficulties, value)}
              />

              <FilterPills
                label="Source"
                options={SOURCE_OPTIONS}
                selected={sources}
                onToggle={(value) => toggleIn(setSources, value)}
              />

              <div className="flex w-full flex-col gap-1">
                <label
                  htmlFor="practice-question-count"
                  className="text-body-lg font-medium leading-5 text-body-text dark:text-ink"
                >
                  Number of Questions <span className="font-normal text-muted">(optional)</span>
                </label>

                <input
                  id="practice-question-count"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={MAX_PRACTICE_QUESTION_COUNT}
                  placeholder="0"
                  value={questionCount}
                  onChange={(event) => handleQuestionCountChange(event.target.value)}
                  className="mt-1 h-11.75 w-full rounded-xl border border-input-border bg-surface px-4 font-['Plus_Jakarta_Sans'] text-[14px] font-medium leading-[14px] text-ink outline-none [appearance:textfield] placeholder:text-[14px] placeholder:font-normal placeholder:leading-5 placeholder:text-[#666666] dark:placeholder:text-[#8B8998] focus:border-input-border sm:text-[16px] sm:leading-[16px] sm:placeholder:text-[16px] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>
            </div>
          )}

          {!isQuickFocus && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Duration */}
              <div className="flex flex-col gap-1">
                <label className="text-body-lg font-medium leading-5 text-body-text dark:text-ink">
                  Duration
                </label>

                <div className="flex h-11.75 items-center justify-center gap-8 rounded-xl border border-input-border bg-surface px-2">
                  <button
                    type="button"
                    onClick={() => adjustDuration(-DURATION_STEP_MINUTES)}
                    disabled={Number(durationValue) <= MIN_DURATION_MINUTES}
                    aria-label="Decrease duration"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-ink transition-colors hover:bg-tint-strong disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <MinusIcon />
                  </button>

                  <span className="text-sm font-semibold text-body-text">
                    {durationValue} min
                  </span>

                  <button
                    type="button"
                    onClick={() => adjustDuration(DURATION_STEP_MINUTES)}
                    disabled={Number(durationValue) >= MAX_DURATION_MINUTES}
                    aria-label="Increase duration"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-ink transition-colors hover:bg-tint-strong disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <PlusIcon />
                  </button>
                </div>
              </div>

              {/* Time Preference */}
              <CustomSelect
                label="Time Preference"
                options={TIME_PREFERENCE_OPTIONS}
                value={timePreferenceValue}
                onChange={setTimePreferenceValue}
                placeholder="Time"
              />
            </div>
          )}

          {/* Additional Notes */}
          <div className="flex w-full flex-col gap-1">
            <label
              htmlFor="task-notes"
              className="text-body-lg font-medium text-body-text dark:text-ink"
            >
              Additional Notes <span className="font-normal text-muted">(optional)</span>
            </label>

            <textarea
              id="task-notes"
              rows={3}
              placeholder="Specific focus areas, resources to use..."
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="mt-1 w-full resize-none rounded-xl border border-input-border bg-surface px-4 py-3 text-[14px] font-medium leading-[14px] text-ink outline-none placeholder:font-['Plus_Jakarta_Sans'] placeholder:text-[14px] placeholder:font-normal placeholder:leading-[14px] placeholder:text-[#666666] dark:placeholder:text-[#8B8998] focus:border-input-border sm:text-[16px] sm:leading-[16px] sm:placeholder:text-[16px] sm:placeholder:leading-[16px]"
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}
          {!error && !isFormValid && (
            <p className="text-sm text-muted">
              {isQuickFocus
                ? "Pick a subject and topic to start your focus session."
                : "Fill in every field to continue — only Additional Notes is optional."}
            </p>
          )}
        </div>
      </div>

      {/* FOOTER */}
      <div className="-mx-5 -mb-5 flex min-h-[103px] w-[calc(100%+2.5rem)] shrink-0 flex-col-reverse gap-3 border-t border-brand/10 px-3 py-5 sm:-mx-8 sm:-mb-8 sm:w-[calc(100%+4rem)] sm:flex-row sm:items-center sm:justify-end sm:gap-4 sm:px-5 sm:py-6 lg:px-6">
        <Button
          variant="secondary"
          size="sm"
          onClick={onClose}
          className="h-[54px] w-full rounded-lg px-6 py-[12.8px] text-base sm:w-[141px]"
        >
          Cancel
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={handleSubmit}
          disabled={isSubmitting || !isFormValid}
          className="flex h-[54px] w-full items-center justify-center gap-2.5 rounded-xl px-6 py-2 sm:w-[231px]"
        >
          {isSubmitting ? SUBMIT_LABEL[mode].busy : SUBMIT_LABEL[mode].idle}
        </Button>
      </div>
      <ConfirmModal
        open={isDurationConfirmOpen}
        onClose={() => setDurationConfirmOpen(false)}
        onConfirm={handleProceedAnyway}
        title="Exceeds daily target"
        description="Task duration is exceeding your daily target study hours."
        confirmLabel="Proceed"
        cancelLabel="Reduce Duration"
      />
    </WhiteModal>
  );
}
