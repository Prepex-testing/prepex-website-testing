"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PartnerMatchModal } from "@/components/home/PartnerMatchModal";
import { acceptMatch, declineMatch, getPartnerStatus, type PartnershipStatusResponse } from "@/lib/api/partner";

/**
 * PRD 6.2 — when the daily matching job has proposed a partner, the match
 * card greets the student on Home. Shown once per sign-in session for a given
 * match: closing it doesn't bring it back until they next sign in, and the
 * Partner page (where Accept / Decline land) keeps it one tap away meanwhile.
 */
const PROMPTED_KEY = "prepex.partnerMatchPrompted";

function wasPrompted(partnershipId: string): boolean {
  try {
    return sessionStorage.getItem(PROMPTED_KEY) === partnershipId;
  } catch {
    return false;
  }
}

function markPrompted(partnershipId: string) {
  try {
    sessionStorage.setItem(PROMPTED_KEY, partnershipId);
  } catch {
    // Storage unavailable — it may show again this session; harmless.
  }
}

export function HomePartnerMatchPrompt({ suppressed }: { suppressed: boolean }) {
  const router = useRouter();
  const [match, setMatch] = useState<PartnershipStatusResponse | null>(null);
  const [isDismissed, setDismissed] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);

  useEffect(() => {
    getPartnerStatus()
      .then(({ data }) => {
        // Only a match this student hasn't answered yet — once they've
        // accepted, the Partner page shows the wait for the other side.
        if (data.status !== "PENDING" || data.meAccepted || !data.partnershipId) return;
        if (wasPrompted(data.partnershipId)) return;
        setMatch(data);
      })
      .catch(() => {
        // Best-effort — the Partner page shows the match either way.
      });
  }, []);

  const partnershipId = match?.partnershipId ?? null;

  const dismiss = () => {
    if (partnershipId) markPrompted(partnershipId);
    setDismissed(true);
  };

  // Either answer lands on the Partner page, which shows what happened —
  // the wait for the other side, or "no partner yet" — or, if the request
  // failed, the still-pending match to try again.
  const respond = async (answer: "accept" | "decline") => {
    dismiss();
    setSubmitting(true);
    try {
      await (answer === "accept" ? acceptMatch() : declineMatch());
    } catch {
      // Handled on the Partner page, which re-offers a still-pending match.
    }
    router.push("/home/partner");
  };

  return (
    <PartnerMatchModal
      // Waits behind any other Home pop-up rather than stacking on it.
      open={Boolean(match) && !isDismissed && !suppressed}
      onClose={dismiss}
      onAccept={() => respond("accept")}
      onDecline={() => respond("decline")}
      partner={match?.partner ?? null}
      isSubmitting={isSubmitting}
      declinesRemaining={match?.eligibility.declines.remaining}
    />
  );
}
