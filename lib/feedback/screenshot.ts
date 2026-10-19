/**
 * Screenshots for the feedback form. Whatever the student attaches is shrunk to at most 1280 px on its longest side and
 * saved as a JPEG, so it is a couple of hundred KB, well under the server's 700 KB limit.
 */

export const MAX_SIDE = 1280;
export const JPEG_QUALITY = 0.72;
/** The server refuses a data URL longer than this. */
export const MAX_DATA_URL_CHARS = 700_000;
export const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

/** The size an image of `width` x `height` is drawn at: unchanged when it already fits, else scaled down keeping its shape. */
export function fitWithin(width: number, height: number, max: number = MAX_SIDE): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= max || longest <= 0) return { width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(height)) };
  const scale = max / longest;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Draws `source` (an image or a video frame) onto a canvas of the fitted size and returns a JPEG data URL, shrinking further if it is still too big. */
export function toJpegDataUrl(source: CanvasImageSource, width: number, height: number, doc: Document = document): string {
  let side = MAX_SIDE;
  for (let attempt = 0; attempt < 4; attempt++) {
    const size = fitWithin(width, height, side);
    const canvas = doc.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This browser cannot prepare screenshots.");
    ctx.fillStyle = "#ffffff"; // a PNG with transparency would turn black as a JPEG
    ctx.fillRect(0, 0, size.width, size.height);
    ctx.drawImage(source, 0, 0, size.width, size.height);
    const url = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    if (url.length <= MAX_DATA_URL_CHARS) return url;
    side = Math.round(side * 0.7);
  }
  throw new Error("That screenshot is too large. Try a smaller one.");
}

/** A picture the student chose from their device, as a downscaled JPEG data URL. */
export async function fileToDataUrl(file: File): Promise<string> {
  if (!ACCEPTED_TYPES.includes(file.type)) throw new Error("Please choose a PNG, JPEG or WebP image.");
  const bitmap = await createImageBitmap(file);
  try {
    return toJpegDataUrl(bitmap, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
  }
}

/** Can this browser capture the screen (desktop browsers; phones cannot)? */
export function canCaptureScreen(nav: Navigator = navigator): boolean {
  return typeof nav.mediaDevices?.getDisplayMedia === "function";
}

/**
 * Captures one frame of the screen or tab the student picks (the browser asks them first). Resolves `null` if they
 * cancel the picker.
 */
export async function captureScreen(nav: Navigator = navigator): Promise<string | null> {
  let stream: MediaStream;
  try {
    stream = await nav.mediaDevices.getDisplayMedia({ video: true, audio: false });
  } catch (err) {
    if (err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "AbortError")) return null;
    throw err;
  }
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.srcObject = stream;
    await video.play();
    // one painted frame before reading the size and drawing
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    return toJpegDataUrl(video, video.videoWidth, video.videoHeight);
  } finally {
    stream.getTracks().forEach((t) => t.stop());
  }
}
