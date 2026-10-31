import { toPng } from "html-to-image";

/** The story format Instagram and WhatsApp status use. */
export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;

/**
 * Renders the 1080x1920 share card to a PNG on the student's own device (html-to-image); nothing is uploaded.
 * `node` must be the card at its natural size.
 */
export async function renderReviewPng(node: HTMLElement): Promise<string> {
  return toPng(node, { width: STORY_WIDTH, height: STORY_HEIGHT, pixelRatio: 1, cacheBust: true, backgroundColor: "#0F1115" });
}

export async function downloadPng(dataUrl: string, filename: string): Promise<void> {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Uses the phone's share sheet when it can share files; returns false otherwise so the caller can fall back to a download. */
export async function sharePng(dataUrl: string, filename: string, text: string): Promise<boolean> {
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], filename, { type: "image/png" });
    if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], text });
      return true;
    }
  } catch {
    /* cancelled or unsupported: fall back to a download */
  }
  return false;
}
