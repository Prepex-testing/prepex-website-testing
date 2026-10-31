"use client";

import confetti from "canvas-confetti";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { CoralButton } from "@/components/ui/CoralButton";
import { RECORD_LABELS } from "@/lib/api/xp";
import { onReward, primeXp, type RewardEvent } from "@/lib/rewards/events";
import { getXpSummary } from "@/lib/api/xp";

type Moment = { id: number; kind: "level_up" | "badges"; title: string; lines: string[] };

let nextId = 1;

/**
 * The reward moments, mounted once in the app shell. An XP pop-up is a pill that rises and fades in about a second; a
 * level-up or a badge is a full-screen moment with confetti. Confetti is only for those two, it is skipped when the
 * student prefers reduced motion, and nothing here ever blocks the screen underneath for long.
 */
export function RewardsLayer() {
  const reduce = useReducedMotion();
  const [pop, setPop] = useState<{ id: number; text: string } | null>(null);
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const [moments, setMoments] = useState<Moment[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // learn the starting XP once, so the first refresh after a tick reports only what that tick earned
  useEffect(() => {
    let alive = true;
    void getXpSummary()
      .then((s) => {
        if (alive) primeXp(s);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  useEffect(() => {
    const off = onReward((e: RewardEvent) => {
      if (e.type === "xp" && e.amount > 0) {
        const id = nextId++;
        setPop({ id, text: `+${e.amount} XP` });
        later(() => setPop((p) => (p?.id === id ? null : p)), 1300);
      } else if (e.type === "level_up") {
        setMoments((m) => [...m, { id: nextId++, kind: "level_up", title: `Level ${e.level}`, lines: [e.title] }]);
      } else if (e.type === "badges") {
        setMoments((m) => [...m, { id: nextId++, kind: "badges", title: e.badges.length === 1 ? "New badge" : `${e.badges.length} new badges`, lines: e.badges.map((b) => `${b.title}: ${b.description}`) }]);
      } else if (e.type === "record") {
        const meta = RECORD_LABELS[e.kind];
        const id = nextId++;
        setToasts((t) => [...t, { id, text: `New record: ${meta.label} ${e.value}${meta.unit}` }]);
        later(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
      }
    });
    const pending = timers.current;
    return () => {
      off();
      pending.forEach(clearTimeout);
    };
  }, [later]);

  const current = moments[0] ?? null;
  useEffect(() => {
    if (!current) return;
    // confetti only here (level-ups and badges), and not at all under reduced motion
    confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 }, disableForReducedMotion: true, colors: ["#FF6B47", "#FAF7F2", "#2F6BFF"] });
  }, [current]);

  return (
    <>
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-[70] flex flex-col items-center gap-2 lg:bottom-8">
        <AnimatePresence>
          {pop && (
            <motion.div
              key={pop.id}
              data-testid="xp-pop"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.92 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -14 }}
              transition={{ duration: 0.28 }}
              className="rounded-full border border-border-subtle bg-surface-elevated-2 px-4 py-2 text-[15px] font-extrabold text-ink shadow-lg"
            >
              {pop.text}
            </motion.div>
          )}
        </AnimatePresence>
        {toasts.map((t) => (
          <div key={t.id} role="status" data-testid="record-toast" className="rounded-xl border border-border-subtle bg-surface-elevated-2 px-4 py-2 text-[14px] font-semibold text-ink shadow-lg">
            {t.text}
          </div>
        ))}
      </div>

      <AnimatePresence>
        {current && (
          <motion.div
            key={current.id}
            role="dialog"
            aria-modal="true"
            aria-label={current.title}
            data-testid="reward-moment"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.25 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-6"
          >
            <motion.div
              initial={reduce ? false : { scale: 0.9, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="flex w-full max-w-[360px] flex-col items-center gap-3 rounded-3xl border border-border-subtle bg-surface-elevated-2 p-8 text-center"
            >
              <p className="text-[13px] font-semibold uppercase tracking-wide text-muted">{current.kind === "level_up" ? "Level up" : "Badge earned"}</p>
              <p className="text-[34px] font-extrabold leading-tight text-ink">{current.title}</p>
              {current.lines.map((l) => (
                <p key={l} className="text-[15px] text-body-text dark:text-ink">
                  {l}
                </p>
              ))}
              <CoralButton data-testid="reward-continue" className="mt-3 w-full" onClick={() => setMoments((m) => m.slice(1))}>
                Keep going
              </CoralButton>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
