"use client";

import { useEffect, useState } from "react";
import { Pexo } from "@/components/pexo/Pexo";
import type { PexoProp } from "@/components/pexo/moods";
import { CoralButton } from "@/components/ui/CoralButton";
import { GhostButton } from "@/components/ui/GhostButton";
import { Modal } from "@/components/ui/Modal";
import { getProfileOverview } from "@/lib/api/profile";
import { startFocusSession } from "@/lib/focus/startFocusSession";
import type { PexoPick } from "@/lib/pexo/engine";
import { pexoEvent, pexoHasMark, pexoMark, pexoReact, pexoSay, usePexo } from "@/lib/pexo/store";

/** The six feature cards, each with the prop Pexo holds while acting it out. */
export const TOUR_CARDS: { trigger: string; prop?: PexoProp; title: string }[] = [
  { trigger: "tour.plan", prop: "flag", title: "Your plan" },
  { trigger: "tour.focus", title: "Focus" },
  { trigger: "tour.revise", prop: "book", title: "Revision" },
  { trigger: "tour.backlog", prop: "hammer", title: "Backlog" },
  { trigger: "tour.mistakes", prop: "gem", title: "Mistakes" },
  { trigger: "tour.gps", prop: "flag", title: "Rank GPS" },
];
/** The tour is for a student's first week; after that Pexo does not bring it up. */
export const TOUR_WINDOW_DAYS = 7;
export const FIRST_SESSION_MINUTES = 15;

type Stage = { kind: "hello"; index: number } | { kind: "card"; index: number } | { kind: "end" } | { kind: "finale" } | { kind: "first" } | { kind: "skipped" };

/**
 * The 60-second tour: six swipeable cards, Pexo acting each one, then the finale with the real days to the exam and
 * an invitation to a 15-minute first session (the timer opens already filled in). Shown once, in the first week, on
 * Home. Every step can be skipped. Modal on purpose: it is the one guided moment.
 */
/**
 * `meet`: the student finished onboarding before they had Pexo (the server says `meetPexo`). Once, the tour opens with
 * Pexo's three hello lines first, whatever their signup date. Skippable at every card; onboarding is never replayed.
 */
export function PexoTour({ firstSubject, meet = false }: { firstSubject: string | null; meet?: boolean }) {
  const { enabled, state } = usePexo();
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>({ kind: "card", index: 0 });
  const [days, setDays] = useState<number | null>(null);
  const [touchX, setTouchX] = useState<number | null>(null);

  const meetDue = Boolean(enabled && state && meet && !pexoHasMark("meet"));
  const due = Boolean(enabled && state && !pexoHasMark("tour") && ((state.daysSinceSignup ?? 0) <= TOUR_WINDOW_DAYS || meetDue));
  useEffect(() => {
    if (!due) return;
    if (meetDue) {
      // shown once: marked as it opens, so a reload half-way does not bring it back
      pexoMark("meet", true);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the meeting starts with Pexo saying hello
      setStage({ kind: "hello", index: 0 });
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- opened once, when the state says it is due
    setOpen(true);
    void getProfileOverview().then((r) => setDays(r.data.daysUntilExam), () => undefined);
  }, [due]);

  if (!open) return null;

  const close = (completed: boolean) => {
    pexoMark("tour", true);
    pexoEvent(completed ? "tour_completed" : "tour_skipped", stage.kind === "card" ? { at: stage.index } : { at: stage.kind === "hello" ? `hello-${stage.index}` : stage.kind });
    setOpen(false);
  };
  const go = (dir: 1 | -1) => {
    if (stage.kind !== "card") return;
    const next = stage.index + dir;
    if (next < 0) return;
    setStage(next >= TOUR_CARDS.length ? { kind: "end" } : { kind: "card", index: next });
  };

  let pick: PexoPick | null = null;
  let prop: PexoProp | undefined;
  if (stage.kind === "hello") pick = pexoSay(`onb.hello.${stage.index + 1}`, {}, { silent: true });
  else if (stage.kind === "card") {
    pick = pexoSay(TOUR_CARDS[stage.index]!.trigger, {}, { silent: true });
    prop = TOUR_CARDS[stage.index]!.prop;
  } else if (stage.kind === "end") pick = pexoSay("tour.end", {}, { silent: true });
  else if (stage.kind === "finale") pick = pexoSay("onb.finale", days !== null && days > 0 ? { days } : {}, { silent: true });
  else if (stage.kind === "first") pick = pexoSay("onb.first_session", {}, { silent: true });
  else pick = pexoSay("onb.first_session.skip", {}, { silent: true });

  const startFirst = () => {
    pexoMark("first_session.offered", true);
    close(true);
    startFocusSession({ originSource: "home_quick_tile", targetMinutes: FIRST_SESSION_MINUTES, taskType: "self_study", ...(firstSubject ? { subject: firstSubject.toLowerCase() } : {}) });
  };

  return (
    <Modal open={open} onClose={() => close(false)} ariaLabel="Prepex in 60 seconds" size="wide">
      <div
        className="flex flex-col items-center gap-5 text-center"
        data-testid="pexo-tour"
        data-stage={stage.kind === "card" ? `card-${stage.index}` : stage.kind === "hello" ? `hello-${stage.index}` : stage.kind}
        onTouchStart={(e) => setTouchX(e.touches[0]?.clientX ?? null)}
        onTouchEnd={(e) => {
          const end = e.changedTouches[0]?.clientX;
          if (touchX !== null && end !== undefined && Math.abs(end - touchX) > 40) go(end < touchX ? 1 : -1);
          setTouchX(null);
        }}
      >
        {stage.kind === "card" && <p className="text-[12px] font-bold uppercase tracking-wide text-muted">{TOUR_CARDS[stage.index]!.title}</p>}
        <Pexo mood={pick?.mood ?? "happy"} size={160} {...(prop ? { prop } : {})} />
        <p className="min-h-[3em] max-w-sm text-[17px] font-semibold leading-snug text-ink" aria-live="polite" data-testid="pexo-tour-text">
          {pick?.text}
        </p>
        {stage.kind === "card" && (
          <div className="flex gap-1.5" aria-hidden>
            {TOUR_CARDS.map((c, i) => (
              <span key={c.trigger} className={`h-1.5 rounded-full transition-all ${i === stage.index ? "w-5 bg-brand" : "w-1.5 bg-tint-strong"}`} />
            ))}
          </div>
        )}
        <div className="flex w-full flex-wrap justify-center gap-2">
          {stage.kind === "hello" && (
            <>
              <GhostButton onClick={() => close(false)} data-testid="pexo-tour-skip">Skip</GhostButton>
              <CoralButton onClick={() => setStage(stage.index < 2 ? { kind: "hello", index: stage.index + 1 } : { kind: "card", index: 0 })} data-testid="pexo-tour-next">Next</CoralButton>
            </>
          )}
          {stage.kind === "card" && (
            <>
              <GhostButton onClick={() => close(false)} data-testid="pexo-tour-skip">Skip</GhostButton>
              <CoralButton onClick={() => go(1)} data-testid="pexo-tour-next">Next</CoralButton>
            </>
          )}
          {stage.kind === "end" && <CoralButton onClick={() => setStage({ kind: "finale" })} data-testid="pexo-tour-next">Next</CoralButton>}
          {stage.kind === "finale" && <CoralButton onClick={() => setStage({ kind: "first" })} data-testid="pexo-tour-next">Next</CoralButton>}
          {stage.kind === "first" && (
            <>
              <GhostButton onClick={() => setStage({ kind: "skipped" })} data-testid="pexo-first-later">Later</GhostButton>
              <CoralButton onClick={startFirst} data-testid="pexo-first-start">Start {FIRST_SESSION_MINUTES} minutes</CoralButton>
            </>
          )}
          {stage.kind === "skipped" && <CoralButton onClick={() => close(true)} data-testid="pexo-tour-done">Done</CoralButton>}
        </div>
      </div>
    </Modal>
  );
}

/** After the first session the tour offered: the celebration instead of the plain quest line. */
export function celebrateFirstSession(): boolean {
  if (!pexoHasMark("first_session.offered") || !pexoMark("first_session.done", true)) return false;
  return pexoReact("onb.first_session.done", {}, { kind: "celebration" }) !== null;
}
