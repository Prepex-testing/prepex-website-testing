"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Stethoscope } from "lucide-react";
import { AuthCard } from "@/components/layout/AuthCard";
import { StepFooter } from "@/components/onboarding/StepFooter";
import { OptionCard } from "@/components/ui/OptionCard";
import { OptionCardSkeleton } from "@/components/ui/OptionCardSkeleton";
import { StepProgress } from "@/components/ui/StepProgress";
import { LayersIcon, RadarIcons, CuteIcon } from "@/assets/icons";
import { getExams } from "@/lib/api/dashboard";
import type { Exam } from "@/lib/api/dashboard";
import { useOnboardingDraft } from "@/lib/onboarding/draft-context";
import { examForOption, GOAL_OPTIONS, goalOption, needsSubjectPick, optionForExam } from "@/lib/onboarding/goal";
import type { GoalOption, GoalOptionKey } from "@/lib/onboarding/goal";
import { ONBOARDING_TOTAL_STEPS, SELECT_SUBJECT_PATH, stepPath } from "@/lib/onboarding/steps";
import { useStepTelemetry } from "@/lib/onboarding/useStepTelemetry";

const GOAL_ICONS: Record<GoalOptionKey, ReactNode> = {
  JEE_MAIN: <RadarIcons />,
  JEE_ADVANCED: <CuteIcon />,
  JEE_BOTH: <LayersIcon />,
  NEET: <Stethoscope aria-hidden className="h-6 w-6" />,
};

export default function PreparingForPage() {
  const router = useRouter();
  const { draft, ready, update } = useOnboardingDraft();
  const completeStep = useStepTelemetry(1, "goal");
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getExams()
      .then(({ data }) => setExams(data))
      .catch(() => setError("We couldn't load the exams. Please refresh and try again."))
      .finally(() => setLoading(false));
  }, []);

  // An option can only be picked once the exam behind it exists.
  const examFor = (option: GoalOption) => examForOption(option, exams);

  // A saved pick always wins. A saved exam from before the cards changed is matched to its card when there is one.
  // On a first visit the first available card is selected, so Next is one tap away.
  const savedExam = exams.find((exam) => exam.id === draft.goal.examId) ?? null;
  const firstAvailable = GOAL_OPTIONS.find((option) => examFor(option)) ?? null;
  const selectedKey: GoalOptionKey | null =
    draft.goal.option ?? optionForExam(savedExam) ?? (ready && !draft.goal.examId ? (firstAvailable?.key ?? null) : null);
  const selected = goalOption(selectedKey);
  const selectedExam = selected ? examFor(selected) : null;

  const choose = (option: GoalOption, exam: Exam) => {
    update((d) => {
      const changed = d.goal.examId !== exam.id;
      return {
        ...d,
        // A different exam means a different syllabus: the subject pick and any chapters already ticked no longer apply.
        // Switching between "JEE Advanced" and "Both" keeps both, since they are the same exam.
        goal: {
          examId: exam.id,
          examCode: exam.code,
          examName: exam.name,
          subjectIds: changed ? [] : d.goal.subjectIds,
          option: option.key,
        },
        chapters: changed ? { completedIds: [] } : d.chapters,
      };
    });
  };

  const handleNext = () => {
    if (!selected || !selectedExam) return;
    update((d) => ({
      ...d,
      goal:
        d.goal.examId === selectedExam.id && d.goal.option === selected.key
          ? d.goal
          : {
              examId: selectedExam.id,
              examCode: selectedExam.code,
              examName: selectedExam.name,
              subjectIds: d.goal.examId === selectedExam.id ? d.goal.subjectIds : [],
              option: selected.key,
            },
      step: Math.max(d.step, 2),
    }));
    completeStep();
    router.push(needsSubjectPick(selectedExam) ? SELECT_SUBJECT_PATH : stepPath(2));
  };

  return (
    <AuthCard>
      <StepProgress step={1} totalSteps={ONBOARDING_TOTAL_STEPS} />

      <div className="mt-4 flex flex-col gap-3 py-2 sm:mt-5">
        <h1 className="text-[24px] font-extrabold leading-tight text-ink sm:text-[32px]">I&apos;m preparing for</h1>
        <p className="text-[14px] font-semibold leading-snug text-neutral-text sm:text-[16px]">
          This sets your syllabus, your mock tests and who you get matched with.
        </p>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3" role="group" aria-label="What are you preparing for?">
        {(isLoading || !ready) && GOAL_OPTIONS.map((option) => <OptionCardSkeleton key={option.key} />)}
        {!isLoading &&
          ready &&
          GOAL_OPTIONS.map((option) => {
            const exam = examFor(option);
            return (
              <OptionCard
                key={option.key}
                icon={GOAL_ICONS[option.key]}
                title={option.title}
                subtitle={exam ? option.subtitle : "Coming soon"}
                selected={selectedKey === option.key}
                disabled={!exam}
                onClick={exam ? () => choose(option, exam) : undefined}
              />
            );
          })}
      </div>

      <StepFooter
        onNext={handleNext}
        nextDisabled={!selectedExam}
        hint={!selectedExam && !isLoading && !error ? "Pick what you are preparing for to continue." : undefined}
      />
    </AuthCard>
  );
}
