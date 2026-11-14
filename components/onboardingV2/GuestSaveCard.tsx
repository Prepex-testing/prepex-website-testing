"use client";

import { useEffect, useState } from "react";
import { Pexo } from "@/components/pexo/Pexo";
import { SaveAccountSheet } from "@/components/onboardingV2/SaveAccountSheet";
import { getDayClose } from "@/lib/api/rituals";
import { getXpSummary } from "@/lib/api/xp";
import { getStoredUser } from "@/lib/auth/session";
import {
  duePrompt,
  GUEST_CONFLICT_KEY,
  isGuestUser,
  loadGuest,
  markPromptShown,
  promptShown,
  takeGuestSaved,
  type SavePrompt,
} from "@/lib/onboardingV2/guest";
import { sayLocal } from "@/lib/onboardingV2/lines";
import type { PexoPick } from "@/lib/pexo/engine";

type View = { kind: "prompt"; prompt: SavePrompt; pick: PexoPick } | { kind: "saved"; pick: PexoPick } | { kind: "conflict" } | { kind: "plain" };

/**
 * Onboarding v2, Part D (D3) on Home. For a guest: Pexo asks them to save at the moments that matter (after a first
 * study session, after closing a day, on day 3), each at most once; "Save my account" is always one tap away from
 * the menu (/home?save=1). Right after saving: guest.saved, once.
 */
export function GuestSaveCard() {
  const [view, setView] = useState<View | null>(null);
  const [sheet, setSheet] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once from this device
    setUserId(user.id);
    if (takeGuestSaved(user.id)) {
      const pick = sayLocal("guest.saved", {}, loadGuest(user.id).answers.language);
      if (pick) setView({ kind: "saved", pick });
      return;
    }
    try {
      if (window.localStorage.getItem(GUEST_CONFLICT_KEY) === "1") {
        window.localStorage.removeItem(GUEST_CONFLICT_KEY);
        setView({ kind: "conflict" });
        return;
      }
    } catch {
      /* private mode */
    }
    if (!isGuestUser(user)) return;
    if (new URLSearchParams(window.location.search).get("save") === "1") setSheet(true);

    let alive = true;
    const guest = loadGuest(user.id);
    const started = Date.parse(guest.startedAt ?? "") || Date.now();
    void Promise.all([getXpSummary().catch(() => null), getDayClose().catch(() => null)]).then(([xp, dayClose]) => {
      if (!alive) return;
      const prompt = duePrompt(
        {
          daysSinceStart: Math.floor((Date.now() - started) / 86_400_000),
          dayClosed: dayClose?.status === "completed",
          studied: (xp?.todayStudyMinutes ?? 0) > 0 || (xp?.totalXp ?? 0) > 0,
        },
        (p) => promptShown(user.id, p),
      );
      const pick = prompt ? sayLocal(`guest.save.${prompt}`, {}, guest.answers.language) : null;
      setView(prompt && pick ? { kind: "prompt", prompt, pick } : { kind: "plain" });
    });
    return () => {
      alive = false;
    };
  }, []);

  const later = () => {
    if (view?.kind === "prompt" && userId) markPromptShown(userId, view.prompt);
    setView({ kind: "plain" });
  };

  const sheetEl = sheet ? (
    <SaveAccountSheet
      onClose={() => setSheet(false)}
      onSaved={() => {
        // the whole app re-reads the account (no longer a guest) on a fresh load; Pexo says guest.saved there
        window.location.assign("/home");
      }}
    />
  ) : null;

  if (!view) return sheetEl;
  if (view.kind === "saved")
    return (
      <section className="flex items-center gap-3 rounded-2xl border border-border-subtle/70 bg-surface-elevated p-4 shadow-sm" data-testid="guest-saved" role="status">
        <Pexo mood={view.pick.mood} size={48} />
        <p className="text-[15px] font-semibold text-ink">{view.pick.text}</p>
      </section>
    );
  if (view.kind === "conflict")
    return (
      <section className="rounded-2xl border border-border-subtle/70 bg-surface-elevated p-4 text-[14px] text-ink shadow-sm" data-testid="guest-conflict" role="status">
        That Google account already had Prepex, so you are signed in to it. Your guest progress was not moved into it.
      </section>
    );
  if (view.kind === "plain") return sheetEl;
  return (
    <>
      <section className="flex items-start gap-3 rounded-2xl border border-border-subtle/70 bg-surface-elevated p-4 shadow-sm" data-testid="guest-save" data-prompt={view.prompt}>
        <Pexo mood={view.pick.mood} size={48} />
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <p className="text-[15px] font-semibold text-ink" role="status">
            {view.pick.text}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                if (userId) markPromptShown(userId, view.prompt);
                setSheet(true);
              }}
              className="min-h-11 rounded-xl bg-[var(--cta)] px-4 text-[14px] font-bold text-white"
              data-testid="guest-save-open"
            >
              Save my account
            </button>
            <button type="button" onClick={later} className="min-h-11 px-2 text-[13px] font-semibold text-muted underline">
              Later
            </button>
          </div>
        </div>
      </section>
      {sheetEl}
    </>
  );
}
