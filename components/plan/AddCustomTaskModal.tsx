"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { EditIcon, MinusIcon, PencilIcon, PlusIcon, XIcon } from "@/components/ui/icons";
import { addPlannerTask, editPlannerTask, type SuggestedWindow } from "@/lib/api/planner";
import { getCheckInStatus } from "@/lib/api/checkin";
import {
  getSubjectsChapters,
  type SubjectWithChapters,
} from "@/lib/api/profile";

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
};

type AddCustomTaskModalProps = {
  open: boolean;
  onClose: () => void;
  mode?: "add" | "edit";
  /** Task being edited — required in edit mode, used as the PATCH target. */
  taskId?: string;
  initialValues?: TaskFormInitialValues;
  onTaskAdded?: () => void;
  onTaskUpdated?: () => void;
  /** Locks Task Type to this value and hides the picker — used by the revision page. */
  lockedTaskType?: string;
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
  initialValues,
  onTaskAdded,
  onTaskUpdated,
  lockedTaskType,
}: AddCustomTaskModalProps) {
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
    if (!open || isEdit) return;

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
  }, [open, isEdit]);

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

  const handleSubmit = () => {
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
    } catch {
      setError("Couldn't add the task. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      ariaLabel={isEdit ? "Edit task" : "Add custom task"}
      size="lg"
    >
      {/* HEADER */}
      <div className="-mx-5 -mt-5 flex w-[calc(100%+2.5rem)] shrink-0 items-start justify-between gap-3 border-b border-brand/10 px-3 py-4 sm:-mx-8 sm:-mt-8 sm:w-[calc(100%+4rem)] sm:px-5 sm:py-5 lg:px-6 lg:py-6">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand sm:size-11">
            {isEdit ? <EditIcon /> : <PlusIcon />}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="min-w-0 break-words text-[14px] font-bold leading-5 text-ink sm:truncate sm:text-base sm:leading-6 md:text-lg lg:text-[22px] lg:leading-7">
              {isEdit ? "Edit Task" : "Add to today, tomorrow, or any future day"}
            </h2>

            <p className="min-w-0 truncate text-[10px] font-normal leading-[15px] text-primary sm:mt-1 sm:text-[11px] sm:leading-4 md:text-xs md:leading-[18px] lg:text-sm">
              {isEdit ? "Update the details for this task" : "Structure your study plan with precision"}
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
          />

          {/* Subject + Topic */}
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
            {isEdit ? (
              <StaticField
                label="Subject"
                value={initialValues?.subjectValue ?? ""}
              />
            ) : (
              <Select
                label="Subject"
                options={subjects.map((subject) => ({
                  value: String(subject.id),
                  label: subject.name,
                }))}
                value={subjectId != null ? String(subjectId) : ""}
                onChange={(event) => setSubjectId(Number(event.target.value))}
                placeholder="Subject"
              />
            )}

            {isEdit ? (
              <StaticField
                label="Topic"
                value={initialValues?.topicValue ?? ""}
              />
            ) : (
              <Select
                label="Topic"
                options={chapters.map((chapter) => ({
                  value: chapter.id,
                  label: chapter.name,
                }))}
                value={chapterId}
                onChange={(event) => setChapterId(event.target.value)}
                placeholder={isLoadingChapters ? "Loading chapters..." : "Topic"}
              />
            )}
          </div>

          {/* Task Type */}
          {isEdit ? (
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
            <Select
              label="Time Preference"
              options={TIME_PREFERENCE_OPTIONS}
              value={timePreferenceValue}
              onChange={(event) => setTimePreferenceValue(event.target.value)}
              placeholder="Morning (5-11 AM)"
            />
          </div>

          {/* Additional Notes */}
          <div className="flex w-full flex-col gap-1">
            <label htmlFor="task-notes" className="text-body-lg font-medium text-body-text dark:text-ink">
              Additional Notes <span className="font-normal text-muted">(optional)</span>
            </label>

            <textarea
              id="task-notes"
              rows={3}
              placeholder="Specific focus areas, resources to use..."
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="mt-1 w-full resize-none rounded-xl border border-input-border bg-surface px-4 py-3 text-[14px] font-semibold leading-5 text-ink outline-none placeholder:text-[10px] placeholder:font-normal placeholder:text-muteds focus:border-input-border sm:text-[15px] sm:leading-5 sm:placeholder:text-[11px] md:text-base md:leading-6 md:placeholder:text-xs lg:placeholder:text-sm"
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
      </div>

      {/* FOOTER */}
      <div className="-mx-5 -mb-5 flex min-h-[103px] w-[calc(100%+2.5rem)] shrink-0 flex-col-reverse gap-3 border-t border-brand/10 px-3 py-5 sm:-mx-8 sm:-mb-8 sm:w-[calc(100%+4rem)] sm:flex-row sm:items-center sm:justify-end sm:gap-4 sm:px-5 sm:py-6 lg:px-6">
        <Button variant="secondary" size="sm" onClick={onClose} className="w-full sm:w-auto">
          Cancel
        </Button>

        <Button variant="primary" size="sm" onClick={handleSubmit} disabled={isSubmitting || !taskName.trim()} className="w-full sm:w-auto">
          {isSubmitting ? (isEdit ? "Saving..." : "Adding...") : isEdit ? "Save Changes" : "Add Task"}
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
    </Modal>
  );
}
