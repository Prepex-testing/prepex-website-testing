import type { MockShareCard } from "@/lib/api/mocks";
import { CARD_H, CARD_W, drawShareCard, makeMeasure, wrapText, type CardLayout, type TextItem } from "@/lib/logs/shareCard";
import { approxRank, labelOfPattern, labelOfType, signedPoints, SUBJECT_LABEL } from "@/lib/insights/mockMath";

/** The shareable mock-test card: the same 9:16 story image as the practice card, with the score in the ring. */

const INK = "#1A1A4E";
const DEEP = "#0E0E2C";
const CREAM = "#FAF7F2";
const MUTED = "#C9C7E0";
const GOOD = "#10B981";
const OK = "#F59E0B";
const LOW = "#EF4444";

export function scoreColor(percent: number): string {
  return percent >= 70 ? GOOD : percent >= 40 ? OK : LOW;
}

export function layoutMockCard(card: MockShareCard, measure: (s: string, size: number, weight: number) => number): CardLayout {
  const cx = CARD_W / 2;
  const accent = scoreColor(card.scorePercent);
  const texts: TextItem[] = [];
  const add = (t: Omit<TextItem, "color" | "align" | "weight"> & Partial<Pick<TextItem, "color" | "align" | "weight">>) =>
    texts.push({ color: CREAM, align: "center", weight: 600, ...t });

  add({ text: "PREPEX", x: cx, y: 150, size: 44, weight: 800, color: MUTED });
  add({ text: `${labelOfType(card.mock.testType)} · ${labelOfPattern(card.mock.examPattern)}`.toUpperCase(), x: cx, y: 250, size: 34, color: accent });

  const headline = wrapText((s) => measure(s, 76, 800), card.headline, CARD_W - 180, 2);
  headline.forEach((line, i) => add({ text: line, x: cx, y: 370 + i * 92, size: 76, weight: 800 }));

  const ringY = 960;
  const fraction = Math.min(1, Math.max(0, card.scorePercent / 100));
  add({ text: `${card.totalMarks}`, x: cx, y: ringY + 30, size: 200, weight: 800 });
  add({ text: `out of ${card.maxMarks}`, x: cx, y: ringY + 110, size: 44, color: MUTED });
  add({ text: `${card.scorePercent}%`, x: cx, y: ringY + 440, size: 64, weight: 800, color: accent });

  let y = ringY + 530;
  if (card.vsPrevious !== null) {
    add({ text: `${signedPoints(card.vsPrevious)} points vs your last ${labelOfPattern(card.mock.examPattern)} mock`, x: cx, y, size: 38, color: MUTED });
    y += 76;
  }
  const subjects = (Object.keys(SUBJECT_LABEL) as (keyof typeof SUBJECT_LABEL)[]).filter((s) => card.subjectMarks[s] !== null);
  if (subjects.length > 0) {
    add({ text: subjects.map((s) => `${SUBJECT_LABEL[s].slice(0, 4)} ${card.subjectMarks[s]}`).join("  ·  "), x: cx, y, size: 44, weight: 800 });
    y += 84;
  }
  if (card.percentile !== null) {
    add({ text: `${card.percentile} percentile`, x: cx, y, size: 50, weight: 800 });
    y += 70;
    add({ text: `projected rank ${approxRank(card.projectedRank)}`, x: cx, y, size: 38, color: MUTED });
    y += 76;
  }
  if (card.weakChapters.length > 0) {
    add({ text: `Next: ${wrapText((s) => measure(s, 40, 600), card.weakChapters.join(", "), CARD_W - 320, 1)[0]!}`, x: cx, y, size: 40 });
  }

  add({ text: "Tracked with Prepex", x: cx, y: CARD_H - 120, size: 38, color: MUTED });
  return { width: CARD_W, height: CARD_H, gradient: [INK, DEEP], ring: { cx, cy: ringY, radius: 300, thickness: 54, fraction, color: accent }, texts };
}

export async function renderMockCardBlob(card: MockShareCard): Promise<Blob | null> {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  drawShareCard(ctx, layoutMockCard(card, makeMeasure(ctx)));
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

export function mockCardFileName(card: MockShareCard): string {
  const slug = card.headline.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return `prepex-mock-${slug || "result"}-${card.mock.date}.png`;
}
