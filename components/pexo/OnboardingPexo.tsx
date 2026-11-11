"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PexoBubble } from "@/components/pexo/PexoBubble";
import type { PexoPick } from "@/lib/pexo/engine";
import { useOnboardingDraft } from "@/lib/onboarding/draft-context";
import type { CurrentLevel } from "@/lib/onboarding/draft";
import { loadPexo, pexoEvent, pexoHasMark, pexoMark, pexoSay, usePexo } from "@/lib/pexo/store";

/**
 * Pexo narrating onboarding: an overlay keyed by the step's path. It reads the draft but never writes it, adds nothing
 * to the steps, and can be closed. When onboarding is redesigned, only this map needs updating.
 */
const STEP_BY_PATH: Record<string, string> = {
  "/onboarding/preparing-for": "goal",
  "/onboarding/select-subject": "goal",
  "/onboarding/tell-us-about-you": "about",
  "/onboarding/where-do-you-study": "coaching",
  "/onboarding/build-timetable": "timetable",
  "/onboarding/which-chapters-have-you-studied": "chapters",
};

const CLASS_REPLY: Partial<Record<CurrentLevel, string>> = { CLASS_11: "onb.class.11", CLASS_12: "onb.class.12", DROPPER_1: "onb.class.dropper", DROPPER_2: "onb.class.dropper" };
const HELLO = ["onb.hello.1", "onb.hello.2", "onb.hello.3"];

export function OnboardingPexo() {
  const pathname = usePathname() ?? "";
  const { enabled, state } = usePexo();
  const { draft, ready } = useOnboardingDraft();
  const step = STEP_BY_PATH[pathname] ?? null;
  const [hello, setHello] = useState(0);
  const [pick, setPick] = useState<PexoPick | null>(null);
  const [closed, setClosed] = useState<string | null>(null);
  const lastStep = useRef<string | null>(null);

  useEffect(() => {
    void loadPexo();
  }, []);

  // a step left behind is a step completed (the experiment counts them for both cohorts that have Pexo state)
  useEffect(() => {
    if (lastStep.current && step && lastStep.current !== step) pexoEvent("onboarding_step_completed", { step: lastStep.current });
    lastStep.current = step;
  }, [step]);

  const level = draft.about.currentLevel;
  const chapters = draft.chapters.completedIds.length;
  const helloDone = state ? pexoHasMark("onb.hello") : false;

  // which line this step says, re-chosen only when its facts change
  const key = `${step}|${step === "goal" ? (helloDone ? "done" : hello) : ""}|${step === "about" ? level : ""}|${step === "chapters" ? Math.min(chapters, 1) : ""}`;
  useEffect(() => {
    if (!enabled || !ready || !step) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- nothing to say outside the narrated steps
      setPick(null);
      return;
    }
    let trigger: string | readonly string[] | null = null;
    let context: Record<string, number> = {};
    if (step === "goal") trigger = helloDone ? null : HELLO[hello]!;
    else if (step === "about") trigger = CLASS_REPLY[level] ? [CLASS_REPLY[level]!] : "onb.class";
    else if (step === "coaching") trigger = "onb.coaching";
    else if (step === "timetable") trigger = "onb.timetable";
    else if (step === "chapters") {
      trigger = chapters > 0 ? "onb.chapters.after" : "onb.chapters";
      context = { n: chapters };
    }
    setPick(trigger ? pexoSay(trigger, context) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` captures the facts
  }, [enabled, ready, key]);

  if (!enabled || !pick || closed === key) return null;

  const isHello = step === "goal" && !helloDone;
  const next = () => {
    if (hello < HELLO.length - 1) setHello(hello + 1);
    else pexoMark("onb.hello", true);
  };
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(96px+env(safe-area-inset-bottom))] z-40 flex justify-center px-3 lg:bottom-6 lg:left-6 lg:right-auto lg:justify-start lg:px-0" data-testid="onboarding-pexo" data-step={step}>
      <div key={pick.id} className="motion-toast pointer-events-auto w-full max-w-[380px]">
        <PexoBubble
          pick={pick}
          size={isHello ? 96 : 48}
          floating
          actions={isHello ? [{ label: hello < HELLO.length - 1 ? "Next" : "Let's start", onClick: next, testId: "onboarding-pexo-next" }] : []}
          onDismiss={() => (isHello ? pexoMark("onb.hello", true) : setClosed(key))}
          testId="onboarding-pexo-bubble"
        />
      </div>
    </div>
  );
}
