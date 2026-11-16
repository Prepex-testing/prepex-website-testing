"use client";

import { COMMUNITY } from "@/lib/legal/contacts";
import { trackCommunityClick, type CommunityPlacement } from "@/lib/telemetry/community";

/**
 * "Join the Prepex community": the WhatsApp group, in a new tab, with the note that members can see your number.
 * `inline` is the footer form (a link and a short note); `card` is the row used on the contact and Help pages.
 */
export function CommunityLink({ placement, variant = "inline", className = "" }: { placement: CommunityPlacement; variant?: "inline" | "card"; className?: string }) {
  const link = (
    <a
      href={COMMUNITY.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackCommunityClick(placement)}
      data-testid={`community-link-${placement}`}
      className={variant === "card" ? "font-bold text-ink underline underline-offset-2" : "underline"}
    >
      {COMMUNITY.label}
    </a>
  );
  if (variant === "card") {
    return (
      <div className={`flex flex-col gap-1 ${className}`} data-testid={`community-${placement}`}>
        <p className="text-[15px] leading-relaxed">{link}</p>
        <p className="text-[13px] text-muted">{COMMUNITY.note}</p>
      </div>
    );
  }
  return (
    <span className={`inline-flex flex-col items-center gap-0.5 ${className}`} data-testid={`community-${placement}`}>
      {link}
      <span className="text-[11px] text-muted">{COMMUNITY.note}</span>
    </span>
  );
}
