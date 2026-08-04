"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { MinusIcon, PencilIcon, PlusIcon, XIcon } from "@/components/ui/icons";
import { addPlannerTask, type SuggestedWindow } from "@/lib/api/planner";
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
const MAX_DURATION_MINUTES = 300;

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
  initialValues?: TaskFormInitialValues;
  onTaskAdded?: () => void;
};

export function AddCustomTaskModal({
  open,
  onClose,
  mode = "add",
  initialValues,
  onTaskAdded,
}: AddCustomTaskModalProps) {
  const [taskType, setTaskType] = useState(initialValues?.taskType ?? "Practice");
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
  const isEdit = mode === "edit";

  // The API returns every subject with its own chapters nested — fetched once
  // per open, then subject selection filters the already-loaded chapters
  // locally instead of refetching.
  useEffect(() => {
    if (!open) return;

    async function loadSubjectsChapters() {
      setLoadingChapters(true);
      try {
        const { data } = await getSubjectsChapters();
        setSubjects(data.subjects);
        setSubjectId((current) => {
          if (current != null) return current;
          const matched = initialValues?.subjectValue
            ? data.subjects.find((s) => s.name.toLowerCase() === initialValues.subjectValue)
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
  }, [open]);

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

  const handleSubmit = async () => {
    if (isEdit) {
      onClose();
      return;
    }

    if (!taskName.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      await addPlannerTask({
        title: taskName.trim(),
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
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-white">
            {isEdit ? <PencilIcon /> : <PlusIcon />}
          </span>
          <div className="min-w-0">
            <h2 className="text-h2 text-ink">
              {isEdit ? "Edit Task" : "Add to today, tomorrow, or any future day"}
            </h2>
            <p className="text-sm text-muted">
              {isEdit ? "Update the details for this task" : "Structure your study plan with precision"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-tint-strong"
        >
          <XIcon />
        </button>
      </div>

      <div className="mt-5 flex flex-col gap-4">
        <Input
          label="Task Name"
          name="taskName"
          placeholder="e.g. Watch PW lecture on Friction"
          value={taskName}
          onChange={(event) => setTaskName(event.target.value)}
        />

        <div>
          <p className="text-sm font-semibold text-ink">Task Type</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {TASK_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setTaskType(type)}
                aria-pressed={taskType === type}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                  taskType === type
                    ? "border-brand bg-brand text-white"
                    : "border-brand/15 text-body-text hover:bg-tint-strong"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="Subject"
            options={subjects.map((subject) => ({ value: String(subject.id), label: subject.name }))}
            value={subjectId != null ? String(subjectId) : ""}
            onChange={(event) => setSubjectId(Number(event.target.value))}
            placeholder="Subject"
          />
          <Select
            label="Topic"
            options={chapters.map((chapter) => ({ value: chapter.id, label: chapter.name }))}
            value={chapterId}
            onChange={(event) => setChapterId(event.target.value)}
            placeholder={isLoadingChapters ? "Loading chapters..." : "Topic"}
          />
          <div className="flex flex-col gap-1">
            <label className="text-[14px] font-semibold leading-[20px] text-ink">Duration</label>
            <div className="flex h-[46px] items-center justify-between rounded-xl border border-brand/15 bg-surface px-3">
              <button
                type="button"
                onClick={() => adjustDuration(-DURATION_STEP_MINUTES)}
                disabled={Number(durationValue) <= MIN_DURATION_MINUTES}
                aria-label="Decrease duration"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-ink transition-colors hover:bg-tint-strong disabled:cursor-not-allowed disabled:opacity-30"
              >
                <MinusIcon />
              </button>
              <span className="text-sm font-semibold text-body-text">{durationValue} min</span>
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
          <Select
            label="Time Preference"
            options={TIME_PREFERENCE_OPTIONS}
            value={timePreferenceValue}
            onChange={(event) => setTimePreferenceValue(event.target.value)}
            placeholder="Morning (5-11 AM)"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="task-notes" className="text-sm font-semibold text-ink">
            Additional Notes <span className="font-normal text-muted">(optional)</span>
          </label>
          <textarea
            id="task-notes"
            rows={3}
            placeholder="Specific focus areas, resources to use..."
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="mt-1 w-full resize-none rounded-xl border border-brand/15 bg-surface px-4 py-3 text-sm text-body-text outline-none placeholder:text-muted/70 focus:border-focus-ring"
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
      </div>

      <div className="mt-6 flex items-center justify-end gap-3">
        <Button variant="secondary" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={handleSubmit}
          disabled={isSubmitting || (!isEdit && !taskName.trim())}
        >
          {isSubmitting ? "Adding..." : isEdit ? "Save Changes" : "Add Task"}
        </Button>
      </div>
    </Modal>
  );
}
