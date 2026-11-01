"use client";

import { getStroke } from "perfect-freehand";
import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Stroke } from "@/lib/api/notebooks";

/** Handwriting is stored as stroke data on a fixed logical page width, so it stays sharp at any size and prints cleanly. */
export const INK_WIDTH = 800;

export type InkTool = "pen" | "highlighter" | "eraser" | "hand";
export const INK_COLORS = ["auto", "#2563EB", "#DC2626", "#16A34A", "#FACC15"] as const;
export const AUTO = "auto";

/** perfect-freehand outline -> an SVG path. */
function pathFor(points: [number, number, number][], size: number, highlighter: boolean): string {
  const outline = getStroke(points, { size, thinning: highlighter ? 0 : 0.55, smoothing: 0.5, streamline: 0.45, simulatePressure: false, last: true });
  if (outline.length < 2) return "";
  const d = outline.reduce<string[]>((acc, [x0, y0], i, arr) => {
    const [x1, y1] = arr[(i + 1) % arr.length]!;
    acc.push(`${x0!.toFixed(1)},${y0!.toFixed(1)} ${((x0! + x1!) / 2).toFixed(1)},${((y0! + y1!) / 2).toFixed(1)}`);
    return acc;
  }, []);
  return `M ${outline[0]![0]!.toFixed(1)},${outline[0]![1]!.toFixed(1)} Q ${d.join(" ")} Z`;
}

function nearStroke(s: Stroke, x: number, y: number, r: number): boolean {
  for (const [px, py] of s.points) if ((px - x) ** 2 + (py - y) ** 2 <= r * r) return true;
  return false;
}

type Props = {
  strokes: Stroke[];
  /** Logical height at INK_WIDTH wide. */
  height: number;
  onChange?: (next: Stroke[]) => void;
  tool?: InkTool;
  color?: string;
  size?: number;
  readOnly?: boolean;
  /** A photo under the handwriting. */
  background?: string | null;
  testId?: string;
};

/**
 * A page-wide drawing surface. Works with Apple Pencil, a stylus, a finger or a mouse (pointer events, with pressure where the
 * device has it). While no drawing tool is chosen the surface lets the page scroll, so a finger never draws by accident.
 */
export function InkLayer({ strokes, height, onChange, tool = "hand", color = AUTO, size = 3, readOnly = false, background = null, testId }: Props) {
  const svg = useRef<SVGSVGElement>(null);
  const drawing = useRef<Stroke | null>(null);
  const [live, setLive] = useState<Stroke | null>(null);
  const active = !readOnly && tool !== "hand";

  const at = (e: ReactPointerEvent): [number, number, number] => {
    const rect = svg.current!.getBoundingClientRect();
    return [((e.clientX - rect.left) * INK_WIDTH) / rect.width, ((e.clientY - rect.top) * height) / rect.height, e.pressure > 0 ? e.pressure : 0.5];
  };

  function down(e: ReactPointerEvent) {
    if (!active) return;
    e.preventDefault();
    svg.current?.setPointerCapture(e.pointerId);
    const p = at(e);
    if (tool === "eraser") {
      onChange?.(strokes.filter((s) => !nearStroke(s, p[0], p[1], 14)));
      drawing.current = { tool: "pen", color, width: size, points: [] };
      return;
    }
    drawing.current = { tool: tool === "highlighter" ? "highlighter" : "pen", color, width: tool === "highlighter" ? Math.max(14, size * 4) : size, points: [p] };
    setLive(drawing.current);
  }

  function move(e: ReactPointerEvent) {
    const cur = drawing.current;
    if (!cur || !active) return;
    const events = typeof e.nativeEvent.getCoalescedEvents === "function" ? e.nativeEvent.getCoalescedEvents() : [];
    const list = events.length > 0 ? events : [e.nativeEvent];
    if (tool === "eraser") {
      let next = strokes;
      for (const ev of list) {
        const rect = svg.current!.getBoundingClientRect();
        const x = ((ev.clientX - rect.left) * INK_WIDTH) / rect.width;
        const y = ((ev.clientY - rect.top) * height) / rect.height;
        next = next.filter((s) => !nearStroke(s, x, y, 14));
      }
      if (next.length !== strokes.length) onChange?.(next);
      return;
    }
    const rect = svg.current!.getBoundingClientRect();
    for (const ev of list) cur.points.push([((ev.clientX - rect.left) * INK_WIDTH) / rect.width, ((ev.clientY - rect.top) * height) / rect.height, ev.pressure > 0 ? ev.pressure : 0.5]);
    setLive({ ...cur, points: [...cur.points] });
  }

  function up() {
    const cur = drawing.current;
    drawing.current = null;
    setLive(null);
    if (!cur || tool === "eraser" || cur.points.length === 0) return;
    // a tap leaves a dot
    const stroke: Stroke = cur.points.length === 1 ? { ...cur, points: [cur.points[0]!, [cur.points[0]![0] + 0.1, cur.points[0]![1] + 0.1, cur.points[0]![2]]] } : cur;
    onChange?.([...strokes, stroke]);
  }

  const all = live ? [...strokes, live] : strokes;
  return (
    <div className="relative w-full overflow-hidden rounded-xl" style={{ aspectRatio: `${INK_WIDTH} / ${height}` }} data-testid={testId}>
      {background && (
        // eslint-disable-next-line @next/next/no-img-element -- a private, signed file link
        <img src={background} alt="" className="absolute inset-0 size-full select-none object-fill" draggable={false} />
      )}
      <svg
        ref={svg}
        viewBox={`0 0 ${INK_WIDTH} ${height}`}
        className="absolute inset-0 size-full text-ink"
        style={{ touchAction: active ? "none" : "pan-y", cursor: active ? (tool === "eraser" ? "cell" : "crosshair") : "default" }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        role="img"
        aria-label={all.length > 0 ? `Handwriting, ${all.length} strokes` : "Empty drawing area"}
      >
        {all.map((s, i) => (
          <path key={i} d={pathFor(s.points, s.width, s.tool === "highlighter")} fill={s.color === AUTO ? "currentColor" : s.color} opacity={s.tool === "highlighter" ? 0.35 : 1} />
        ))}
      </svg>
    </div>
  );
}
