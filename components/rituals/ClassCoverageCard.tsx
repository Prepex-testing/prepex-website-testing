"use client";

import { useCallback, useEffect, useState } from "react";
import { CoverageChips } from "@/components/rituals/CoverageChips";
import { getPendingCoverage, submitCoverage, type PendingCoverage } from "@/lib/api/rituals";
import { PexoBubble, usePexoLine } from "@/components/pexo/PexoBubble";
import { reactQuickLog } from "@/lib/pexo/reactions";
import { refreshXp } from "@/lib/rewards/events";

/**
 * Home: one card per coaching class that has ended (or lecture finished) without an answer. Nothing shows when there is
 * nothing to ask. The same prompt also arrives as an in-app notification.
 */
export function ClassCoverageCard({ prompts, onChanged }: { prompts?: PendingCoverage[]; onChanged?: () => void }) {
  const [pending, setPending] = useState<PendingCoverage[]>(prompts ?? []);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (prompts) {
      setPending(prompts);
      return;
    }
    let alive = true;
    void getPendingCoverage()
      .then((rows) => {
        if (alive) setPending(rows);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [prompts]);

  const answer = useCallback(
    async (p: PendingCoverage, body: { chapterId?: string; lectureNumber?: number | null; skip?: boolean }) => {
      setBusy(true);
      try {
        await submitCoverage({ blockKey: p.blockKey, date: p.date, ...body });
        if (!body.skip) reactQuickLog();
        setPending((rows) => rows.filter((r) => r.blockKey !== p.blockKey));
        onChanged?.();
        void refreshXp();
      } catch {
        /* the card stays; the student can try again */
      } finally {
        setBusy(false);
      }
    },
    [onChanged],
  );

  const ask = usePexoLine(pending.length > 0 ? "log.class_covered" : null, {}, "class-coverage");
  if (pending.length === 0) return null;
  return (
    <div className="flex flex-col gap-3" data-testid="class-coverage" id="class-coverage">
      {ask && <PexoBubble pick={ask} size={48} testId="class-coverage-pexo" />}
      {pending.map((p) => (
        <CoverageChips
          key={p.blockKey}
          testId="coverage"
          title={p.kind === "coaching_class" ? `What did ${p.label} cover?` : `Which chapter was "${p.label}"?`}
          hint={p.kind === "coaching_class" ? `${p.mode ? `${p.mode === "online" ? "Online" : "Offline"} class. ` : ""}One tap and your plan and revision follow it.` : "One tap updates your syllabus."}
          chapterIds={p.suggestedChapterIds}
          busy={busy}
          onPick={(pick) => void answer(p, pick)}
          onSkip={() => void answer(p, { skip: true })}
        />
      ))}
    </div>
  );
}
