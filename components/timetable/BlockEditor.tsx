"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ACTIVITY_META, ACTIVITY_ORDER, SUBJECT_ACTIVITIES } from "@/lib/timetable/activities";
import {
  DAY_LONG,
  DAY_COUNT,
  MIN_BLOCK_MINUTES,
  formatDuration,
  hasOverlap,
  parseTime,
  toTime,
  type GridBlock,
} from "@/lib/timetable/grid";
import type { ActivityType } from "@/lib/api/timetable";

type Props = {
  block: GridBlock;
  blocks: GridBlock[];
  subjects: { id: number; name: string }[];
  onChange: (next: GridBlock) => void;
  onDelete: () => void;
  onCopyDay: (toDays: number[]) => void;
  onClose: () => void;
};

const FIELD =
  "h-12 w-full rounded-xl border border-input-border bg-surface px-3 text-[16px] text-body-text outline-none focus:border-brand dark:text-ink";

/**
 * Edits one block: what it is, which subject (study blocks), a label, and the
 * exact times — the accessible fallback to dragging. Time edits are validated
 * against the other blocks of the day before they are applied.
 */
export function BlockEditor({ block, blocks, subjects, onChange, onDelete, onCopyDay, onClose }: Props) {
  const [start, setStart] = useState(toTime(block.startMin));
  const [end, setEnd] = useState(toTime(block.endMin));
  const [timeError, setTimeError] = useState<string | null>(null);
  const [label, setLabel] = useState(block.label ?? "");

  const meta = ACTIVITY_META[block.activityType];
  const showSubject = SUBJECT_ACTIVITIES.includes(block.activityType);

  function applyTimes(nextStart: string, nextEnd: string) {
    setStart(nextStart);
    setEnd(nextEnd);
    if (!nextStart || !nextEnd) return;
    const s = parseTime(nextStart);
    const e = nextEnd === "00:00" ? 1440 : parseTime(nextEnd);
    if (s % 5 !== 0 || e % 5 !== 0) return setTimeError("Use whole 5-minute times.");
    if (e - s < MIN_BLOCK_MINUTES) return setTimeError("A block must be at least 15 minutes, ending after it starts.");
    if (hasOverlap(blocks, block.dayOfWeek, s, e, block.key)) return setTimeError("That overlaps another block.");
    setTimeError(null);
    onChange({ ...block, startMin: s, endMin: e });
  }

  return (
    <Modal open onClose={onClose} ariaLabel={`Edit ${meta.label} block`}>
      <div className="flex flex-col gap-5">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[1.5px] text-cta">{DAY_LONG[block.dayOfWeek]}</p>
          <h2 className="mt-1 text-[22px] font-extrabold leading-tight text-ink">{meta.label}</h2>
          <p className="mt-1 text-[13px] text-muted">
            {formatDuration(block.endMin - block.startMin)} · {meta.hint}
          </p>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-[14px] font-semibold text-body-text dark:text-ink">What is it?</legend>
          <div className="flex flex-wrap gap-2">
            {ACTIVITY_ORDER.map((type: ActivityType) => {
              const m = ACTIVITY_META[type];
              const selected = block.activityType === type;
              return (
                <button
                  key={type}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onChange({ ...block, activityType: type, subjectId: SUBJECT_ACTIVITIES.includes(type) ? block.subjectId : null })}
                  className={`flex min-h-11 items-center gap-2 rounded-full border px-3.5 text-[14px] font-semibold transition-colors ${
                    selected ? "border-brand bg-tint-strong text-ink dark:border-[#FAF7F2]" : "border-brand/15 bg-surface text-body-text dark:text-ink"
                  }`}
                >
                  <span className="h-3 w-3 rounded-full" style={{ background: m.color }} aria-hidden />
                  {m.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 text-[14px] font-semibold text-body-text dark:text-ink">
            Starts
            <input type="time" step={300} value={start} onChange={(e) => applyTimes(e.target.value, end)} className={FIELD} />
          </label>
          <label className="flex flex-col gap-1.5 text-[14px] font-semibold text-body-text dark:text-ink">
            Ends
            <input type="time" step={300} value={end === "24:00" ? "00:00" : end} onChange={(e) => applyTimes(start, e.target.value)} className={FIELD} />
          </label>
          {timeError && (
            <p role="alert" className="col-span-2 rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">
              {timeError}
            </p>
          )}
        </div>

        {showSubject && (
          <label className="flex flex-col gap-1.5 text-[14px] font-semibold text-body-text dark:text-ink">
            Subject (optional)
            <select
              value={block.subjectId ?? ""}
              onChange={(e) => onChange({ ...block, subjectId: e.target.value ? Number(e.target.value) : null })}
              className={FIELD}
            >
              <option value="">Any subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <span className="text-[12px] font-normal text-muted">Prepex plans this subject&apos;s tasks into this block first.</span>
          </label>
        )}

        <label className="flex flex-col gap-1.5 text-[14px] font-semibold text-body-text dark:text-ink">
          Label (optional)
          <input
            type="text"
            maxLength={80}
            value={label}
            placeholder="e.g. Allen batch, Mock test"
            onChange={(e) => setLabel(e.target.value)}
            onBlur={() => onChange({ ...block, label: label.trim() ? label.trim() : null })}
            className={FIELD}
          />
        </label>

        <div className="flex flex-col gap-2 rounded-xl bg-tint-strong p-3 dark:bg-[#FAF7F214]">
          <p className="text-[13px] font-semibold text-body-text dark:text-ink">Copy this whole day to</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onCopyDay([0, 1, 2, 3, 4].filter((d) => d !== block.dayOfWeek))}
              className="min-h-11 rounded-lg border border-brand/15 bg-surface px-3 text-[13px] font-semibold text-body-text dark:text-ink"
            >
              Other weekdays
            </button>
            <button
              type="button"
              onClick={() => onCopyDay(Array.from({ length: DAY_COUNT }, (_, d) => d).filter((d) => d !== block.dayOfWeek))}
              className="min-h-11 rounded-lg border border-brand/15 bg-surface px-3 text-[13px] font-semibold text-body-text dark:text-ink"
            >
              Every day
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onDelete}
            className="min-h-12 flex-1 rounded-lg border border-[#F59E0B] bg-surface px-4 text-[15px] font-semibold text-[#B45309] hover:bg-[#F59E0B]/15 dark:text-[#F59E0B]"
          >
            Delete block
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={timeError !== null}
            className="min-h-12 flex-1 rounded-lg bg-cta px-4 text-[15px] font-semibold text-white hover:bg-[#E8623F] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
}
