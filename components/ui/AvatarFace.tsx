"use client";

import { useState, type ReactNode } from "react";

type AvatarFaceProps = {
  /** The photo, or null to show the fallback. */
  src: string | null;
  alt?: string;
  /** Shown when there's no photo, or it fails to load. */
  fallback: ReactNode;
  /** Size, shape and fallback colours — the photo fills the same box. */
  className: string;
};

/** A round profile photo that falls back to initials if absent or broken. */
export function AvatarFace({ src, alt = "", fallback, className }: AvatarFaceProps) {
  // Remember which src failed rather than a boolean, so a new photo gets a
  // fresh attempt without resetting state in an effect.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = src !== null && src !== failedSrc;

  return (
    <span className={`${className} overflow-hidden`}>
      {showImage ? (
        // A plain <img>: the file is served by core-service, which isn't in
        // next.config's image allowlist, and it's already sized for display.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="h-full w-full object-cover" onError={() => setFailedSrc(src)} />
      ) : (
        fallback
      )}
    </span>
  );
}
