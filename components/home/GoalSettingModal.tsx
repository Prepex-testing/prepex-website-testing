"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { OptionCard } from "@/components/ui/OptionCard";
import {
  BookIcon,
  ClockIcon,
  FlameIcon,
  FileIcon,
  PencilIcon,
  PlusIcon,
  InfoIcon,
  CheckCircleIcon,
  XIcon,
} from "@/components/ui/icons";
import { getSubjectsChapters, type SubjectWithChapters } from "@/lib/api/profile";

const SUGGESTIONS = [
  { id: "finish-topic", icon: <BookIcon />, label: "Finish [topic]" },
  { id: "hit-hours", icon: <ClockIcon />, label: "Hit __ focus hours total" },
  { id: "maintain-streak", icon: <FlameIcon />, label: "Maintain streak through week" },
  { id: "attempt-mock", icon: <FileIcon />, label: "Attempt mock" },
  { id: "write-own", icon: <PencilIcon />, label: "Write your own (one line, free)" },
] as const;

type SuggestionId = (typeof SUGGESTIONS)[number]["id"];

const MAX_TOPICS = 5;
let topicRowSeq = 0;

type TopicRow = {
  key: number;
  subjectId: number | null;
  chapterId: string | null;
};

const FIELD_CLASS =
  "w-full rounded-xl border border-brand/15 bg-surface px-4 py-3 text-sm text-body-text outline-none focus:border-focus-ring";

type GoalSettingModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (goal: string) => void;
  partnerName?: string;
  isSubmitting?: boolean;
};

export function GoalSettingModal({
  open,
  onClose,
  onSubmit,
  partnerName,
  isSubmitting,
}: GoalSettingModalProps) {
  // Multiple goals can be selected at once — each selected card's config
  // renders inline, directly below that card.
  const [selectedIds, setSelectedIds] = useState<Set<SuggestionId>>(new Set(["finish-topic"]));
  const [customGoal, setCustomGoal] = useState("");
  const [hours, setHours] = useState("");
  const [subjects, setSubjects] = useState<SubjectWithChapters[] | null>(null);
  const [topicRows, setTopicRows] = useState<TopicRow[]>([]);

  useEffect(() => {
    if (!open || subjects) return;
    getSubjectsChapters()
      .then(({ data }) => {
        setSubjects(data.subjects);
        const firstSubject = data.subjects[0];
        setTopicRows([
          {
            key: topicRowSeq++,
            subjectId: firstSubject?.id ?? null,
            chapterId: firstSubject?.chapters[0]?.id ?? null,
          },
        ]);
      })
      .catch(() => {
        // Best-effort — "Finish [topic]" stays disabled if this fails.
      });
  }, [open, subjects]);

  const chaptersFor = (subjectId: number | null) =>
    subjects?.find((s) => s.id === subjectId)?.chapters ?? [];

  const toggle = (id: SuggestionId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addTopicRow = () => {
    setTopicRows((rows) => {
      if (rows.length >= MAX_TOPICS) return rows;
      const firstSubject = subjects?.[0];
      return [
        ...rows,
        {
          key: topicRowSeq++,
          subjectId: firstSubject?.id ?? null,
          chapterId: firstSubject?.chapters[0]?.id ?? null,
        },
      ];
    });
  };

  const removeTopicRow = (key: number) => {
    setTopicRows((rows) => (rows.length > 1 ? rows.filter((r) => r.key !== key) : rows));
  };

  const updateTopicRow = (key: number, subjectId: number) => {
    const firstChapter = chaptersFor(subjectId)[0]?.id ?? null;
    setTopicRows((rows) =>
      rows.map((r) => (r.key === key ? { ...r, subjectId, chapterId: firstChapter } : r)),
    );
  };

  const topicNames = useMemo(() => {
    const allChapters = subjects?.flatMap((s) => s.chapters) ?? [];
    return topicRows
      .map((r) => allChapters.find((c) => c.id === r.chapterId)?.name)
      .filter((name): name is string => Boolean(name));
  }, [topicRows, subjects]);

  const canSubmit =
    selectedIds.size > 0 &&
    [...selectedIds].some((id) => {
      if (id === "write-own") return customGoal.trim().length > 0;
      if (id === "finish-topic") return topicNames.length > 0;
      if (id === "hit-hours") return Number(hours) > 0;
      return true;
    });

  const handleSubmit = () => {
    if (!canSubmit) return;
    const parts: string[] = [];

    if (selectedIds.has("finish-topic") && topicNames.length > 0) {
      parts.push(`Finish ${topicNames.join(", ")}`);
    }
    if (selectedIds.has("hit-hours") && Number(hours) > 0) {
      const n = Number(hours);
      parts.push(`Hit ${n} focus hour${n === 1 ? "" : "s"} total`);
    }
    if (selectedIds.has("maintain-streak")) parts.push("Maintain streak through week");
    if (selectedIds.has("attempt-mock")) parts.push("Attempt mock");
    if (selectedIds.has("write-own") && customGoal.trim()) parts.push(customGoal.trim());

    const goal = parts.join(" • ");
    if (!goal) return;
    onSubmit(goal);
  };

  return (
    <Modal open={open} onClose={onClose} ariaLabel="Goal Setting Sunday">
      <div className="relative text-center">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-0 top-0 flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-tint-strong"
        >
          <XIcon />
        </button>
        <h2 className="text-h1 text-ink">Goal Setting Sunday</h2>
        <p className="mt-1 text-sm text-muted">
          {partnerName ? `Set this week's goal with ${partnerName}` : "Set this week's goal"}
        </p>
      </div>

      <p className="mt-5 text-center text-xs font-bold uppercase tracking-wide text-muted">
        Pick one or more
      </p>

      <div className="mt-3 flex flex-col gap-3">
        {SUGGESTIONS.map((item) => (
          <div key={item.id} className="flex flex-col gap-2">
            <OptionCard
              icon={item.icon}
              title={item.label}
              selected={selectedIds.has(item.id)}
              onClick={() => toggle(item.id)}
            />

            {item.id === "finish-topic" && selectedIds.has(item.id) && (
              <div className="flex flex-col gap-2 rounded-xl bg-tint-strong p-3">
                {topicRows.map((row, index) => (
                  <div key={row.key} className="flex items-center gap-2">
                    <select
                      value={row.subjectId ?? ""}
                      onChange={(event) => updateTopicRow(row.key, Number(event.target.value))}
                      className={FIELD_CLASS}
                      disabled={!subjects}
                    >
                      {!subjects && <option>Loading…</option>}
                      {subjects?.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={row.chapterId ?? ""}
                      onChange={(event) =>
                        setTopicRows((rows) =>
                          rows.map((r) =>
                            r.key === row.key ? { ...r, chapterId: event.target.value } : r,
                          ),
                        )
                      }
                      className={FIELD_CLASS}
                      disabled={chaptersFor(row.subjectId).length === 0}
                    >
                      {chaptersFor(row.subjectId).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>

                    {index > 0 && (
                      <button
                        type="button"
                        aria-label="Remove topic"
                        onClick={() => removeTopicRow(row.key)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface"
                      >
                        <XIcon />
                      </button>
                    )}
                  </div>
                ))}

                {topicRows.length < MAX_TOPICS && (
                  <button
                    type="button"
                    onClick={addTopicRow}
                    className="flex w-fit items-center gap-1 self-start rounded-lg px-2 py-1 text-xs font-semibold text-ink hover:bg-surface"
                  >
                    <PlusIcon />
                    Add another topic
                  </button>
                )}
              </div>
            )}

            {item.id === "hit-hours" && selectedIds.has(item.id) && (
              <input
                type="number"
                min={1}
                max={24}
                value={hours}
                onChange={(event) => setHours(event.target.value)}
                placeholder="e.g. 6"
                className={`${FIELD_CLASS} bg-tint-strong`}
              />
            )}

            {item.id === "write-own" && selectedIds.has(item.id) && (
              <input
                type="text"
                value={customGoal}
                onChange={(event) => setCustomGoal(event.target.value)}
                placeholder="Type your goal here..."
                className={`${FIELD_CLASS} bg-tint-strong`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-col items-center gap-1 text-center text-xs text-muted">
        <p className="flex items-center gap-1">
          <InfoIcon />
          When both partners set goals, they become visible to each other.
        </p>
        <p className="flex items-center gap-1">
          <CheckCircleIcon />
          End of week: review if you both hit your targets.
        </p>
      </div>

      <Button
        variant="primary"
        className="mt-5"
        onClick={handleSubmit}
        disabled={!canSubmit || isSubmitting}
      >
        {isSubmitting ? "Saving…" : "Set my goal"}
      </Button>
    </Modal>
  );
}
