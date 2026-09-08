"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { WhiteModal } from "@/components/ui/WhiteModal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { EditIcon, MinusIcon, PencilIcon, PlusIcon, XIcon } from "@/components/ui/icons";
import { addPlannerTask, editPlannerTask, type SuggestedWindow } from "@/lib/api/planner";
import { addAnchorTask } from "@/lib/api/calendar";
import { addBacklogTaskToPlan } from "@/lib/api/backlog";
import { getCheckInStatus } from "@/lib/api/checkin";
import {
  getSubjectsChapters,
  type SubjectWithChapters,
} from "@/lib/api/profile";
import { AddTask } from "@/assets/icons";

type TaskModalMode = "add" | "edit" | "planFromBacklog" | "anchor";

const HEADER_TEXT: Record<TaskModalMode, { title: string; subtitle: string }> = {
  add: { title: "Add Task", subtitle: "Structure your study plan with precision" },
  edit: { title: "Edit Task", subtitle: "Update the details for this task" },
  planFromBacklog: { title: "Add Backlog to plan", subtitle: "Schedule this backlog item into your plan" },
  anchor: {
    title: "Add Anchor Task",
    subtitle: "AI will build the rest of that day around this",
  },
};

const SUBMIT_LABEL: Record<TaskModalMode, { idle: string; busy: string }> = {
  add: { idle: "Add Task", busy: "Adding..." },
  edit: { idle: "Save Changes", busy: "Saving..." },
  planFromBacklog: { idle: "Add to Plan", busy: "Adding..." },
  anchor: { idle: "Add Anchor Task", busy: "Adding..." },
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

const TIME_PREFERENCE_OPTIONS = [
  { value: "morning", label: "Morning (5-11 AM)" },
  { value: "midday", label: "Midday (11 AM-4 PM)" },
  { value: "evening", label: "Evening (4-9 PM)" },
  { value: "night", label: "Night (9 PM-4 AM)" },
];

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
  onTaskAdded?: () => void;
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

/** Read-only stand-in for a Select, styled to match — used in edit mode where
 * Subject/Topic reflect the task's existing values instead of being pickable. */
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
  const [taskType, setTaskType] = useState(lockedTaskType ?? initialValues?.taskType ?? "Practice");
  const [taskName, setTaskName] = useState(initialValues?.taskName ?? "");
  const [durationValue, setDurationValue] = useState(initialValues?.durationValue ?? "30");
  const [timePreferenceValue, setTimePreferenceValue] = useState(
    initialValues?.timePreferenceValue ?? "",
  );
  const [notes, setNotes] = useState(initialValues?.notes ?? "");
  const [subjects, setSubjects] = useState<SubjectWithChapters[]>([]);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [chapterId, setChapterId] = useState("");
  const [isLoadingChapters, setLoadingChapters] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dailyTargetMinutes, setDailyTargetMinutes] = useState<number | null>(null);
  const [isDurationConfirmOpen, setDurationConfirmOpen] = useState(false);
  const isEdit = mode === "edit";
  // Subject/Topic/Task Type are locked read-only both when editing an
  // existing plan task and when scheduling a backlog item — neither lets
  // the user change what chapter the task is actually about.
  const isLocked = mode === "edit" || mode === "planFromBacklog";

  // This modal is a single persistent instance shared across every row
  // (e.g. the backlog page opens it for whichever task was clicked), so the
  // useState initializers above only ever run once. Without this, reopening
  // for a different task would keep showing the previous task's form values.
  useEffect(() => {
    if (!open) return;
    setTaskType(lockedTaskType ?? initialValues?.taskType ?? "Practice");
    setTaskName(initialValues?.taskName ?? "");
    setDurationValue(initialValues?.durationValue ?? "30");
    setTimePreferenceValue(initialValues?.timePreferenceValue ?? "");
    setNotes(initialValues?.notes ?? "");
    // Clear the pickers too, or a fresh "Add Task" opens pre-filled with the
    // previously created task's subject/topic. The loader effect below
    // re-derives these from initialValues when a caller provides them.
    setSubjectId(null);
    setChapterId("");
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
  // locally instead of refetching. Edit mode shows Subject/Topic as static
  // text (see below), so it has no need for this list.
  useEffect(() => {
    if (!open || isLocked) return;

    async function loadSubjectsChapters() {
      setLoadingChapters(true);
      try {
        const { data } = await getSubjectsChapters();
        setSubjects(data.subjects);
        setSubjectId((current) => {
          if (current != null) return current;
          const matched = initialValues?.subjectValue
            ? data.subjects.find((s) => s.name.toLowerCase() === initialValues.subjectValue?.toLowerCase())
            : undefined;
          return matched?.id ?? null;
        });
      } catch {
        // Best-effort — the form still works without live subject/chapter data.
      } finally {
        setLoadingChapters(false);
      }
    }

    loadSubjectsChapters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isLocked]);

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
  // user-editable in edit / planFromBacklog mode (they're shown as static
  // text), so they're only enforced when the pickers are live.
  const isFormValid =
    taskName.trim().length > 0 &&
    timePreferenceValue.length > 0 &&
    Number(durationValue) >= MIN_DURATION_MINUTES &&
    (isLocked || (subjectId != null && chapterId.length > 0));

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
      await addPlannerTask({
        title,
        taskType: TASK_TYPE_API_VALUES[taskType] ?? "PRACTICE",
        estimatedMinutes: Number(durationValue),
        description: notes.trim() || undefined,
        suggestedWindow: SUGGESTED_WINDOW_VALUES[timePreferenceValue],
        subjectId: subjectId ?? undefined,
        chapterId: chapterId || undefined,
      });
      onTaskAdded?.();
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
          <Input
            label="Task Name"
            name="taskName"
            placeholder="e.g. Watch PW lecture on Friction"
            value={taskName}
            onChange={(event) => setTaskName(event.target.value)}
            required
          />

          {/* Subject + Topic */}
          <div className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            {isLocked ? (
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
                onChange={(value) => setSubjectId(Number(value))}
                placeholder="Subject"
              />
            )}

            {isLocked ? (
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
                onChange={setChapterId}
                placeholder={isLoadingChapters ? "Loading chapters..." : "Topic"}
              />
            )}
          </div>

          {/* Task Type */}
          {isLocked ? (
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
              Fill in every field to continue — only Additional Notes is optional.
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
