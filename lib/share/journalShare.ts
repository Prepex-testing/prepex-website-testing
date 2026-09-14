/**
 * Section 7.5 — Win Journal sharing mechanics.
 *
 * The card is a server-rendered PNG, so every share path here works from the
 * same image file rather than screenshotting the DOM. Nothing auto-posts:
 * each function is only ever called from a student's own tap (anti-pattern
 * #257).
 */

export type ShareOutcome = {
  ok: boolean;
  /** Short line to show the student — what happened, or what to do next. */
  message: string;
};

/** Native share sheets reject a bare `image/png` in some browsers unless the
 *  file name carries the extension too. */
function cardFileName(weekLabel: string | null): string {
  const slug = (weekLabel ?? "week")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `prepex-${slug || "win-journal"}.png`;
}

async function fetchCardFile(imageUrl: string, weekLabel: string | null): Promise<File> {
  const response = await fetch(imageUrl, { cache: "no-store" });
  if (!response.ok) throw new Error("Could not load the card image.");
  const blob = await response.blob();
  return new File([blob], cardFileName(weekLabel), { type: blob.type || "image/png" });
}

function canShareFiles(files: File[]): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function" &&
    typeof navigator.share === "function" &&
    navigator.canShare({ files })
  );
}

/** A cancelled share sheet is a normal user action, not a failure. */
function isAbort(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

// ---------------------------------------------------------------------------
// Download
// ---------------------------------------------------------------------------

export async function downloadCard(imageUrl: string, weekLabel: string | null): Promise<ShareOutcome> {
  try {
    const file = await fetchCardFile(imageUrl, weekLabel);
    const objectUrl = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = file.name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    // Revoked on the next tick — Safari cancels the download if the object
    // URL disappears in the same frame as the click.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    return { ok: true, message: "Card saved to your device." };
  } catch {
    return { ok: false, message: "Could not save the card. Try again." };
  }
}

// ---------------------------------------------------------------------------
// Native share sheet — the "Share" button, and the route to Instagram Stories
// ---------------------------------------------------------------------------

export async function shareCardNatively(
  imageUrl: string,
  weekLabel: string | null,
  shareUrl: string,
  text: string,
): Promise<ShareOutcome> {
  try {
    const file = await fetchCardFile(imageUrl, weekLabel);
    if (canShareFiles([file])) {
      await navigator.share({ files: [file], title: "My week in wins", text });
      return { ok: true, message: "Shared." };
    }
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      await navigator.share({ title: "My week in wins", text, url: shareUrl });
      return { ok: true, message: "Shared." };
    }
  } catch (err) {
    if (isAbort(err)) return { ok: true, message: "" };
    // fall through to the download fallback below
  }

  // Desktop browsers mostly have no share sheet — hand over the PNG instead
  // so the student can post it from wherever they like.
  return downloadCard(imageUrl, weekLabel);
}

// ---------------------------------------------------------------------------
// WhatsApp
// ---------------------------------------------------------------------------

/**
 * WhatsApp's web intent takes text only — it cannot carry an image. So the
 * message carries the public card link, which unfurls into a preview of the
 * same PNG. On mobile the file share sheet is the better path, so try that
 * first and keep wa.me as the fallback.
 */
export async function shareToWhatsApp(
  imageUrl: string,
  weekLabel: string | null,
  shareUrl: string,
  text: string,
): Promise<ShareOutcome> {
  try {
    const file = await fetchCardFile(imageUrl, weekLabel);
    if (canShareFiles([file])) {
      await navigator.share({ files: [file], title: "My week in wins", text });
      return { ok: true, message: "Shared." };
    }
  } catch (err) {
    if (isAbort(err)) return { ok: true, message: "" };
  }

  const message = `${text}\n${shareUrl}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  return { ok: true, message: "Opening WhatsApp…" };
}

// ---------------------------------------------------------------------------
// Instagram
// ---------------------------------------------------------------------------

/**
 * Instagram has no web intent that accepts an image — Stories can only be
 * posted from the app. The native share sheet is the only path that lands the
 * PNG directly in Instagram, so try it first; everywhere else, save the card
 * and tell the student the one manual step left.
 */
export async function shareToInstagram(
  imageUrl: string,
  weekLabel: string | null,
  text: string,
): Promise<ShareOutcome> {
  try {
    const file = await fetchCardFile(imageUrl, weekLabel);
    if (canShareFiles([file])) {
      await navigator.share({ files: [file], title: "My week in wins", text });
      return { ok: true, message: "Pick Instagram from the share sheet." };
    }

    const objectUrl = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = file.name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);

    return { ok: true, message: "Card saved — add it to your Instagram story." };
  } catch (err) {
    if (isAbort(err)) return { ok: true, message: "" };
    return { ok: false, message: "Could not prepare the card. Try again." };
  }
}

// ---------------------------------------------------------------------------
// Copy link
// ---------------------------------------------------------------------------

export async function copyShareLink(shareUrl: string): Promise<ShareOutcome> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareUrl);
      return { ok: true, message: "Link copied." };
    }
  } catch {
    // Clipboard API is blocked outside a secure context (plain-http preview
    // builds, some in-app browsers) — fall through to the textarea path.
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = shareUrl;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
    return { ok: true, message: "Link copied." };
  } catch {
    return { ok: false, message: "Could not copy the link." };
  }
}

// ---------------------------------------------------------------------------
// Share copy
// ---------------------------------------------------------------------------

/** The line that rides along with the card. Never mentions a partner, a weak
 *  topic, or an absolute mock score (PRD 7.5.2). */
export function buildShareText(heroTitle: string | null, weekLabel: string | null): string {
  const win = heroTitle ? `${heroTitle} 🎯` : "My week in wins";
  return `${win}${weekLabel ? ` — ${weekLabel}` : ""}. Tracked on Prepex.`;
}
