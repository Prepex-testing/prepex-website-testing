"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/layout/AuthCard";
import { OnboardingNav } from "@/components/onboarding/OnboardingNav";
import { OptionCard } from "@/components/ui/OptionCard";
import { OptionCardSkeleton } from "@/components/ui/OptionCardSkeleton";
import { StepProgress } from "@/components/ui/StepProgress";
import { LayersIcon, BookIcon, RadarIcons, BriefcaseIcons, CuteIcon } from "@/assets/icons";
import { getExams } from "@/lib/api/dashboard";
import type { Exam } from "@/lib/api/dashboard";
import { useOnboardingDraft } from "@/lib/onboarding/draft-context";
import { DEFAULT_GOAL_SUBTITLE, GOAL_SUBTITLES, needsSubjectPick, sortExams } from "@/lib/onboarding/goal";
import { ONBOARDING_TOTAL_STEPS, SELECT_SUBJECT_PATH, stepPath } from "@/lib/onboarding/steps";
import { useStepTelemetry } from "@/lib/onboarding/useStepTelemetry";

const GOAL_ICONS: Record<string, ReactNode> = {
  JEE_MAIN: <RadarIcons />,
  "JEE_MAIN+ADVANCED": <LayersIcon />,
  NEET: <BriefcaseIcons />,
  JEE_AND_NEET: <LayersIcon />,
  CUET: <CuteIcon />,
  BOARDS: <BookIcon />,
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
      .then(({ data }) => setExams(sortExams(data)))
      .catch(() => setError("We couldn't load the exams. Please refresh and try again."))
      .finally(() => setLoading(false));
  }, []);

  // First visit: the first option is selected, so Next is one tap away. A saved choice always wins.
  const selectedId = draft.goal.examId ?? (ready ? (exams[0]?.id ?? null) : null);
  const selectedExam = exams.find((exam) => exam.id === selectedId) ?? null;

  const choose = (exam: Exam) => {
    update((d) => {
      const changed = d.goal.examId !== exam.id;
      return {
        ...d,
        // A different goal means a different syllabus: the subject pick and any chapters already ticked no longer apply.
        goal: { examId: exam.id, examCode: exam.code, examName: exam.name, subjectIds: changed ? [] : d.goal.subjectIds },
        chapters: changed ? { completedIds: [] } : d.chapters,
      };
    });
  };

  const handleNext = () => {
    if (!selectedExam) return;
    update((d) => ({
      ...d,
      goal:
        d.goal.examId === selectedExam.id
          ? d.goal
          : { examId: selectedExam.id, examCode: selectedExam.code, examName: selectedExam.name, subjectIds: [] },
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
        {(isLoading || !ready) && Array.from({ length: 4 }).map((_, index) => <OptionCardSkeleton key={index} />)}
        {!isLoading &&
          ready &&
          exams.map((exam) => (
            <OptionCard
              key={exam.id}
              icon={GOAL_ICONS[exam.code.toUpperCase()] ?? <CuteIcon />}
              title={exam.name}
              subtitle={GOAL_SUBTITLES[exam.code.toUpperCase()] ?? DEFAULT_GOAL_SUBTITLE}
              selected={selectedId === exam.id}
              onClick={() => choose(exam)}
            />
          ))}
      </div>

      <OnboardingNav
        onNext={handleNext}
        nextDisabled={!selectedExam}
        hint={!selectedExam && !isLoading && !error ? "Pick what you are preparing for to continue." : undefined}
      />
    </AuthCard>
  );
}
