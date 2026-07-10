"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { PencilIcon, PlusIcon, XIcon } from "@/components/ui/icons";

const SUBJECT_OPTIONS = [
  { value: "physics", label: "Physics" },
  { value: "chemistry", label: "Chemistry" },
  { value: "maths", label: "Maths" },
  { value: "biology", label: "Biology" },
];

const TOPIC_OPTIONS = [
  { value: "friction", label: "Friction" },
  { value: "kinematics", label: "Kinematics" },
  { value: "optics", label: "Optics" },
  { value: "electrostatics", label: "Electrostatics" },
];

const TASK_TYPES = ["New Learning", "Revision", "Practice", "DPP", "Other"];

const DURATION_OPTIONS = [
  { value: "30", label: "30 min" },
  { value: "45", label: "45 min" },
  { value: "60", label: "60 min" },
  { value: "90", label: "90 min" },
];

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
};

export function AddCustomTaskModal({
  open,
  onClose,
  mode = "add",
  initialValues,
}: AddCustomTaskModalProps) {
  const [taskType, setTaskType] = useState(initialValues?.taskType ?? "Practice");
  const isEdit = mode === "edit";

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
          defaultValue={initialValues?.taskName}
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
            options={SUBJECT_OPTIONS}
            defaultValue={initialValues?.subjectValue ?? "physics"}
          />
          <Select
            label="Topic"
            options={TOPIC_OPTIONS}
            defaultValue={initialValues?.topicValue ?? "friction"}
          />
          <Select
            label="Duration"
            options={DURATION_OPTIONS}
            defaultValue={initialValues?.durationValue ?? "60"}
          />
          <Select
            label="Time Preference"
            options={TIME_PREFERENCE_OPTIONS}
            defaultValue={initialValues?.timePreferenceValue}
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
            defaultValue={initialValues?.notes}
            className="mt-1 w-full resize-none rounded-xl border border-brand/15 bg-surface px-4 py-3 text-sm text-body-text outline-none placeholder:text-muted/70 focus:border-focus-ring"
          />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3">
        <Button variant="secondary" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" onClick={onClose}>
          {isEdit ? "Save Changes" : "Add Task"}
        </Button>
      </div>
    </Modal>
  );
}
