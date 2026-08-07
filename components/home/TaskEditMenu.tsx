"use client";

import { useEffect, useRef, useState } from "react";
import { AddCustomTaskModal } from "@/components/plan/AddCustomTaskModal";
import { PencilIcon, ListIcon, TrashIcon, MoreIcon } from "@/components/ui/icons";
import type { TaskType } from "@/components/home/taskTypes";
import { TYPE_LABELS } from "@/components/home/taskTypes";

const MENU_ITEMS = [
  { icon: <PencilIcon />, label: "Edit Task" },
  { icon: <ListIcon />, label: "Reorder" },
];

const SUBJECT_VALUES = new Set(["physics", "chemistry", "maths", "biology"]);
const DURATION_VALUES = new Set(["30", "45", "60", "90"]);
const TIME_PREFERENCE_VALUES = new Set(["morning", "midday", "evening", "night"]);

function toSubjectValue(subjectName: string): string {
  const normalized = subjectName.toLowerCase();
  return SUBJECT_VALUES.has(normalized) ? normalized : "physics";
}

function toDurationValue(duration: string): string {
  const match = duration.match(/\d+/);
  return match && DURATION_VALUES.has(match[0]) ? match[0] : "60";
}

function toTimePreferenceValue(timeSlot?: string): string | undefined {
  const normalized = timeSlot?.toLowerCase();
  return normalized && TIME_PREFERENCE_VALUES.has(normalized) ? normalized : undefined;
}

export type EditableTask = {
  title: string;
  subjectName: string;
  type: TaskType;
  duration: string;
  timeSlot?: string;
};

type TaskEditMenuProps = {
  task: EditableTask;
};

export function TaskEditMenu({ task }: TaskEditMenuProps) {
  const [open, setOpen] = useState(false);
  const [isEditOpen, setEditOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Task options"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-5 w-[33px] shrink-0 items-center justify-center border-l border-[#C7C5D14D] pl-3 text-[#9CA3AF] hover:text-ink dark:border-[#FAF7F240] dark:text-[#8B8998]"
      >
        <MoreIcon className="h-4 w-4" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-2 w-56 max-w-[calc(100vw-2rem)] rounded-2xl bg-surface p-2 shadow-modal"
        >
          {MENU_ITEMS.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                if (item.label === "Edit Task") setEditOpen(true);
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-ink hover:bg-tint-strong"
            >
              {item.icon}
              {item.label}
            </button>
          ))}
          <div className="my-1 h-px bg-brand/10" />
          <button
            type="button"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-danger hover:bg-danger-bg"
          >
            <TrashIcon />
            Delete Task
          </button>
        </div>
      )}

      <AddCustomTaskModal
        open={isEditOpen}
        onClose={() => setEditOpen(false)}
        mode="edit"
        initialValues={{
          taskName: task.title,
          subjectValue: toSubjectValue(task.subjectName),
          taskType: TYPE_LABELS[task.type],
          durationValue: toDurationValue(task.duration),
          timePreferenceValue: toTimePreferenceValue(task.timeSlot),
        }}
      />
    </div>
  );
}
