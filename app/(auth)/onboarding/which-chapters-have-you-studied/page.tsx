"use client";

import { useMemo, useState } from "react";
import { AuthCard } from "@/components/layout/AuthCard";
import { Accordion } from "@/components/ui/Accordion";
import { Button } from "@/components/ui/Button";
import { ChapterItem } from "@/components/ui/ChapterItem";
import { StepProgress } from "@/components/ui/StepProgress";
import { CheckCircleIcon, XIcon } from "@/components/ui/icons";

type ChapterState = "none" | "partial" | "done";

type Subject = {
  id: string;
  avatarLabel: string;
  title: string;
  chapters: string[];
};

const SUBJECTS: Subject[] = [
  {
    id: "physics",
    avatarLabel: "P",
    title: "Physics",
    chapters: [
      "Units & Measurements",
      "Kinematics",
      "Newton's Laws of Motion",
      "Work, Energy, Power",
      "Rotational Dynamics",
      "Gravitation",
      "SHM & Oscillations",
      "Waves",
      "Thermodynamics",
      "Kinetic Theory",
      "Electrostatics",
      "Current Electricity",
      "Magnetism",
      "EM Induction",
      "Ray Optics",
      "Wave Optics",
      "Modern Physics",
      "Semiconductor Devices",
    ],
  },
  {
    id: "chemistry",
    avatarLabel: "C",
    title: "Chemistry",
    chapters: [
      "Mole Concept",
      "Atomic Structure",
      "Chemical Bonding",
      "States of Matter",
      "Thermodynamics",
      "Chemical Equilibrium",
      "Ionic Equilibrium",
      "Redox Reactions",
      "Electrochemistry",
      "Chemical Kinetics",
      "Solid State",
      "Solutions",
      "s-Block Elements",
      "p-Block Elements",
      "d & f Block Elements",
      "Coordination Compounds",
      "Organic Chemistry Basics",
      "Biomolecules & Polymers",
    ],
  },
  {
    id: "maths",
    avatarLabel: "M",
    title: "Mathematics",
    chapters: [
      "Sets, Relations & Functions",
      "Complex Numbers",
      "Quadratic Equations",
      "Sequences & Series",
      "Permutations & Combinations",
      "Binomial Theorem",
      "Matrices & Determinants",
      "Trigonometric Ratios",
      "Trigonometric Equations",
      "Straight Lines",
      "Circles",
      "Conic Sections",
      "Limits & Continuity",
      "Differentiation",
      "Application of Derivatives",
      "Integration",
      "Vectors & 3D Geometry",
      "Probability & Statistics",
    ],
  },
];

const TOTAL_CHAPTERS = SUBJECTS.reduce((sum, subject) => sum + subject.chapters.length, 0);

function chapterKey(subjectId: string, chapter: string): string {
  return `${subjectId}:${chapter}`;
}

function createInitialState(): Record<string, ChapterState> {
  const state: Record<string, ChapterState> = {};
  for (const subject of SUBJECTS) {
    for (const chapter of subject.chapters) {
      state[chapterKey(subject.id, chapter)] = "none";
    }
  }
  state[chapterKey("physics", "Units & Measurements")] = "done";
  state[chapterKey("physics", "Kinematics")] = "partial";
  return state;
}

function cycleState(state: ChapterState): ChapterState {
  if (state === "none") return "partial";
  if (state === "partial") return "done";
  return "none";
}

export default function WhichChaptersHaveYouStudiedPage() {
  const [chapterState, setChapterState] = useState<Record<string, ChapterState>>(
    createInitialState,
  );

  const { markedCount, partialCount } = useMemo(() => {
    const values = Object.values(chapterState);
    return {
      markedCount: values.filter((value) => value !== "none").length,
      partialCount: values.filter((value) => value === "partial").length,
    };
  }, [chapterState]);

  const toggleChapter = (key: string) => {
    setChapterState((current) => ({ ...current, [key]: cycleState(current[key]) }));
  };

  const markAll = () => {
    setChapterState((current) => {
      const next = { ...current };
      for (const key of Object.keys(next)) next[key] = "done";
      return next;
    });
  };

  const clearAll = () => {
    setChapterState((current) => {
      const next = { ...current };
      for (const key of Object.keys(next)) next[key] = "none";
      return next;
    });
  };

  return (
    <AuthCard>
      <StepProgress
        step={5}
        totalSteps={5}
        backHref="/onboarding/time-selection"
        showSkip
        skipHref="/onboarding/analyzing"
      />

      <div className="mt-4 flex flex-col gap-1">
        <h1 className="text-h1 text-ink">Which chapters have you studied?</h1>
        <p className="text-sm text-muted">
          Tap to mark studied. Skip what you haven&apos;t touched. Even partial study
          counts
        </p>
      </div>

      <div className="mt-6 rounded-xl bg-tint-strong p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-ink">
              {String(markedCount).padStart(2, "0")}/{TOTAL_CHAPTERS} Chapters Marked
            </p>
            {partialCount > 0 && (
              <p className="text-xs text-muted">
                {partialCount} chapter{partialCount > 1 ? "s" : ""} marked as partial
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={markAll}
              className="flex items-center gap-1 text-xs font-semibold text-ink"
            >
              <CheckCircleIcon />
              Mark all
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="flex items-center gap-1 text-xs font-semibold text-muted"
            >
              <XIcon />
              Clear
            </button>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted">
          Marked chapters skip new learning and go to revision rotation. Unmarked
          chapters will be taught as new. Tap once to set a chapter as Partially
          Selected; tap again to mark it Done.
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {SUBJECTS.map((subject, index) => {
          const selectedCount = subject.chapters.filter(
            (chapter) => chapterState[chapterKey(subject.id, chapter)] !== "none",
          ).length;

          return (
            <Accordion
              key={subject.id}
              avatarLabel={subject.avatarLabel}
              title={subject.title}
              meta={`${String(selectedCount).padStart(2, "0")}/${subject.chapters.length} CHAPTERS SELECTED`}
              defaultOpen={index === 0}
            >
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {subject.chapters.map((chapter) => {
                  const key = chapterKey(subject.id, chapter);
                  return (
                    <ChapterItem
                      key={key}
                      title={chapter}
                      state={chapterState[key]}
                      onCycle={() => toggleChapter(key)}
                    />
                  );
                })}
              </div>
            </Accordion>
          );
        })}
      </div>

      <Button href="/onboarding/analyzing" variant="primary" className="mt-6">
        Skip &amp; Continue
      </Button>
    </AuthCard>
  );
}
