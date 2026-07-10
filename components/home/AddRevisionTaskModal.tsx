"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { CalendarIcon, ClockIcon, XIcon } from "@/components/ui/icons";

const SUBJECT_OPTIONS = [
  { value: "physics", label: "Physics" },
  { value: "chemistry", label: "Chemistry" },
  { value: "maths", label: "Maths" },
  { value: "biology", label: "Biology" },
];

type Priority = "Low" | "Medium" | "High";

const PRIORITIES: Priority[] = ["Low", "Medium", "High"];

type AddRevisionTaskModalProps = {
  open: boolean;
  onClose: () => void;
};

export function AddRevisionTaskModal({ open, onClose }: AddRevisionTaskModalProps) {
  const [priority, setPriority] = useState<Priority>("Medium");

  return (
    <Modal open={open} onClose={onClose} ariaLabel="Add revision task">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-h2 text-ink">Add Task</h2>
          <p className="mt-1 text-sm text-muted">
            Plan your next focused study session
          </p>
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

      <div className="mt-4 flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select label="Subject" placeholder="Select Subject" options={SUBJECT_OPTIONS} />
          <Input label="Chapter / Topic" name="topic" placeholder="e.g. Organic Chemistry" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Date"
            name="date"
            placeholder="mm/dd/yyyy"
            icon={<CalendarIcon />}
            readOnly
          />
          <Input
            label="Time (Optional)"
            name="time"
            placeholder="--:-- --"
            icon={<ClockIcon />}
            readOnly
          />
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-ink">Priority</p>
          <div className="mt-1 grid grid-cols-3 gap-2">
            {PRIORITIES.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setPriority(option)}
                aria-pressed={priority === option}
                className={`h-10 rounded-xl border text-sm font-semibold transition-colors ${
                  priority === option
                    ? "border-brand bg-brand text-white"
                    : "border-brand/15 text-body-text hover:bg-tint-strong"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="revision-notes" className="text-sm font-semibold text-ink">
            Study Notes <span className="font-normal text-muted">(Optional)</span>
          </label>
          <textarea
            id="revision-notes"
            rows={3}
            placeholder="Add learning objectives..."
            className="mt-1 w-full resize-none rounded-xl border border-brand/15 bg-surface px-4 py-3 text-sm text-body-text outline-none placeholder:text-muted/70 focus:border-focus-ring"
          />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3">
        <Button variant="secondary" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" onClick={onClose}>
          Add Revision
        </Button>
      </div>
    </Modal>
  );
}
