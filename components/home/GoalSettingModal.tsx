"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { OptionCard } from "@/components/ui/OptionCard";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { Input } from "@/components/ui/Input";
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
  InfoIcon2,
} from "@/components/ui/icons";
import { getSubjectsChapters, type SubjectWithChapters } from "@/lib/api/profile";

// These icon components accept no props and render at a hardcoded 16x16 (27x30
// for FlameIcon), so each is wrapped in a sized box that scales the SVG to the
// 24x24 the design calls for. The viewBox keeps the aspect ratio intact.
function SuggestionIcon({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-5 w-5 items-center justify-center [&>svg]:h-full [&>svg]:w-full sm:h-6 sm:w-6">
      {children}
    </span>
  );
}

const SUGGESTIONS = [
  { id: "finish-topic", icon: <SuggestionIcon><BookIcon /></SuggestionIcon>, label: "Finish [topic]" },
  { id: "hit-hours", icon: <SuggestionIcon><ClockIcon /></SuggestionIcon>, label: "Hit __ focus hours total" },
  { id: "maintain-streak", icon: <SuggestionIcon><FlameIcon /></SuggestionIcon>, label: "Maintain streak through week" },
  { id: "attempt-mock", icon: <SuggestionIcon><FileIcon /></SuggestionIcon>, label: "Attempt mock" },
  { id: "write-own", icon: <SuggestionIcon><PencilIcon /></SuggestionIcon>, label: "Write your own (one line, free)" },
] as const;

type SuggestionId = (typeof SUGGESTIONS)[number]["id"];

const MAX_TOPICS = 5;

type TopicRow = {
  key: number;
  subjectId: number | null;
  chapterId: string | null;
};

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
  // Per-instance so it can't be reset by Fast Refresh while `topicRows` survives.
  const topicRowSeq = useRef(0);

  useEffect(() => {
    if (!open || subjects) return;
    getSubjectsChapters()
      .then(({ data }) => {
        setSubjects(data.subjects);
        const firstSubject = data.subjects[0];
        setTopicRows([
          {
            key: topicRowSeq.current++,
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
    // Read the key outside the updater: state updaters must be pure, and React
    // double-invokes them in development.
    const key = topicRowSeq.current++;
    const firstSubject = subjects?.[0];
    setTopicRows((rows) =>
      rows.length >= MAX_TOPICS
        ? rows
        : [
          ...rows,
          {
            key,
            subjectId: firstSubject?.id ?? null,
            chapterId: firstSubject?.chapters[0]?.id ?? null,
          },
        ],
    );
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
    <Modal open={open} onClose={onClose} ariaLabel="Goal Setting Sunday" size="wide">
      {/* No horizontal padding of its own — the Modal panel already supplies
          it, and the old fixed `md:w-[580px]` / `md:w-[278px]` widths were
          wider than the panel, which clipped the title. */}
      <div className="relative flex w-full flex-col items-center gap-3 pb-2 pt-2 text-center sm:gap-4 sm:pb-3">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-tint-strong sm:h-9 sm:w-9"
        >
          <XIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </button>

        <div className="flex w-full flex-col items-center gap-2 px-8">
          <h2 className="font-[Plus_Jakarta_Sans] text-[20px] font-bold leading-tight tracking-[0%] text-ink sm:text-[24px] md:text-[28px]">
            Goal Setting Sunday
          </h2>

          <p className="font-[Plus_Jakarta_Sans] text-[13px] font-medium leading-snug tracking-[0%] text-muted sm:text-[14px] md:text-[16px]">
            {partnerName
              ? `Set this week's goal with ${partnerName}`
              : "Set this week's goal"}
          </p>
        </div>
      </div>

      <p className="mt-1 text-center font-[Plus_Jakarta_Sans] text-[10px] font-semibold uppercase leading-4 tracking-[1.4px] text-muted sm:mt-5 sm:text-[11px] sm:tracking-[1.6px] md:mt-5 md:text-[12px] md:leading-4 md:tracking-[1.8px]">
        Pick one or more
      </p>
      <div className="mt-3 flex flex-col gap-3">
        {SUGGESTIONS.map((item) => (
          <div key={item.id} className="flex flex-col gap-2">
            {/* Figma: 48x48 icon box at radius 8, 18/600/100% title, 20x20
                indicator — passed per-instance so other OptionCard callers keep
                their existing sizing. Each steps down one notch on mobile. */}
            <OptionCard
              icon={item.icon}
              title={item.label}
              selected={selectedIds.has(item.id)}
              onClick={() => toggle(item.id)}
              iconBoxClassName="h-10 w-10 rounded-lg sm:h-12 sm:w-12"
              titleClassName="font-[Plus_Jakarta_Sans] text-[15px] font-semibold leading-[100%] tracking-normal sm:text-[16px] md:text-[18px]"
              indicatorClassName="h-5 w-5"
              checkClassName="h-3.5 w-3.5"
            />

            {item.id === "finish-topic" && selectedIds.has(item.id) && (
              <div className="flex flex-col gap-2 rounded-xl bg-tint-strong p-3">
                {topicRows.map((row, index) => (
                  <div key={row.key} className="flex items-center gap-2">
                    {/* Labels are visually hidden — the surrounding card already
                        says what these are, but they keep the pair readable to
                        assistive tech. */}
                    <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                      <CustomSelect
                        label="Subject"
                        labelClassName="sr-only"
                        options={
                          subjects?.map((s) => ({ value: String(s.id), label: s.name })) ?? []
                        }
                        value={row.subjectId === null ? "" : String(row.subjectId)}
                        onChange={(value) => updateTopicRow(row.key, Number(value))}
                        placeholder={subjects ? "Select subject" : "Loading…"}
                      />

                      <CustomSelect
                        label="Chapter"
                        labelClassName="sr-only"
                        options={chaptersFor(row.subjectId).map((c) => ({
                          value: c.id,
                          label: c.name,
                        }))}
                        value={row.chapterId ?? ""}
                        onChange={(value) =>
                          setTopicRows((rows) =>
                            rows.map((r) => (r.key === row.key ? { ...r, chapterId: value } : r)),
                          )
                        }
                        placeholder="Select chapter"
                      />
                    </div>

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
              // Same tinted wrapper as the topic rows, since `Input` renders on
              // `bg-surface` and can't be recolored from the outside.
              <div className="rounded-xl bg-tint-strong p-3">
                <Input
                  label="Focus hours this week"
                  labelClassName="sr-only"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={24}
                  value={hours}
                  onChange={(event) => setHours(event.target.value)}
                  placeholder="e.g. 6"
                />
              </div>
            )}

            {item.id === "write-own" && selectedIds.has(item.id) && (
              <div className="rounded-xl bg-tint-strong p-3">
                <Input
                  label="Your goal"
                  labelClassName="sr-only"
                  type="text"
                  value={customGoal}
                  onChange={(event) => setCustomGoal(event.target.value)}
                  placeholder="Type your goal here..."
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex w-full flex-col gap-2 px-2 text-xs text-muted sm:mt-5 sm:gap-2.5 sm:px-0 md:mt-5 md:gap-2">
        <p className="flex w-full items-start justify-center gap-1.5 text-center font-[Plus_Jakarta_Sans] text-[10px] font-normal leading-4 sm:text-[11px] md:text-xs md:leading-5">
          <InfoIcon/>
          <span>
            When both partners set goals, they become visible to each other.
          </span>
        </p>

        <p className="flex w-full items-start justify-center gap-1.5 text-center font-[Plus_Jakarta_Sans] text-[10px] font-normal leading-4 sm:text-[11px] md:text-xs md:leading-5">
          <CheckCircleIcon className="mt-0.5 h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5 md:h-[15.5px] md:w-[13.5px]" />
          <span>
            End of week: review if you both hit your targets.
          </span>
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
