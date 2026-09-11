"use client";

import { useEffect, useSyncExternalStore } from "react";
import { CORE_API_BASE_URL } from "@/lib/api/config";
import { getAvatar } from "@/lib/api/profile";
import { getStoredUser, STORED_USER_CHANGE_EVENT } from "@/lib/auth/session";

/**
 * The signed-in student's profile photo, shared by every avatar on screen —
 * the header menu, the collapsed sidebar, the profile page ring and the edit
 * modal. It's fetched once per session and updated in place after an upload
 * or removal, so all of them change together without a reload.
 *
 * Keyed by user id: signing out and in as someone else must never show the
 * previous student's photo, even for a frame.
 */
type Cache = { userId: string; url: string | null; status: "loading" | "ready" | "error" };

let cache: Cache | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribeAvatar(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function subscribeStoredUser(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(STORED_USER_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(STORED_USER_CHANGE_EVENT, onChange);
  };
}

function storedUserId(): string {
  return getStoredUser()?.id ?? "";
}

function loadAvatar(userId: string) {
  // One request per user per session; a failed one is retried on next mount.
  if (cache?.userId === userId && cache.status !== "error") return;
  cache = { userId, url: null, status: "loading" };
  getAvatar()
    .then(({ data }) => {
      if (cache?.userId !== userId) return;
      cache = { userId, url: data.avatarUrl, status: "ready" };
      emit();
    })
    .catch(() => {
      if (cache?.userId !== userId) return;
      cache = { userId, url: null, status: "error" };
    });
}

/** After an upload (or `null` after a removal) — every avatar updates at once. */
export function setAvatarUrl(url: string | null) {
  const userId = storedUserId();
  if (!userId) return;
  cache = { userId, url, status: "ready" };
  emit();
}

/** Core serves the file; the stored value is a path on that host. */
export function avatarSrc(url: string | null): string | null {
  if (!url) return null;
  return url.startsWith("/") ? `${CORE_API_BASE_URL}${url}` : url;
}

/** The current student's photo as a ready-to-render `src`, or null. */
export function useAvatarSrc(): string | null {
  const userId = useSyncExternalStore(subscribeStoredUser, storedUserId, () => "");
  const url = useSyncExternalStore(
    subscribeAvatar,
    () => (cache && cache.userId === userId ? cache.url : null),
    () => null,
  );

  useEffect(() => {
    if (userId) loadAvatar(userId);
  }, [userId]);

  return avatarSrc(url);
}

// ---------------------------------------------------------------------------
// Preparing a chosen photo for upload.
// ---------------------------------------------------------------------------

/** A problem with the chosen file; its message is safe to show as-is. */
export class AvatarImageError extends Error {}

const AVATAR_SIZE = 512;
/** Before decoding — well above any phone photo, but guards against huge files. */
const MAX_SOURCE_BYTES = 20 * 1024 * 1024;

/**
 * Center-crops the photo to a square and scales it to 512px, re-encoded as
 * JPEG. Phone photos are routinely 3–8 MB — over the 2 MB upload limit — and
 * nothing larger is ever displayed. Re-encoding also drops the original's
 * metadata (EXIF, including GPS location) before it leaves the device.
 *
 * Throws AvatarImageError with a student-facing message.
 */
export async function prepareAvatarImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new AvatarImageError("Choose an image file.");
  if (file.size > MAX_SOURCE_BYTES) throw new AvatarImageError("That image is too large. Choose one under 20 MB.");

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    try {
      await image.decode();
    } catch {
      throw new AvatarImageError("That image couldn't be opened. Try a JPG or PNG.");
    }

    const side = Math.min(image.naturalWidth, image.naturalHeight);
    if (!side) throw new AvatarImageError("That image couldn't be opened. Try a JPG or PNG.");
    const size = Math.min(AVATAR_SIZE, side);

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) throw new AvatarImageError("Couldn't process that image. Please try again.");

    // JPEG has no transparency — a transparent PNG would otherwise turn black.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, size, size);
    context.imageSmoothingQuality = "high";
    context.drawImage(
      image,
      (image.naturalWidth - side) / 2,
      (image.naturalHeight - side) / 2,
      side,
      side,
      0,
      0,
      size,
      size,
    );

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
    if (!blob) throw new AvatarImageError("Couldn't process that image. Please try again.");
    return blob;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
