"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { PexoBubble, usePexoLine } from "@/components/pexo/PexoBubble";
import type { PexoQuest } from "@/lib/api/pexo";
import { pexoHasMark, pexoMark, pexoReact, pexoSay, usePexo } from "@/lib/pexo/store";

/** What each quest is called on the card, and where its tile takes the student. Detection is always the real event. */
export const QUEST_TILES: Record<PexoQuest, { label: string; href: string }> = {
  focus: { label: "Finish a focus session", href: "/focus/start?origin=standalone" },
  dayclose: { label: "Close your day", href: "/home" },
  revision: { label: "Tick a revision", href: "/logs/revision" },
  mistake: { label: "Save a mistake", href: "/notebooks/capture" },
  practice: { label: "Log your questions", href: "/logs/practice" },
  backlog: { label: "Add a backlog chapter", href: "/logs/backlog" },
  friend: { label: "Follow a friend", href: "/home/leaderboard" },
};
const ORDER: PexoQuest[] = ["focus", "dayclose", "revision", "mistake", "practice", "backlog", "friend"];
export const QUEST_XP = 25;

/**
 * "Your Prepex map": the seven starter quests, all open from day one. A quest ticks itself when the student really
 * does the thing (nothing is ticked by hand); Pexo recommends one a day. When all seven are done the card says so once
 * (the badge arrives through the usual reward moment) and then it is gone for good.
 */
export function PrepexMap() {
  const { enabled, state } = usePexo();
  const quests = state?.quests ?? null;
  const recommend = usePexoLine(quests?.recommend ? `quest.${quests.recommend}.recommend` : null, {}, quests?.recommend ?? "");
  const [title, setTitle] = useState("Your Prepex map");
  const [farewell, setFarewell] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the card's title is a library line, read once
    setTitle(pexoSay("quest.map.title", {}, { silent: true })?.text ?? "Your Prepex map");
  }, [enabled, state?.language]);

  // all seven done: say it once, then the card never comes back
  const allDone = quests?.allDone === true;
  useEffect(() => {
    if (!allDone || pexoHasMark("quest.all_done")) return;
    if (pexoMark("quest.all_done", true)) {
      pexoReact("quest.all_done", {}, { kind: "celebration" });
      // eslint-disable-next-line react-hooks/set-state-in-effect -- shown for this visit only
      setFarewell(true);
    }
  }, [allDone]);

  if (!enabled || !quests) return null;
  if (allDone && !farewell) return null;

  const done = new Set(quests.done);
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-surface-elevated p-4" aria-label={title} data-testid="prepex-map">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[16px] font-extrabold text-ink">{title}</h2>
        <p className="text-[12px] font-semibold text-muted" data-testid="prepex-map-count">
          {quests.done.length} of {ORDER.length} · +{QUEST_XP} XP each
        </p>
      </div>
      {recommend && <PexoBubble pick={recommend} size={48} testId="prepex-map-recommend" />}
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {ORDER.map((q) => {
          const isDone = done.has(q);
          const body = (
            <>
              <span aria-hidden className={`flex size-6 shrink-0 items-center justify-center rounded-full ${isDone ? "bg-success text-white" : "border border-border-strong"}`}>
                {isDone && <Check size={14} strokeWidth={3} />}
              </span>
              <span className={`min-w-0 text-[13px] font-semibold ${isDone ? "text-muted line-through" : "text-ink"}`}>{QUEST_TILES[q].label}</span>
            </>
          );
          return (
            <li key={q} data-testid={`quest-${q}`} data-done={isDone} data-recommended={quests.recommend === q}>
              {isDone ? (
                <div className="flex min-h-11 items-center gap-2 rounded-xl border border-border-subtle px-3 py-2">{body}</div>
              ) : (
                <Link href={QUEST_TILES[q].href} className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 transition-colors hover:bg-surface-elevated-2 ${quests.recommend === q ? "border-brand" : "border-border-subtle"}`}>
                  {body}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
