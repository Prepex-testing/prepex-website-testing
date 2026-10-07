"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { BlockEditor } from "@/components/timetable/BlockEditor";
import { useMediaQuery } from "@/components/timetable/useMediaQuery";
import { ACTIVITY_META, ACTIVITY_ORDER } from "@/lib/timetable/activities";
import { TEMPLATE_OPTIONS, buildTemplate, type TemplateId } from "@/lib/timetable/templates";
import {
  DAY_COUNT,
  DAY_LONG,
  DAY_MINUTES,
  DAY_SHORT,
  DEFAULT_DROP_MINUTES,
  SLOT_MINUTES,
  addBlock,
  blocksOnDay,
  clamp,
  copyDay,
  formatDuration,
  formatRange,
  moveBlock,
  removeBlock,
  resizeBlock,
  resizeBlockStart,
  snap,
  studyMinutes,
  type GridBlock,
} from "@/lib/timetable/grid";
import type { ActivityType } from "@/lib/api/timetable";

/** One hour is 56px tall — comfortably above the 44px minimum tap target. */
const PX_PER_HOUR = 56;
const PX_PER_MIN = PX_PER_HOUR / 60;
const GRID_HEIGHT = 24 * PX_PER_HOUR;
const DRAG_THRESHOLD_PX = 6;
const GUTTER_PX = 44;

type Subject = { id: number; name: string };

type Props = {
  initialBlocks: GridBlock[];
  subjects: Subject[];
  saving?: boolean;
  saveLabel?: string;
  error?: string | null;
  onSave: (blocks: GridBlock[]) => void | Promise<void>;
  /** When set, shows "Import from your uploaded schedule"; resolves to the blocks to load. */
  onImport?: () => Promise<GridBlock[]>;
  secondaryAction?: { label: string; onClick: () => void };
};

type Paint = { day: number; anchor: number; current: number };
type MovePreview = { key: string; day: number; start: number };
type ChipDrag = { type: ActivityType; x: number; y: number };

export function TimetableBuilder({ initialBlocks, subjects, saving = false, saveLabel = "Save timetable", error, onSave, onImport, secondaryAction }: Props) {
  const [blocks, setBlocks] = useState<GridBlock[]>(initialBlocks);
  const [tool, setTool] = useState<ActivityType | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [paint, setPaint] = useState<Paint | null>(null);
  const [movePreview, setMovePreview] = useState<MovePreview | null>(null);
  const [chipDrag, setChipDrag] = useState<ChipDrag | null>(null);
  const [dropTarget, setDropTarget] = useState<{ day: number; min: number } | null>(null);

  const isWide = useMediaQuery("(min-width: 768px)");
  const visibleDays = useMemo(() => (isWide ? Array.from({ length: DAY_COUNT }, (_, d) => d) : [selectedDay]), [isWide, selectedDay]);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const columnRefs = useRef(new Map<number, HTMLDivElement>());
  const blocksRef = useRef(blocks);
  const gesture = useRef<
    | { kind: "move"; key: string; startX: number; startY: number; origDay: number; origStart: number; moved: boolean }
    | { kind: "resize-end" | "resize-start"; key: string }
    | { kind: "chip"; type: ActivityType; startX: number; startY: number; moved: boolean }
    | null
  >(null);

  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  // Open the grid at 6 AM rather than midnight.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 6 * PX_PER_HOUR - 8 });
  }, []);

  // Auto-clear transient notices.
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  const minuteAt = useCallback((day: number, clientY: number): number => {
    const el = columnRefs.current.get(day);
    if (!el) return 0;
    return clamp((clientY - el.getBoundingClientRect().top) / PX_PER_MIN, 0, DAY_MINUTES);
  }, []);

  const columnAt = useCallback((clientX: number, clientY: number): number | null => {
    const hit = document.elementFromPoint(clientX, clientY)?.closest<HTMLElement>("[data-day-col]");
    return hit ? Number(hit.dataset.dayCol) : null;
  }, []);

  const applyResult = useCallback((result: { blocks: GridBlock[]; error?: string }) => {
    if (result.error) setNotice(result.error);
    else setBlocks(result.blocks);
  }, []);

  // --- painting on empty grid space --------------------------------------

  function onColumnPointerDown(day: number, e: ReactPointerEvent<HTMLDivElement>) {
    if (!tool || (e.target as HTMLElement).closest("[data-block]")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const min = snap(minuteAt(day, e.clientY));
    setPaint({ day, anchor: min, current: min });
  }

  function onColumnPointerMove(day: number, e: ReactPointerEvent<HTMLDivElement>) {
    if (!paint || paint.day !== day) return;
    setPaint({ ...paint, current: minuteAt(day, e.clientY) });
  }

  function onColumnPointerUp(day: number, e: ReactPointerEvent<HTMLDivElement>) {
    if (!paint || paint.day !== day || !tool) return;
    const end = minuteAt(day, e.clientY);
    const moved = Math.abs(end - paint.anchor) >= SLOT_MINUTES;
    applyResult(addBlock(blocksRef.current, { dayOfWeek: day, startMin: paint.anchor, endMin: moved ? end : undefined, activityType: tool }));
    setPaint(null);
  }

  const paintPreview = useMemo(() => {
    if (!paint || !tool) return null;
    const moved = Math.abs(paint.current - paint.anchor) >= SLOT_MINUTES;
    const r = addBlock(blocks, { dayOfWeek: paint.day, startMin: paint.anchor, endMin: moved ? paint.current : undefined, activityType: tool });
    return r.block ?? null;
  }, [paint, tool, blocks]);

  // --- moving & resizing blocks ------------------------------------------

  function onBlockPointerDown(block: GridBlock, e: ReactPointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    gesture.current = { kind: "move", key: block.key, startX: e.clientX, startY: e.clientY, origDay: block.dayOfWeek, origStart: block.startMin, moved: false };
  }

  function onBlockPointerMove(block: GridBlock, e: ReactPointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g || g.kind !== "move" || g.key !== block.key) return;
    if (!g.moved && Math.hypot(e.clientX - g.startX, e.clientY - g.startY) < DRAG_THRESHOLD_PX) return;
    g.moved = true;
    const day = isWide ? (columnAt(e.clientX, e.clientY) ?? g.origDay) : g.origDay;
    const delta = (e.clientY - g.startY) / PX_PER_MIN;
    const length = block.endMin - block.startMin;
    setMovePreview({ key: block.key, day, start: clamp(snap(g.origStart + delta), 0, DAY_MINUTES - length) });
  }

  function onBlockPointerUp(block: GridBlock) {
    const g = gesture.current;
    gesture.current = null;
    if (!g || g.kind !== "move" || g.key !== block.key) return;
    if (!g.moved) {
      setEditingKey(block.key);
      return;
    }
    if (movePreview) applyResult(moveBlock(blocksRef.current, block.key, movePreview.day, movePreview.start));
    setMovePreview(null);
  }

  function onHandlePointerDown(kind: "resize-end" | "resize-start", block: GridBlock, e: ReactPointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    gesture.current = { kind, key: block.key };
  }

  function onHandlePointerMove(block: GridBlock, e: ReactPointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g || (g.kind !== "resize-end" && g.kind !== "resize-start") || g.key !== block.key) return;
    const minute = minuteAt(block.dayOfWeek, e.clientY);
    const result = g.kind === "resize-end" ? resizeBlock(blocksRef.current, block.key, minute) : resizeBlockStart(blocksRef.current, block.key, minute);
    setBlocks(result.blocks);
  }

  function onHandlePointerUp() {
    gesture.current = null;
  }

  function onBlockKeyDown(block: GridBlock, e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setEditingKey(block.key);
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      setBlocks((b) => removeBlock(b, block.key));
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? SLOT_MINUTES : -SLOT_MINUTES;
      applyResult(e.altKey ? resizeBlock(blocks, block.key, block.endMin + step) : moveBlock(blocks, block.key, block.dayOfWeek, block.startMin + step));
    }
  }

  // --- dragging an activity chip onto the grid ---------------------------

  function onChipPointerDown(type: ActivityType, e: ReactPointerEvent<HTMLButtonElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    gesture.current = { kind: "chip", type, startX: e.clientX, startY: e.clientY, moved: false };
  }

  function onChipPointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
    const g = gesture.current;
    if (!g || g.kind !== "chip") return;
    if (!g.moved && Math.hypot(e.clientX - g.startX, e.clientY - g.startY) < DRAG_THRESHOLD_PX) return;
    g.moved = true;
    setChipDrag({ type: g.type, x: e.clientX, y: e.clientY });
    const day = columnAt(e.clientX, e.clientY);
    setDropTarget(day === null ? null : { day, min: snap(minuteAt(day, e.clientY)) });
  }

  function onChipPointerUp(type: ActivityType, e: ReactPointerEvent<HTMLButtonElement>) {
    const g = gesture.current;
    gesture.current = null;
    if (g?.kind !== "chip") return;
    if (!g.moved) {
      setTool((current) => (current === type ? null : type)); // a tap arms / disarms
      return;
    }
    const day = columnAt(e.clientX, e.clientY);
    if (day !== null) {
      applyResult(addBlock(blocksRef.current, { dayOfWeek: day, startMin: snap(minuteAt(day, e.clientY)), activityType: type }));
    }
    setChipDrag(null);
    setDropTarget(null);
  }

  // --- toolbar actions ---------------------------------------------------

  function applyTemplate(id: TemplateId) {
    if (blocks.length > 0 && !window.confirm("Replace your current timetable with this template?")) return;
    setBlocks(buildTemplate(id));
    setNotice("Template applied — now adjust it to your real week.");
  }

  async function handleImport() {
    if (!onImport) return;
    setImporting(true);
    try {
      const imported = await onImport();
      if (blocks.length > 0 && !window.confirm("Replace your current timetable with your uploaded schedule?")) return;
      setBlocks(imported);
      setNotice("Imported your coaching schedule — add the rest of your day.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Couldn't import that schedule.");
    } finally {
      setImporting(false);
    }
  }

  const editing = editingKey ? blocks.find((b) => b.key === editingKey) ?? null : null;
  const weeklyStudy = studyMinutes(blocks);
  const hasStudyTime = weeklyStudy > 0;

  return (
    <div className="flex flex-col gap-5" data-testid="timetable-builder">
      {/* Starter templates ------------------------------------------------- */}
      <section aria-label="Starter templates" className="flex flex-col gap-2">
        <p className="text-[14px] font-bold text-body-text dark:text-ink">Start from a template</p>
        <div className="flex flex-wrap gap-2">
          {TEMPLATE_OPTIONS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => applyTemplate(t.id)}
              data-testid={`template-${t.id}`}
              title={t.description}
              className="min-h-11 rounded-full border border-brand/20 bg-surface px-4 text-[14px] font-semibold text-ink transition-colors hover:border-cta hover:bg-tint"
            >
              {t.label}
            </button>
          ))}
          {onImport && (
            <button
              type="button"
              onClick={handleImport}
              disabled={importing}
              data-testid="import-ocr"
              className="min-h-11 rounded-full border border-dashed border-cta bg-surface px-4 text-[14px] font-semibold text-cta disabled:opacity-60"
            >
              {importing ? "Importing…" : "Import from your uploaded schedule"}
            </button>
          )}
          {blocks.length > 0 && (
            <button
              type="button"
              onClick={() => window.confirm("Clear the whole timetable?") && setBlocks([])}
              className="min-h-11 rounded-full px-3 text-[13px] font-semibold text-muted underline-offset-2 hover:underline"
            >
              Clear all
            </button>
          )}
        </div>
      </section>

      {/* Activity palette ---------------------------------------------------- */}
      <section aria-label="Activities" className="flex flex-col gap-2">
        <p className="text-[14px] font-bold text-body-text dark:text-ink">
          {tool ? `Drag on the grid to add “${ACTIVITY_META[tool].label}”` : "Pick an activity, then drag on the grid — or drag it onto a day"}
        </p>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="toolbar" aria-label="Activity palette">
          {ACTIVITY_ORDER.map((type) => {
            const m = ACTIVITY_META[type];
            const armed = tool === type;
            return (
              <button
                key={type}
                type="button"
                data-testid={`chip-${type}`}
                aria-pressed={armed}
                onPointerDown={(e) => onChipPointerDown(type, e)}
                onPointerMove={onChipPointerMove}
                onPointerUp={(e) => onChipPointerUp(type, e)}
                onPointerCancel={() => {
                  gesture.current = null;
                  setChipDrag(null);
                  setDropTarget(null);
                }}
                style={{ touchAction: "pan-x" }}
                className={`flex min-h-11 shrink-0 select-none items-center gap-2 rounded-full border px-3.5 text-[14px] font-semibold transition-colors ${
                  armed ? "border-brand bg-tint-strong text-ink shadow-hover dark:border-[#FAF7F2]" : "border-brand/15 bg-surface text-body-text dark:text-ink"
                }`}
              >
                <span className="h-3 w-3 rounded-full" style={{ background: m.color }} aria-hidden />
                {m.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Day tabs (phone) --------------------------------------------------- */}
      {!isWide && (
        <div role="tablist" aria-label="Day of week" className="grid grid-cols-7 gap-1">
          {DAY_SHORT.map((d, i) => {
            const active = i === selectedDay;
            const has = blocksOnDay(blocks, i).length > 0;
            return (
              <button
                key={d}
                type="button"
                role="tab"
                aria-selected={active}
                data-testid={`day-tab-${i}`}
                onClick={() => setSelectedDay(i)}
                className={`relative min-h-11 rounded-lg text-[13px] font-bold transition-colors ${active ? "bg-brand text-white dark:bg-[#FAF7F2] dark:text-[#0D0D2B]" : "bg-tint-strong text-ink dark:bg-[#FAF7F214]"}`}
              >
                {d}
                {has && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-cta" aria-hidden />}
              </button>
            );
          })}
        </div>
      )}

      {notice && (
        <p role="status" className="rounded-lg bg-tint-strong px-3 py-2 text-[13px] font-medium text-ink dark:bg-[#FAF7F214]">
          {notice}
        </p>
      )}

      {/* The grid ------------------------------------------------------------ */}
      <div ref={scrollRef} className="relative max-h-[62vh] overflow-y-auto rounded-xl border border-brand/10 bg-surface" data-testid="timetable-scroll">
        {isWide && (
          <div className="sticky top-0 z-20 flex border-b border-brand/10 bg-surface" style={{ paddingLeft: GUTTER_PX }}>
            {visibleDays.map((d) => (
              <div key={d} className="flex-1 py-2 text-center text-[13px] font-bold text-ink">
                {DAY_SHORT[d]}
              </div>
            ))}
          </div>
        )}
        <div className="flex" style={{ height: GRID_HEIGHT }}>
          <div className="relative shrink-0 border-r border-brand/10 text-right text-[10px] font-medium text-muted" style={{ width: GUTTER_PX }} aria-hidden>
            {Array.from({ length: 24 }, (_, h) => (
              <span key={h} className="absolute right-1.5 -translate-y-1/2" style={{ top: h * PX_PER_HOUR, display: h === 0 ? "none" : undefined }}>
                {h === 12 ? "12 PM" : h < 12 ? `${h} AM` : `${h - 12} PM`}
              </span>
            ))}
          </div>

          {visibleDays.map((day) => {
            const dayBlocks = blocksOnDay(blocks, day);
            return (
              <div
                key={day}
                ref={(el) => {
                  if (el) columnRefs.current.set(day, el);
                  else columnRefs.current.delete(day);
                }}
                data-day-col={day}
                data-testid={`day-col-${day}`}
                aria-label={`${DAY_LONG[day]} timetable`}
                onPointerDown={(e) => onColumnPointerDown(day, e)}
                onPointerMove={(e) => onColumnPointerMove(day, e)}
                onPointerUp={(e) => onColumnPointerUp(day, e)}
                onPointerCancel={() => setPaint(null)}
                className={`relative flex-1 border-r border-brand/10 last:border-r-0 ${tool ? "cursor-crosshair" : ""}`}
                style={{
                  touchAction: tool ? "none" : "pan-y",
                  backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${PX_PER_HOUR - 1}px, rgb(26 26 78 / 0.08) ${PX_PER_HOUR - 1}px, rgb(26 26 78 / 0.08) ${PX_PER_HOUR}px)`,
                }}
              >
                {dayBlocks.map((b) => {
                  const dragging = movePreview?.key === b.key;
                  const meta = ACTIVITY_META[b.activityType];
                  const height = (b.endMin - b.startMin) * PX_PER_MIN;
                  const subject = b.subjectId !== null ? subjects.find((s) => s.id === b.subjectId)?.name : null;
                  return (
                    <div
                      key={b.key}
                      role="button"
                      tabIndex={0}
                      data-block={b.key}
                      data-testid="tt-block"
                      data-activity={b.activityType}
                      aria-label={`${meta.label}${subject ? `, ${subject}` : ""}, ${DAY_LONG[b.dayOfWeek]} ${formatRange(b.startMin, b.endMin)}. Press Enter to edit, arrow keys to move.`}
                      onPointerDown={(e) => onBlockPointerDown(b, e)}
                      onPointerMove={(e) => onBlockPointerMove(b, e)}
                      onPointerUp={() => onBlockPointerUp(b)}
                      onPointerCancel={() => {
                        gesture.current = null;
                        setMovePreview(null);
                      }}
                      onKeyDown={(e) => onBlockKeyDown(b, e)}
                      className={`group absolute inset-x-0.5 cursor-grab select-none overflow-hidden rounded-md px-1.5 py-0.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${dragging ? "opacity-40" : ""}`}
                      style={{
                        top: b.startMin * PX_PER_MIN,
                        height: Math.max(height - 1, 14),
                        touchAction: "none",
                        background: `${meta.color}26`,
                        borderLeft: `4px solid ${meta.color}`,
                      }}
                    >
                      <p className="truncate text-[11px] font-bold leading-tight text-ink">
                        {meta.label}
                        {b.label ? ` · ${b.label}` : ""}
                      </p>
                      {height >= 40 && (
                        <p className="truncate text-[10px] leading-tight text-body-text dark:text-ink/80">
                          {formatRange(b.startMin, b.endMin)}
                          {subject ? ` · ${subject}` : ""}
                        </p>
                      )}
                      {/* resize handles — large invisible hit areas, a visible grip on hover/focus */}
                      <div
                        data-testid="tt-handle-start"
                        onPointerDown={(e) => onHandlePointerDown("resize-start", b, e)}
                        onPointerMove={(e) => onHandlePointerMove(b, e)}
                        onPointerUp={onHandlePointerUp}
                        className="absolute inset-x-0 top-0 h-2 cursor-ns-resize"
                        style={{ touchAction: "none" }}
                      />
                      <div
                        data-testid="tt-handle-end"
                        onPointerDown={(e) => onHandlePointerDown("resize-end", b, e)}
                        onPointerMove={(e) => onHandlePointerMove(b, e)}
                        onPointerUp={onHandlePointerUp}
                        className="absolute inset-x-0 bottom-0 flex h-3 cursor-ns-resize items-end justify-center"
                        style={{ touchAction: "none" }}
                      >
                        <span className="mb-0.5 h-0.5 w-6 rounded-full bg-ink/30 group-hover:bg-ink/60" />
                      </div>
                    </div>
                  );
                })}

                {/* live previews */}
                {paintPreview && paint?.day === day && tool && (
                  <div
                    className="pointer-events-none absolute inset-x-0.5 rounded-md border-2 border-dashed"
                    style={{
                      top: paintPreview.startMin * PX_PER_MIN,
                      height: (paintPreview.endMin - paintPreview.startMin) * PX_PER_MIN,
                      borderColor: ACTIVITY_META[tool].color,
                      background: `${ACTIVITY_META[tool].color}33`,
                    }}
                  />
                )}
                {movePreview?.day === day && (() => {
                  const b = blocks.find((x) => x.key === movePreview.key);
                  if (!b) return null;
                  const color = ACTIVITY_META[b.activityType].color;
                  return (
                    <div
                      className="pointer-events-none absolute inset-x-0.5 rounded-md border-2 border-dashed"
                      style={{
                        top: movePreview.start * PX_PER_MIN,
                        height: (b.endMin - b.startMin) * PX_PER_MIN,
                        borderColor: color,
                        background: `${color}33`,
                      }}
                    />
                  );
                })()}
                {dropTarget?.day === day && chipDrag && (
                  <div
                    className="pointer-events-none absolute inset-x-0.5 rounded-md border-2 border-dashed"
                    style={{
                      top: dropTarget.min * PX_PER_MIN,
                      height: DEFAULT_DROP_MINUTES * PX_PER_MIN,
                      borderColor: ACTIVITY_META[chipDrag.type].color,
                      background: `${ACTIVITY_META[chipDrag.type].color}33`,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* floating chip while dragging from the palette */}
      {chipDrag && (
        <div
          className="pointer-events-none fixed z-[60] -translate-x-1/2 -translate-y-1/2 rounded-full border border-brand bg-surface px-3 py-1.5 text-[13px] font-bold text-ink shadow-modal"
          style={{ left: chipDrag.x, top: chipDrag.y }}
        >
          {ACTIVITY_META[chipDrag.type].label}
        </div>
      )}

      {/* Summary + save ------------------------------------------------------ */}
      <div className="flex flex-col gap-3 rounded-xl bg-tint-strong p-4 dark:bg-[#FAF7F214]">
        <p className="text-[14px] font-semibold text-ink" data-testid="study-summary">
          {hasStudyTime
            ? `Self-study time: ${formatDuration(weeklyStudy)} a week (about ${formatDuration(Math.round(weeklyStudy / DAY_COUNT))} a day)`
            : "Add some self-study, practice or revision blocks — that is where Prepex plans your tasks."}
        </p>
        {error && (
          <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">
            {error}
          </p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            data-testid="save-timetable"
            disabled={saving || blocks.length === 0}
            onClick={() => void onSave(blocks)}
            className="min-h-14 flex-1 rounded-lg border border-primary-button-border bg-cta px-4 text-base font-semibold text-white transition-colors hover:bg-[#E8623F] disabled:cursor-not-allowed disabled:border-primary-button-disabled-bg disabled:bg-primary-button-disabled-bg disabled:text-primary-button-disabled-text"
          >
            {saving ? "Saving…" : saveLabel}
          </button>
          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              disabled={saving}
              className="min-h-14 rounded-lg border-[1.5px] border-secondary-button-border bg-surface px-5 text-base font-semibold text-body-text hover:bg-tint-strong disabled:opacity-60"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      </div>

      {editing && (
        <BlockEditor
          block={editing}
          blocks={blocks}
          subjects={subjects}
          onChange={(next) => setBlocks((all) => all.map((b) => (b.key === next.key ? next : b)))}
          onDelete={() => {
            setBlocks((all) => removeBlock(all, editing.key));
            setEditingKey(null);
          }}
          onCopyDay={(toDays) => {
            setBlocks((all) => copyDay(all, editing.dayOfWeek, toDays));
            setNotice(`Copied ${DAY_LONG[editing.dayOfWeek]} to ${toDays.length} other day${toDays.length === 1 ? "" : "s"}.`);
            setEditingKey(null);
          }}
          onClose={() => setEditingKey(null)}
        />
      )}
    </div>
  );
}

