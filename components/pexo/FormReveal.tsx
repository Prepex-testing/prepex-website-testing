"use client";

import confetti from "canvas-confetti";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { Pexo } from "@/components/pexo/Pexo";
import { FORM_TITLES, isForm, PEXO_FORMS, type PexoForm } from "@/components/pexo/forms";
import { CoralButton } from "@/components/ui/CoralButton";
import type { PexoPick } from "@/lib/pexo/engine";
import { pexoHasMark, pexoMark, pexoSay, usePexo } from "@/lib/pexo/store";
import { offerShare } from "@/lib/pexo/share";

/**
 * B3: Pexo's new form, once per band. One full-screen moment: the old form turns into the new one (under 1.5 s), with
 * `form.reveal` and the band's own line. Existing students are backfilled quietly: on their first open they keep their
 * current form, and only a student already above Aspirant gets ONE reveal of it. It waits for a level-up moment to close.
 */

const KEY: Record<PexoForm, string> = { aspirant: "aspirant", grinder: "grinder", solver: "solver", ranker: "ranker", topper: "topper", iitian: "iitian" };
const rank = (f: PexoForm) => PEXO_FORMS.indexOf(f);

/** Which reveal (if any) this state calls for, and the marks to write. Pure, for tests. */
export function revealFor(form: PexoForm, has: (mark: string) => boolean): { from: PexoForm; to: PexoForm } | null {
  if (!has("form.init")) return form === "aspirant" ? null : { from: "aspirant", to: form };
  if (has(`form.seen.${form}`)) return null;
  const seen = PEXO_FORMS.filter((f) => has(`form.seen.${f}`));
  const from = seen.length ? seen[seen.length - 1]! : "aspirant";
  return rank(form) > rank(from) ? { from, to: form } : null;
}

export function markSeen(form: PexoForm): void {
  pexoMark("form.init", true);
  for (const f of PEXO_FORMS) if (rank(f) <= rank(form)) pexoMark(`form.seen.${f}`, true);
}

/** RewardsLayer tells us when its full-screen moment is open, so two moments never stack. */
export const REWARD_MOMENT_EVENT = "prepex:reward-moment";

export function FormReveal() {
  const { enabled, state } = usePexo();
  const reduce = useReducedMotion();
  const form = isForm(state?.form) ? state.form : null;
  const [show, setShow] = useState<{ from: PexoForm; to: PexoForm; lines: PexoPick[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [morphed, setMorphed] = useState(false);

  useEffect(() => {
    const on = (e: Event) => setBusy(Boolean((e as CustomEvent<boolean>).detail));
    window.addEventListener(REWARD_MOMENT_EVENT, on);
    return () => window.removeEventListener(REWARD_MOMENT_EVENT, on);
  }, []);

  useEffect(() => {
    if (!enabled || !form || busy || show) return;
    const next = revealFor(form, pexoHasMark);
    markSeen(form);
    if (!next) return;
    const reveal = pexoSay("form.reveal", { title: FORM_TITLES[next.to] }, { silent: true });
    const band = pexoSay(`form.${KEY[next.to]}`, {}, { silent: true });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the moment is decided once per new band
    setShow({ ...next, lines: [reveal, band].filter((l): l is PexoPick => !!l) });
    setMorphed(false);
  }, [enabled, form, busy, show]);

  useEffect(() => {
    if (!show) return;
    confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 }, disableForReducedMotion: true, colors: ["#FF6B47", "#FAF7F2", "#2F6BFF"] });
    const t = setTimeout(() => setMorphed(true), reduce ? 0 : 700);
    if (show.to !== "aspirant") offerShare({ kind: "climb", title: FORM_TITLES[show.to], detail: "New look for Pexo", mood: "proud", trigger: "climb.share" });
    return () => clearTimeout(t);
  }, [show, reduce]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={`New form: ${FORM_TITLES[show.to]}`}
          data-testid="form-reveal"
          data-form={show.to}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.25 }}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-6"
        >
          <div className="flex w-full max-w-[360px] flex-col items-center gap-3 rounded-3xl border border-border-subtle bg-surface-elevated-2 p-8 text-center">
            <div className="relative size-[160px]">
              {/* the old form turns into the new one: a short scale and fade, nothing at all under reduced motion */}
              {!reduce && (
                <motion.div className="absolute inset-0" initial={{ opacity: 1, scale: 1 }} animate={morphed ? { opacity: 0, scale: 0.8 } : { opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
                  <Pexo form={show.from} mood="curious" size={160} />
                </motion.div>
              )}
              <motion.div className="absolute inset-0" initial={reduce ? false : { opacity: 0, scale: 1.15 }} animate={morphed || reduce ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.15 }} transition={{ duration: 0.45 }} data-testid="form-reveal-new">
                <Pexo form={show.to} mood="celebrating" size={160} />
              </motion.div>
            </div>
            <p className="text-[13px] font-semibold uppercase tracking-wide text-muted">New form</p>
            <p className="text-[30px] font-extrabold leading-tight text-ink">{FORM_TITLES[show.to]}</p>
            {show.lines.map((l) => (
              <p key={l.id} className="text-[15px] text-body-text dark:text-ink" data-testid="form-reveal-line" data-line={l.id}>
                {l.text}
              </p>
            ))}
            <CoralButton data-testid="form-reveal-close" className="mt-3 w-full" onClick={() => setShow(null)}>
              Keep going
            </CoralButton>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
