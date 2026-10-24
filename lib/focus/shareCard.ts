/**
 * The one-tap "share this session" card, drawn in the browser at Instagram-story size (1080 × 1920). Nothing is posted
 * anywhere on its own: the student taps Share, the device's share sheet opens (that is how it reaches Instagram), or the
 * picture is saved if the device cannot share files.
 */

export type ShareCardData = {
  minutes: number;
  subjectName: string;
  chapterName: string | null;
  taskTypeLabel: string;
  streakDays: number;
  /** "Goal hit: Physics 5h" and similar lines, shown under the headline. */
  highlights: string[];
};

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1920;

/** "1h 05m" / "45 min" — the card's headline number. */
export function cardDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m >= 60) return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
  return `${m} min`;
}

export function shareText(data: ShareCardData): string {
  const where = data.chapterName ? `${data.subjectName}: ${data.chapterName}` : data.subjectName;
  const streak = data.streakDays > 1 ? ` ${data.streakDays}-day streak.` : "";
  return `${cardDuration(data.minutes)} of ${data.taskTypeLabel.toLowerCase()} on ${where}.${streak} Studying with Prepex.`;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function buildShareCard(data: ShareCardData): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available.");

  const bg = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  bg.addColorStop(0, "#0D0D2B");
  bg.addColorStop(1, "#2B2B63");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  ctx.textAlign = "center";
  ctx.fillStyle = "#FF7A59";
  ctx.font = "700 46px system-ui, sans-serif";
  ctx.fillText("FOCUS SESSION DONE", CARD_WIDTH / 2, 420);

  ctx.fillStyle = "#FAF7F2";
  ctx.font = "800 190px system-ui, sans-serif";
  ctx.fillText(cardDuration(data.minutes), CARD_WIDTH / 2, 700);

  ctx.font = "600 64px system-ui, sans-serif";
  let y = 830;
  for (const line of wrap(ctx, data.subjectName + (data.chapterName ? ` · ${data.chapterName}` : ""), CARD_WIDTH - 200)) {
    ctx.fillText(line, CARD_WIDTH / 2, y);
    y += 80;
  }
  ctx.fillStyle = "#AEB0F0";
  ctx.font = "500 48px system-ui, sans-serif";
  ctx.fillText(data.taskTypeLabel, CARD_WIDTH / 2, y + 10);

  ctx.fillStyle = "#FAF7F2";
  ctx.font = "700 60px system-ui, sans-serif";
  y += 190;
  if (data.streakDays > 0) {
    ctx.fillText(`${data.streakDays}-day streak`, CARD_WIDTH / 2, y);
    y += 100;
  }
  ctx.fillStyle = "#FF7A59";
  ctx.font = "600 48px system-ui, sans-serif";
  for (const h of data.highlights.slice(0, 3)) {
    ctx.fillText(h, CARD_WIDTH / 2, y);
    y += 74;
  }

  ctx.fillStyle = "#8B8998";
  ctx.font = "600 44px system-ui, sans-serif";
  ctx.fillText("Studying with Prepex", CARD_WIDTH / 2, CARD_HEIGHT - 220);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not draw the card."))), "image/png");
  });
}

export type ShareOutcome = { ok: boolean; message: string };

/** The device share sheet when it can take a picture; otherwise the picture is saved. A cancelled sheet is not an error. */
export async function shareOrSaveCard(data: ShareCardData): Promise<ShareOutcome> {
  try {
    const blob = await buildShareCard(data);
    const file = new File([blob], "prepex-focus-session.png", { type: "image/png" });
    if (typeof navigator !== "undefined" && typeof navigator.canShare === "function" && typeof navigator.share === "function" && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text: shareText(data) });
        return { ok: true, message: "Shared." };
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return { ok: true, message: "Share cancelled." };
        throw err;
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { ok: true, message: "Card saved to your device." };
  } catch {
    return { ok: false, message: "Could not make the card. Please try again." };
  }
}
