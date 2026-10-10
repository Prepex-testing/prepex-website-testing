import type { ShareCard } from "@/lib/api/practiceLogs";
import { formatMinutes } from "@/lib/study/format";
import { labelOf, PRACTICE_SOURCES } from "@/lib/logs/labels";

/**
 * The shareable practice card: a 9:16 (1080 × 1920) Instagram-story image.
 * The layout is plain data (so it can be tested without a canvas); `drawShareCard` paints it.
 */

export const CARD_W = 1080;
export const CARD_H = 1920;

const BAND_COLOR = { red: "#EF4444", yellow: "#F59E0B", green: "#10B981" } as const;
const NEUTRAL_COLOR = "#A5B4FC";
const INK = "#1A1A4E";
const DEEP = "#0E0E2C";
const CREAM = "#FAF7F2";
const MUTED = "#C9C7E0";

export interface TextItem {
  text: string;
  x: number;
  y: number;
  size: number;
  weight: 400 | 600 | 800;
  color: string;
  align: "left" | "center" | "right";
}

export interface CardLayout {
  width: number;
  height: number;
  gradient: [string, string];
  ring: { cx: number; cy: number; radius: number; thickness: number; fraction: number; color: string };
  texts: TextItem[];
}

/** Greedy word wrap into at most `maxLines` lines, the last one ellipsised if the text does not fit. */
export function wrapText(measure: (s: string) => number, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (let i = 0; i < words.length; i++) {
    const word = words[i]!;
    const next = current ? `${current} ${word}` : word;
    if (measure(next) <= maxWidth || !current) {
      current = next;
    } else {
      lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) {
        current = words.slice(i).join(" ");
        break;
      }
    }
  }
  if (current) lines.push(current);
  const last = lines.length - 1;
  if (last >= 0 && measure(lines[last]!) > maxWidth) {
    let t = lines[last]!;
    while (t.length > 1 && measure(`${t}…`) > maxWidth) t = t.slice(0, -1);
    lines[last] = `${t}…`;
  }
  return lines.slice(0, maxLines);
}

export function sourceLabel(source: string): string {
  return labelOf(PRACTICE_SOURCES, source as never, source);
}

export function layoutShareCard(card: ShareCard, measure: (s: string, size: number, weight: number) => number): CardLayout {
  const cx = CARD_W / 2;
  const accent = card.band ? BAND_COLOR[card.band] : NEUTRAL_COLOR;
  const texts: TextItem[] = [];
  const add = (t: Omit<TextItem, "color" | "align" | "weight"> & Partial<Pick<TextItem, "color" | "align" | "weight">>) =>
    texts.push({ color: CREAM, align: "center", weight: 600, ...t });

  add({ text: "PREPEX", x: cx, y: 150, size: 44, weight: 800, color: MUTED });
  add({ text: card.periodLabel.toUpperCase(), x: cx, y: 250, size: 36, weight: 600, color: accent });

  const headline = wrapText((s) => measure(s, 76, 800), card.headline, CARD_W - 180, 2);
  headline.forEach((line, i) => add({ text: line, x: cx, y: 370 + i * 92, size: 76, weight: 800 }));

  const ringY = 960;
  const ring = { cx, cy: ringY, radius: 300, thickness: 54, fraction: card.accuracy === null ? 0 : Math.min(1, Math.max(0, card.accuracy / 100)), color: accent };

  if (card.hasData) {
    add({ text: card.accuracy === null ? "—" : `${Number.isInteger(card.accuracy) ? card.accuracy : card.accuracy.toFixed(1)}%`, x: cx, y: ringY + 40, size: 190, weight: 800 });
    add({ text: "accuracy", x: cx, y: ringY + 120, size: 44, color: MUTED });
    add({ text: `${card.correct} / ${card.questions} questions correct`, x: cx, y: ringY + 440, size: 54, weight: 800 });
    add({ text: `${card.sessions} session${card.sessions === 1 ? "" : "s"} · ${formatMinutes(card.minutes)} · ${card.activeDays} day${card.activeDays === 1 ? "" : "s"}`, x: cx, y: ringY + 520, size: 40, color: MUTED });
    let y = ringY + 640;
    if (card.strongestChapter?.chapterName) {
      add({ text: `Strongest · ${wrapText((s) => measure(s, 42, 600), card.strongestChapter.chapterName, CARD_W - 360, 1)[0]!} ${Math.round(card.strongestChapter.accuracy)}%`, x: cx, y, size: 42 });
      y += 76;
    }
    if (card.weakestChapter?.chapterName) {
      add({ text: `Needs work · ${wrapText((s) => measure(s, 42, 600), card.weakestChapter.chapterName, CARD_W - 400, 1)[0]!} ${Math.round(card.weakestChapter.accuracy)}%`, x: cx, y, size: 42 });
      y += 76;
    }
    if (card.topSource) add({ text: `Mostly ${sourceLabel(card.topSource.source)}`, x: cx, y, size: 40, color: MUTED });
  } else {
    add({ text: "No practice logged yet", x: cx, y: ringY + 20, size: 54, weight: 800 });
    add({ text: "Log a session to fill this in", x: cx, y: ringY + 100, size: 40, color: MUTED });
  }

  add({ text: "Tracked with Prepex", x: cx, y: CARD_H - 120, size: 38, color: MUTED });
  return { width: CARD_W, height: CARD_H, gradient: [INK, DEEP], ring, texts };
}

/** Paints a layout onto a 1080 × 1920 canvas context. */
export function drawShareCard(ctx: CanvasRenderingContext2D, layout: CardLayout): void {
  const grad = ctx.createLinearGradient(0, 0, 0, layout.height);
  grad.addColorStop(0, layout.gradient[0]);
  grad.addColorStop(1, layout.gradient[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, layout.width, layout.height);

  const { cx, cy, radius, thickness, fraction, color } = layout.ring;
  ctx.lineWidth = thickness;
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(250,247,242,0.14)";
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  if (fraction > 0) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fraction);
    ctx.stroke();
  }

  for (const t of layout.texts) {
    ctx.font = `${t.weight} ${t.size}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
    ctx.fillStyle = t.color;
    ctx.textAlign = t.align;
    ctx.textBaseline = "alphabetic";
    ctx.fillText(t.text, t.x, t.y);
  }
}

export function makeMeasure(ctx: CanvasRenderingContext2D) {
  return (s: string, size: number, weight: number) => {
    ctx.font = `${weight} ${size}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
    return ctx.measureText(s).width;
  };
}

/** Renders the card to a PNG blob in the browser (null when the browser has no canvas). */
export async function renderShareCardBlob(card: ShareCard): Promise<Blob | null> {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  drawShareCard(ctx, layoutShareCard(card, makeMeasure(ctx)));
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

export function shareFileName(card: ShareCard): string {
  const slug = (card.scope.chapterName ?? card.scope.subjectName ?? "practice")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `prepex-${slug || "practice"}-${card.period}.png`;
}
