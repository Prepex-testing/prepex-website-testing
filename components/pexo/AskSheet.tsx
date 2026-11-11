"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PexoBubble } from "@/components/pexo/PexoBubble";
import { GhostButton, GHOST_CLASSES } from "@/components/ui/GhostButton";
import { Modal } from "@/components/ui/Modal";
import { askPexo, type PexoAskAnswer } from "@/lib/api/pexo";
import { startFocusSession } from "@/lib/focus/startFocusSession";
import type { PexoPick } from "@/lib/pexo/engine";
import { pexoEvent, pexoSay, type PexoAction } from "@/lib/pexo/store";

const QUICK_LINKS = [
  { label: "Log a mock", href: "/logs/mocks" },
  { label: "My backlog", href: "/logs/backlog" },
  { label: "My notebooks", href: "/notebooks" },
  { label: "Timetable", href: "/timetable" },
  { label: "Goals", href: "/goals" },
];

const ORIGIN = { backlog: "backlog_tab", revision: "revision_tab" } as const;

/** What the answer's button does: open the timer already filled in, or follow a link. */
export function askActions(answer: PexoAskAnswer, close: () => void): PexoAction[] {
  const a = answer.action;
  if (!a) return [];
  if (a.kind === "link") return [{ label: a.label, href: a.href, onClick: close, testId: "ask-go" }];
  return [
    {
      label: a.label,
      testId: "ask-go",
      onClick: () => {
        pexoEvent("bubble_action", { trigger: answer.trigger });
        close();
        startFocusSession({
          originSource: a.taskId ? "planner" : a.taskType === "backlog" ? ORIGIN.backlog : a.taskType === "revision" ? ORIGIN.revision : "home_quick_tile",
          ...(a.taskId ? { originId: a.taskId } : {}),
          ...(a.subjectId !== undefined ? { subject: String(a.subjectId) } : {}),
          ...(a.chapterId ? { chapter: a.chapterId } : {}),
          taskType: a.taskType === "backlog" ? "self_study" : a.taskType,
          targetMinutes: a.minutes,
        });
      },
    },
  ];
}

/**
 * "What should I do now?": Pexo's one deterministic answer from the student's own data (one request, when the sheet
 * opens), then Pexo's playbook and a few quick links. Nothing here is generated: every sentence is a library line.
 */
export function AskSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [answer, setAnswer] = useState<{ pick: PexoPick; data: PexoAskAnswer } | null>(null);
  const [failed, setFailed] = useState(false);
  const [text, setText] = useState<{ title: string; playbook: string; steps: string[] } | null>(null);

  useEffect(() => {
    if (!open) return;
    let live = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the sheet's static lines, read once when it opens
    setText({
      title: pexoSay("ask.title", {}, { silent: true })?.text ?? "What should I do now?",
      playbook: pexoSay("playbook.0", {}, { silent: true })?.text ?? "Pexo's playbook",
      steps: [1, 2, 3, 4, 5, 6].map((i) => pexoSay(`playbook.${i}`, {}, { silent: true })?.text).filter((t): t is string => Boolean(t)),
    });
    setAnswer(null);
    setFailed(false);
    askPexo().then(
      (data) => {
        if (!live || !data) return;
        const pick = pexoSay(data.trigger, data.context);
        if (pick) setAnswer({ pick, data });
        else setFailed(true);
      },
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} ariaLabel={text?.title ?? "What should I do now?"}>
      <div className="flex flex-col gap-4" data-testid="ask-sheet">
        <h2 className="text-lg font-bold text-ink">{text?.title}</h2>
        {answer ? (
          <PexoBubble pick={answer.pick} actions={askActions(answer.data, onClose)} testId="ask-answer" />
        ) : failed ? (
          <p className="text-[14px] text-muted" role="alert">We couldn&apos;t check your plan just now. Please try again.</p>
        ) : (
          <div className="skeleton h-16 rounded-2xl" aria-label="Checking your plan" />
        )}

        {text && text.steps.length > 0 && (
          <section aria-label={text.playbook} data-testid="ask-playbook">
            <p className="text-[13px] font-bold text-ink">{text.playbook}</p>
            <ol className="mt-2 flex flex-col gap-1.5">
              {text.steps.map((s, i) => (
                <li key={s} className="flex gap-2 text-[13px] text-body-text dark:text-ink">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-tint-strong text-[11px] font-bold text-ink">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
          </section>
        )}

        <nav aria-label="Quick links" className="flex flex-wrap gap-2" data-testid="ask-links">
          {QUICK_LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={onClose} className={`${GHOST_CLASSES} !min-h-11 !px-3.5 !py-2 !text-[13px]`}>
              {l.label}
            </Link>
          ))}
        </nav>
        <GhostButton onClick={onClose} className="self-end">Close</GhostButton>
      </div>
    </Modal>
  );
}
