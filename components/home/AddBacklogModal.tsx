"use client";

import { useEffect, useState } from "react";
import { WhiteModal } from "@/components/ui/WhiteModal";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { ChevronDownIcon, PlusIcon, XIcon } from "@/components/ui/icons";
import { getSubjectsChapters, type SubjectWithChapters } from "@/lib/api/profile";
import { addBacklogTasks, type BacklogTaskTypeInput } from "@/lib/api/backlog";

type Priority = "URGENT" | "NORMAL" | "LOW";

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: "URGENT", label: "Urgent" },
  { value: "NORMAL", label: "Normal" },
  { value: "LOW", label: "Low" },
];

const PRIORITY_BADGE_CLASSES: Record<Priority, string> = {
  URGENT: "border border-cta text-cta",
  NORMAL: "bg-tint-strong text-ink",
  LOW: "bg-tint text-muted",
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

export function AddBacklogModal({ open, onClose, onAdded }: AddBacklogModalProps) {
  const [subjects, setSubjects] = useState<SubjectWithChapters[]>([]);
  const [entries, setEntries] = useState<BacklogEntry[]>([]);
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

  const editEntry = (id: string) => {
    const entry = entries.find((item) => item.id === id);
    if (!entry) return;

    setDraftSubjectId(entry.subjectId);
    setDraftChapterId(entry.chapterId);
    setDraftPriority(entry.priority);
    setDraftTaskType(entry.taskType);
    setEntries((current) => current.filter((item) => item.id !== id));
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
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#1E1B4B] text-white">
            <PlusIcon />
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
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex w-full items-center justify-between gap-4 rounded-xl border border-brand/10 bg-tint p-4"
          >
            <div className="min-w-0">
              <p className="text-[15px] font-semibold leading-5 text-ink">{entry.subjectName}</p>
              <span className="mt-1 inline-flex items-center rounded-full bg-surface px-2.5 py-1 text-[11px] font-medium text-muted">
                {entry.chapterName}
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <span
                className={`inline-flex h-7 items-center justify-center rounded-full px-3 text-[12px] font-semibold ${PRIORITY_BADGE_CLASSES[entry.priority]}`}
              >
                {PRIORITY_OPTIONS.find((option) => option.value === entry.priority)?.label}
              </span>

              <span className="inline-flex h-7 items-center justify-center rounded-full bg-tint-strong px-3 text-[12px] font-semibold text-ink">
                {TASK_TYPE_OPTIONS.find((option) => option.value === entry.taskType)?.label}
              </span>

              <button
                type="button"
                onClick={() => editEntry(entry.id)}
                aria-label={`Edit ${entry.chapterName}`}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-tint-strong hover:text-ink"
              >
                <ChevronDownIcon />
              </button>
            </div>
          </div>
        ))}

        {/* Draft form */}
        <div className="flex w-full flex-col gap-4 rounded-xl border border-brand/10 p-4">
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
            <p className="text-body-lg font-medium leading-5 text-body-text dark:text-ink">Priority:</p>
            <div className="flex flex-wrap items-center gap-6">
              {PRIORITY_OPTIONS.map((option) => {
                const selected = draftPriority === option.value;
                return (
                  <label key={option.value} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="backlog-priority"
                      value={option.value}
                      checked={selected}
                      onChange={() => setDraftPriority(option.value)}
                      className="peer sr-only"
                    />
                    <span
                      className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
                        selected ? "border-[#1E1B4B]" : "border-brand/25"
                      }`}
                    >
                      {selected && <span className="size-2.5 rounded-full bg-[#1E1B4B]" />}
                    </span>
                    <span className="text-[14px] font-medium text-ink">{option.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-body-lg font-medium leading-5 text-body-text dark:text-ink">Task Type:</p>
            <div className="flex flex-wrap items-center gap-6">
              {TASK_TYPE_OPTIONS.map((option) => {
                const selected = draftTaskType === option.value;
                return (
                  <label key={option.value} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="backlog-task-type"
                      value={option.value}
                      checked={selected}
                      onChange={() => setDraftTaskType(option.value)}
                      className="peer sr-only"
                    />
                    <span
                      className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
                        selected ? "border-[#1E1B4B]" : "border-brand/25"
                      }`}
                    >
                      {selected && <span className="size-2.5 rounded-full bg-[#1E1B4B]" />}
                    </span>
                    <span className="text-[14px] font-medium text-ink">{option.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button
          variant="secondary"
          size="sm"
          onClick={commitDraft}
          disabled={!canCommitDraft}
          className="h-11 w-full sm:w-auto"
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
