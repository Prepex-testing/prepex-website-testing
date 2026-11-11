"use client";

import { useEffect, useRef, useState } from "react";
import { AskSheet } from "@/components/pexo/AskSheet";
import { celebrateFirstSession, PexoTour } from "@/components/pexo/PexoTour";
import { Pexo, type PexoTap } from "@/components/pexo/Pexo";
import { PexoBubble, usePexoLine } from "@/components/pexo/PexoBubble";
import type { PexoPick } from "@/lib/pexo/engine";
import { pexoMark, pexoReact, pexoSay, usePexo, type PexoAction } from "@/lib/pexo/store";

/** Home asks the Day Close card (components/rituals/HomeRituals) to open itself. */
export const OPEN_DAY_CLOSE_EVENT = "prepex:open-day-close";
/** Two minutes on a visible Home with nothing happening: Pexo says one sleepy line, once a day. */
export const LONG_IDLE_MS = 120_000;
const EGG_MS = 4000;

/**
 * Pexo on Home: the 96 px character and ONE bubble. The server picks the line family from the state of the day (care,
 * welcome back, no goals, plan done, Day Close, time of day); the line itself comes from the library. It changes on app
 * open and when the state changes, never on a re-render. Tap Pexo for a wave; the bubble always offers "What should I
 * do now?". Below it, at most one soft nudge a day. Renders nothing when Pexo is off.
 */
export function HomePexo() {
  const { enabled, state, transient } = usePexo();
  const home = state?.home ?? null;
  const pick = usePexoLine(home?.triggers ?? null, home?.context ?? {}, home?.key ?? "", home?.exclude ?? []);
  const nudge = state?.nudge ?? null;
  // the soft card under the bubble: the pledge's result (once), the Wednesday check on the pledge (once), else the nudge
  const [soft, setSoft] = useState<{ trigger: string; context: Record<string, string | number>; action: { label: string; href: string } | null } | null>(null);
  const pledge = state?.pledge ?? null;
  const decided = useRef<{ key: string; soft: typeof soft } | null>(null);
  const softKey = `${state?.today}|${pledge?.settled?.weekStart}:${pledge?.settled?.result}|${pledge?.current?.mid}|${nudge?.trigger}|${state?.care?.active}`;
  useEffect(() => {
    if (!enabled || !state || state.care?.active) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the soft card is decided once per state
      setSoft(null);
      return;
    }
    // decided once per state: marking is not repeatable, so a re-run (Strict Mode) reuses the first decision
    if (decided.current?.key === softKey) {
      setSoft(decided.current.soft);
      return;
    }
    const wednesday = new Date(`${state.today}T00:00:00Z`).getUTCDay() === 3;
    let next: typeof soft = nudge ? { trigger: nudge.trigger, context: nudge.context, action: nudge.action } : null;
    if (pledge?.settled && pexoMark(`pledge.${pledge.settled.weekStart}`, true)) next = { trigger: pledge.settled.result === "hit" ? "pledge.hit" : "pledge.missed", context: {}, action: null };
    else if (wednesday && pledge?.current?.mid && pexoMark(`pledge.mid.${pledge.current.weekStart}`, true)) next = { trigger: `pledge.mid.${pledge.current.mid}`, context: {}, action: null };
    decided.current = { key: softKey, soft: next };
    setSoft(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `softKey` captures the facts
  }, [enabled, softKey]);
  const nudgePick = usePexoLine(soft ? soft.trigger : null, soft?.context ?? {}, soft?.trigger ?? "");
  const [ask, setAsk] = useState(false);
  const [askLabel, setAskLabel] = useState("What should I do now?");
  const [egg, setEgg] = useState<PexoPick | null>(null);
  const [nudgeGone, setNudgeGone] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the button's label is a library line, read once
    setAskLabel(pexoSay("ask.title", {}, { silent: true })?.text ?? "What should I do now?");
  }, [enabled, state?.language]);

  // the distress line is shown at most once a week: remember that it was shown
  useEffect(() => {
    if (pick?.trigger === "care.distress") pexoMark("care.distress");
  }, [pick?.trigger]);

  // the Prepex map's quest that the summary just noticed: one small celebration
  const justDone = state?.quests?.justDone.join(",") ?? "";
  useEffect(() => {
    if (!justDone) return;
    const q = justDone.split(",")[0]!;
    if (!pexoMark(`quest.done.${q}`, true)) return;
    // the first session the tour invited: its own celebration
    if (q === "focus" && celebrateFirstSession()) return;
    pexoReact(`quest.${q}.done`, {}, { kind: "celebration" });
  }, [justDone]);

  // one timer while Home is visible; hidden tabs do not count
  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const arm = () => {
      if (timer) clearTimeout(timer);
      timer = document.visibilityState === "visible" ? setTimeout(() => pexoMark("easter.long_idle") && setEgg(pexoSay("easter.long_idle")), LONG_IDLE_MS) : null;
    };
    arm();
    document.addEventListener("visibilitychange", arm);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", arm);
    };
  }, [enabled]);

  useEffect(() => {
    if (!egg) return;
    const t = setTimeout(() => setEgg(null), EGG_MS);
    return () => clearTimeout(t);
  }, [egg]);

  if (!enabled || !state) return null;

  const onTap = (kind: PexoTap) => setEgg(pexoSay(kind === "poke3" ? "easter.poke3" : "easter.tap"));
  const shown = egg ?? pick;
  const actions: PexoAction[] = [
    ...(egg ? [] : (home?.actions ?? []).slice(0, 1).map((a): PexoAction => (home?.key === "day_close" ? { label: a.label, testId: "home-pexo-action", onClick: () => window.dispatchEvent(new Event(OPEN_DAY_CLOSE_EVENT)) } : { label: a.label, href: a.href, testId: "home-pexo-action" }))),
    { label: askLabel, testId: "home-pexo-ask", onClick: () => setAsk(true) },
  ];
  const accessory = state.accessories[state.accessories.length - 1] ?? null;

  return (
    <section className="flex flex-col gap-3" aria-label="Pexo" data-testid="home-pexo" data-state={home?.key ?? "none"} data-care={state.care?.active ? "on" : "off"}>
      {shown && !transient ? (
        <PexoBubble pick={shown} size={96} actions={actions} onTap={onTap} testId="home-pexo-bubble" className="items-center" />
      ) : (
        // while a reaction is speaking (or there is nothing to say) Pexo stays, quietly: one bubble per screen
        <div className="flex items-center gap-2.5">
          <Pexo mood={state.care?.active ? "calm" : "happy"} size={96} onTap={onTap} accessory={accessory} />
          <button type="button" onClick={() => setAsk(true)} data-testid="home-pexo-ask" className="min-h-11 rounded-full border border-border-strong px-4 text-[13px] font-medium text-ink hover:bg-surface-elevated-2">
            {askLabel}
          </button>
        </div>
      )}
      {nudgePick && soft && !nudgeGone && !state.care?.active && (
        <PexoBubble
          pick={nudgePick}
          size={48}
          testId="home-pexo-nudge"
          actions={soft.action ? [{ label: soft.action.label, href: soft.action.href }] : []}
          onDismiss={() => setNudgeGone(true)}
          className="rounded-2xl border border-dashed border-border-subtle p-3"
        />
      )}
      <AskSheet open={ask} onClose={() => setAsk(false)} />
      <PexoTour firstSubject={typeof home?.context.subject === "string" ? home.context.subject : null} />
    </section>
  );
}
