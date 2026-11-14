"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Pexo } from "@/components/pexo/Pexo";
import { updateProfile } from "@/lib/api/profile";
import { createTimetable } from "@/lib/api/timetable";
import { getStoredUser } from "@/lib/auth/session";
import { buildFor, levelOf, spokenDate, type ClassAnswer } from "@/lib/onboardingV2/canvas";
import { askShownThisSession, hasGuestAsks, isGuestUser, loadGuest, markAskShown, nextAsk, saveGuest, type GuestAsk, type GuestState } from "@/lib/onboardingV2/guest";
import { sayLocal } from "@/lib/onboardingV2/lines";
import type { HoursAnswer } from "@/lib/onboardingV2/timetable";
import { toApiBlocks } from "@/lib/timetable/grid";

/** How long the card must be on screen before it counts as this session's one card. */
const SEEN_MS = 3000;

/**
 * Onboarding v2, Part D (D2): a guest started with defaults, so Home asks the rest one small card at a time, at most
 * one card per session: class, exam date, school (Class 11/12), hours, chapters. Each answer goes through the normal
 * services (profile update, a new timetable built by the canvas's generator); nothing is stored twice.
 */
export function GuestAskCard() {
  const [state, setState] = useState<{ userId: string; guest: GuestState; ask: GuestAsk } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const user = getStoredUser();
    // a guest, or an account saved from a guest that still has questions left: the defaults are refined day by day
    if (!user || !(isGuestUser(user) || hasGuestAsks(user.id)) || askShownThisSession()) return;
    const guest = loadGuest(user.id);
    const ask = nextAsk(guest);
    if (!ask) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once from this device
    setState({ userId: user.id, guest, ask });
    // it counts as this session's card once it has really been seen (Home can mount for a moment before a redirect)
    const t = setTimeout(markAskShown, SEEN_MS);
    return () => clearTimeout(t);
  }, []);

  if (!state) return null;
  const { guest, ask, userId } = state;
  const pick = sayLocal(`guest.ask.${ask}`, {}, guest.answers.language);
  if (!pick) return null;

  const done = async (patch: Partial<GuestState["answers"]>, save: () => Promise<unknown>) => {
    markAskShown();
    setBusy(true);
    setError(null);
    try {
      await save();
      const next: GuestState = { answers: { ...guest.answers, ...patch }, asked: [...guest.asked, ask] };
      saveGuest(userId, next);
      setState(null);
    } catch {
      setError("That didn't save. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  const rebuildWeek = (patch: Partial<GuestState["answers"]>) => {
    const answers = { ...guest.answers, ...patch };
    return createTimetable({ source: "COACHING_TEMPLATE", blocks: toApiBlocks(buildFor({ ...answers, week: [] }).blocks) });
  };
  const skip = () => {
    markAskShown();
    saveGuest(userId, { ...guest, asked: [...guest.asked, ask] });
    setState(null);
  };

  return (
    <section className="flex items-start gap-3 rounded-2xl border border-border-subtle/70 bg-surface-elevated p-4 shadow-sm" data-testid="guest-ask" data-ask={ask} aria-label="A quick question">
      <Pexo mood={pick.mood} size={48} />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <p className="text-[15px] font-semibold text-ink" role="status">
          {pick.text}
        </p>
        {error && (
          <p role="alert" className="text-[13px] font-medium text-danger">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {ask === "class" &&
            (["CLASS_11", "CLASS_12", "DROPPER", "OTHER"] as ClassAnswer[]).map((c) => (
              <Option key={c} disabled={busy} onClick={() => void done({ level: c }, () => updateProfile({ currentLevel: levelOf(c) }))}>
                {c === "CLASS_11" ? "Class 11" : c === "CLASS_12" ? "Class 12" : c === "DROPPER" ? "Dropper" : "Other"}
              </Option>
            ))}
          {ask === "exam_date" && <ExamDateOptions guest={guest} busy={busy} onSave={(main, adv) => void done({}, () => updateProfile({ jeeMainDate: main, jeeAdvancedDate: adv }))} />}
          {ask === "school" &&
            (
              [
                ["MORNING", "Morning school"],
                ["DAY", "Day school"],
                ["NONE", "No school"],
              ] as const
            ).map(([s, label]) => (
              <Option key={s} disabled={busy} onClick={() => void done({ school: s }, () => rebuildWeek({ school: s }))}>
                {label}
              </Option>
            ))}
          {ask === "hours" &&
            ([2, 4, 6, 8, 10] as HoursAnswer[]).map((h) => (
              <Option key={h} disabled={busy} onClick={() => void done({ hours: h }, () => rebuildWeek({ hours: h }))}>
                {h === 10 ? "10+ hours" : `${h} hours`}
              </Option>
            ))}
          {ask === "chapters" && (
            <Link href="/syllabus" onClick={() => saveGuest(userId, { ...guest, asked: [...guest.asked, ask] })} className="min-h-11 rounded-xl border border-border-subtle bg-surface px-3.5 py-2.5 text-[14px] font-bold text-ink">
              Mark chapters
            </Link>
          )}
          <button type="button" onClick={skip} className="min-h-11 px-2 text-[13px] font-semibold text-muted underline" data-testid="guest-ask-later">
            Later
          </button>
        </div>
      </div>
    </section>
  );
}

function Option({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="min-h-11 rounded-xl border border-border-subtle bg-surface px-3.5 text-[14px] font-bold text-ink transition hover:border-brand disabled:opacity-50">
      {children}
    </button>
  );
}

function ExamDateOptions({ guest, busy, onSave }: { guest: GuestState; busy: boolean; onSave: (main: string | null, adv: string | null) => void }) {
  const dates = guest.answers.examDates;
  const [main, setMain] = useState(dates.find((d) => d.kind === "JEE_MAIN")?.date ?? "");
  const [adv, setAdv] = useState(dates.find((d) => d.kind === "JEE_ADVANCED")?.date ?? "");
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="flex w-full flex-col gap-2">
      {dates.length > 0 && <p className="text-[13px] text-muted">Now: {dates.map((d) => `${d.label} ${spokenDate(d.date)}`).join(" · ")}</p>}
      <label className="flex flex-col gap-1 text-[13px] font-semibold text-ink">
        JEE Main
        <input type="date" min={today} value={main} onChange={(e) => setMain(e.target.value)} className="min-h-11 rounded-xl border border-border-subtle bg-surface px-3 text-ink" />
      </label>
      {guest.answers.goal === "JEE_BOTH" && (
        <label className="flex flex-col gap-1 text-[13px] font-semibold text-ink">
          JEE Advanced
          <input type="date" min={today} value={adv} onChange={(e) => setAdv(e.target.value)} className="min-h-11 rounded-xl border border-border-subtle bg-surface px-3 text-ink" />
        </label>
      )}
      <Option disabled={busy || !main} onClick={() => onSave(main || null, guest.answers.goal === "JEE_BOTH" ? adv || null : null)}>
        Save dates
      </Option>
    </div>
  );
}
