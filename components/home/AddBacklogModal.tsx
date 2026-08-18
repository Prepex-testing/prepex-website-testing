"use client";

import { useEffect, useState } from "react";
import { WhiteModal } from "@/components/ui/WhiteModal";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { ChevronDownIcon, PlusIcon, XIcon } from "@/components/ui/icons";
import { getSubjectsChapters, type SubjectWithChapters } from "@/lib/api/profile";
import { addBacklogTasks, type BacklogTaskTypeInput } from "@/lib/api/backlog";
import { AddTask } from "@/assets/icons";

type Priority = "URGENT" | "NORMAL" | "LOW";

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: "URGENT", label: "Urgent" },
  { value: "NORMAL", label: "Normal" },
  { value: "LOW", label: "Low" },
];


const PRIORITY_BADGE_CLASSES: Record<Priority, string> = {
  NORMAL:
    "bg-white border-[#E5E7EB] text-[#1A1A4E] dark:bg-[#111145] dark:border-[#8B8998] dark:text-[#8B8998]",

  URGENT:
    "bg-[#FFF1F0] border-[#FF7A59] text-[#FF7A59] dark:bg-[#FF7A59] dark:border-[#8B8998] dark:text-[#FAF7F2]",

  LOW:
    "bg-[#F0FDF4] border-[#86EFAC] text-[#166534] dark:bg-[#166534] dark:border-[#8B8998] dark:text-[#FAF7F2]",
};

const TASK_TYPE_OPTIONS: { value: BacklogTaskTypeInput; label: string }[] = [
  { value: "REVISION", label: "Revision" },
  { value: "NEW_LEARNING", label: "New Learning" },
  { value: "PRACTICE", label: "Practice" },
];

type BacklogEntry = {
  id: string;
  subjectId: number;
  subjectName: string;
  chapterId: string;
  chapterName: string;
  priority: Priority;
  taskType: BacklogTaskTypeInput;
};

type AddBacklogModalProps = {
  open: boolean;
  onClose: () => void;
  /** Called after a successful submit so the parent list can refetch. */
  onAdded?: () => void;
};

function RadioGroup<T extends string>({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-6">
      {options.map((option) => {
        const selected = value === option.value;

        return (
          <label key={option.value} className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={selected}
              onChange={() => onChange(option.value)}
              className="peer sr-only"
            />

            <span
              className={`flex size-5 shrink-0 items-center justify-center rounded-full ${selected
                  ? "border-2 border-ink"
                  : "border-[1.5px] border-[#E5E7EB] dark:border-[#8B8998]"
                }`}
            >
              {selected && <span className="size-2.5 rounded-full bg-ink" />}
            </span>

            <span className="text-[14px] font-medium text-ink">
              {option.label}
            </span>
          </label>
        );
      })}
    </div>
  );
}

export function AddBacklogModal({ open, onClose, onAdded }: AddBacklogModalProps) {
  const [subjects, setSubjects] = useState<SubjectWithChapters[]>([]);
  const [entries, setEntries] = useState<BacklogEntry[]>([]);
  const [openEntryId, setOpenEntryId] = useState<string | null>(null);
  const [draftSubjectId, setDraftSubjectId] = useState<number | null>(null);
  const [draftChapterId, setDraftChapterId] = useState("");
  const [draftPriority, setDraftPriority] = useState<Priority>("NORMAL");
  const [draftTaskType, setDraftTaskType] = useState<BacklogTaskTypeInput>("REVISION");
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    getSubjectsChapters()
      .then(({ data }) => setSubjects(data.subjects))
      .catch(() => {
        // Best-effort — the form still works without live subject/chapter data.
      });
  }, [open]);

  // Starts every open with a single blank form, not whatever was left over
  // from the previous session.
  useEffect(() => {
    if (open) {
      setEntries([]);
      setOpenEntryId(null);
      setDraftSubjectId(null);
      setDraftChapterId("");
      setDraftPriority("NORMAL");
      setDraftTaskType("REVISION");
      setError(null);
    }
  }, [open]);

  const draftChapters = subjects.find((subject) => subject.id === draftSubjectId)?.chapters ?? [];
  const canCommitDraft = draftSubjectId != null && draftChapterId !== "";

  const resetDraft = () => {
    setDraftSubjectId(null);
    setDraftChapterId("");
    setDraftPriority("NORMAL");
    setDraftTaskType("REVISION");
  };

  const commitDraft = () => {
    if (!canCommitDraft) return;

    const subject = subjects.find((item) => item.id === draftSubjectId);
    const chapter = draftChapters.find((item) => item.id === draftChapterId);
    if (!subject || !chapter) return;

    setEntries((current) => [
      ...current,
      {
        id: `${draftSubjectId}-${draftChapterId}-${current.length}`,
        subjectId: draftSubjectId as number,
        subjectName: subject.name,
        chapterId: draftChapterId,
        chapterName: chapter.name,
        priority: draftPriority,
        taskType: draftTaskType,
      },
    ]);
    resetDraft();
  };

  // Only one entry is expanded for inline editing at a time. Opening another
  // one just switches which is expanded — the previously open entry keeps
  // whatever values it already has and collapses back to a card instead of
  // being discarded.
  const toggleEntryOpen = (id: string) => {
    setOpenEntryId((current) => (current === id ? null : id));
  };

  const updateEntrySubject = (id: string, subjectId: number) => {
    const subject = subjects.find((item) => item.id === subjectId);
    setEntries((current) =>
      current.map((entry) =>
        entry.id === id
          ? { ...entry, subjectId, subjectName: subject?.name ?? "", chapterId: "", chapterName: "" }
          : entry,
      ),
    );
  };

  const updateEntryChapter = (id: string, chapterId: string) => {
    setEntries((current) =>
      current.map((entry) => {
        if (entry.id !== id) return entry;
        const chapter = subjects
          .find((subject) => subject.id === entry.subjectId)
          ?.chapters.find((item) => item.id === chapterId);
        return { ...entry, chapterId, chapterName: chapter?.name ?? "" };
      }),
    );
  };

  const updateEntryPriority = (id: string, priority: Priority) => {
    setEntries((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, priority } : entry)),
    );
  };

  const updateEntryTaskType = (id: string, taskType: BacklogTaskTypeInput) => {
    setEntries((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, taskType } : entry)),
    );
  };

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = async () => {
    const chapters = [
      ...entries,
      ...(canCommitDraft
        ? [
          {
            chapterId: draftChapterId,
            priority: draftPriority,
            taskType: draftTaskType,
          },
        ]
        : []),
    ].map((entry) => ({
      chapterId: entry.chapterId,
      priority: entry.priority,
      taskTypes: entry.taskType,
    }));

    if (chapters.length === 0) return;

    setSubmitting(true);
    setError(null);
    try {
      await addBacklogTasks(chapters);
      onAdded?.();
      handleClose();
    } catch {
      setError("Couldn't add to backlog. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <WhiteModal open={open} onClose={handleClose} ariaLabel="Add Backlog Chapters/Topics" size="lg">
      {/* HEADER */}
      <div className="flex w-full items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl  bg-[#EEF0F8] text-ink dark:bg-[#FAF7F214] sm:size-11">
            <AddTask />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[18px] font-bold leading-6 text-ink lg:text-[22px] lg:leading-7">
              Add Backlog Chapters/Topics
            </h2>
            <p className="mt-1 text-[12px] font-medium leading-4 text-muted sm:text-[13px]">
              Mark what you know is pending. Tap to add to backlog.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClose}
          aria-label="Close"
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-tint-strong"
        >
          <XIcon className="size-3.5" />
        </button>
      </div>

      {/* BODY */}
      <div className="mt-6 flex w-full flex-col gap-3">
        {entries.map((entry) => {
          const isOpen = openEntryId === entry.id;
          const entryChapters = subjects.find((subject) => subject.id === entry.subjectId)?.chapters ?? [];

          return (
            <div
              key={entry.id}
              className="flex w-full flex-col rounded-xl border border-[#E5E7EB] bg-[#F3F4F6] p-4 dark:border-[#8B8998] dark:bg-[#111145]"
            >
              {/* Header */}
              <div className="flex w-full items-center justify-between gap-3">
                {/* Subject + Chapter */}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  {/* Subject */}
                  <p className="truncate text-base font-bold leading-5 text-ink">
                    {entry.subjectName}
                  </p>

                  {/* Chapter */}
                  <span className="inline-flex h-[23px] w-fit max-w-full items-center rounded-full border border-[#E5E7EB] bg-white px-2 py-1 text-[11px] font-medium leading-[15px] text-[#333333] dark:border-[#8B8998] dark:bg-[#111145] dark:text-[#8B8998]">
                    <span className="truncate">{entry.chapterName}</span>
                  </span>
                </div>

                {/* Priority + Chevron */}
                <div className="flex shrink-0 items-center gap-2">
                  {/* Priority */}
                  <span
                    className={`inline-flex h-[23px] items-center justify-center rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-[15px] ${PRIORITY_BADGE_CLASSES[entry.priority]}`}
                  >
                    {PRIORITY_OPTIONS.find((option) => option.value === entry.priority)?.label}
                  </span>

                  {/* Expand / Collapse */}
                  <button
                    type="button"
                    onClick={() => toggleEntryOpen(entry.id)}
                    aria-label={
                      isOpen
                        ? `Collapse ${entry.chapterName}`
                        : `Edit ${entry.chapterName}`
                    }
                    aria-expanded={isOpen}
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-tint-strong hover:text-ink"
                  >
                    <ChevronDownIcon
                      className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""
                        }`}
                    />
                  </button>
                </div>
              </div>

              {/* Expanded Content */}
              {isOpen && (
                <div className="flex flex-col gap-4 border-t border-[#E5E7EB] pt-4 dark:border-[#8B8998]">
                  <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
                    <Select
                      label="Subject"
                      options={subjects.map((subject) => ({
                        value: String(subject.id),
                        label: subject.name,
                      }))}
                      value={String(entry.subjectId)}
                      onChange={(event) =>
                        updateEntrySubject(entry.id, Number(event.target.value))
                      }
                      placeholder="Subject"
                    />

                    <Select
                      label="Topic"
                      options={entryChapters.map((chapter) => ({
                        value: chapter.id,
                        label: chapter.name,
                      }))}
                      value={entry.chapterId}
                      onChange={(event) =>
                        updateEntryChapter(entry.id, event.target.value)
                      }
                      placeholder="Topic"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <p className="text-body-lg font-medium leading-5 text-body-text dark:text-ink">
                      Priority:
                    </p>

                    <RadioGroup
                      name={`backlog-priority-${entry.id}`}
                      options={PRIORITY_OPTIONS}
                      value={entry.priority}
                      onChange={(value) => updateEntryPriority(entry.id, value)}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <p className="text-body-lg font-medium leading-5 text-body-text dark:text-ink">
                      Task Type:
                    </p>

                    <RadioGroup
                      name={`backlog-task-type-${entry.id}`}
                      options={TASK_TYPE_OPTIONS}
                      value={entry.taskType}
                      onChange={(value) => updateEntryTaskType(entry.id, value)}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Draft form */}
        <div className="flex w-full flex-col gap-4 rounded-xl border border-[#E5E7EB] bg-white p-4 dark:border-[#8B8998] dark:bg-[#111145]">
          <p className="text-[13px] font-medium text-muted">For each, optionally add specifics:</p>

          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Subject"
              options={subjects.map((subject) => ({ value: String(subject.id), label: subject.name }))}
              value={draftSubjectId != null ? String(draftSubjectId) : ""}
              onChange={(event) => {
                setDraftSubjectId(Number(event.target.value));
                setDraftChapterId("");
              }}
              placeholder="Subject"
            />

            <Select
              label="Topic"
              options={draftChapters.map((chapter) => ({ value: chapter.id, label: chapter.name }))}
              value={draftChapterId}
              onChange={(event) => setDraftChapterId(event.target.value)}
              placeholder="Topic"
            />
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-body-lg font-medium leading-5 text-body-text dark:text-ink">
              Priority:
            </p>

            <RadioGroup
              name="backlog-priority"
              options={PRIORITY_OPTIONS}
              value={draftPriority}
              onChange={setDraftPriority}
            />
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-body-lg font-medium leading-5 text-body-text dark:text-ink">
              Task Type:
            </p>

            <RadioGroup
              name="backlog-task-type"
              options={TASK_TYPE_OPTIONS}
              value={draftTaskType}
              onChange={setDraftTaskType}
            />
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button
          variant="active"
          size="sm"
          onClick={commitDraft}
          disabled={!canCommitDraft}
          className="h-11 w-full rounded-lg border px-4 py-3 text-sm font-bold leading-5 sm:w-[122px]"
        >
          + Add More
        </Button>
      </div>

      {/* FOOTER */}
      <div className="mt-6 flex w-full flex-col-reverse gap-3 border-t border-brand/10 pt-5 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
        <Button variant="secondary" size="sm" onClick={handleClose} className="h-[54px] w-full sm:w-[141px]">
          Cancel
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={handleSubmit}
          disabled={isSubmitting || (entries.length === 0 && !canCommitDraft)}
          className="h-[54px] w-full sm:w-[231px]"
        >
          {isSubmitting ? "Adding..." : "Add Backlog"}
        </Button>
      </div>
    </WhiteModal>
  );
}
