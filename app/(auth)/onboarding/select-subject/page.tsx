"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/layout/AuthCard";
import { OnboardingNav } from "@/components/onboarding/OnboardingNav";
import { OptionCard } from "@/components/ui/OptionCard";
import { OptionCardSkeleton } from "@/components/ui/OptionCardSkeleton";
import { StepProgress } from "@/components/ui/StepProgress";
import { GlobeIcon, FlaskIcon, CalculatorIcon, AtomIcon, LayersIcon } from "@/assets/icons";
import { getSubjectsByExam } from "@/lib/api/dashboard";
import type { Subject } from "@/lib/api/dashboard";
import { useOnboardingDraft } from "@/lib/onboarding/draft-context";
import { ONBOARDING_TOTAL_STEPS, stepPath } from "@/lib/onboarding/steps";
import { useStepTelemetry } from "@/lib/onboarding/useStepTelemetry";
import { toTitleCase } from "@/lib/utils/text";

const SUBJECT_ICONS: Record<string, ReactNode> = {
  PHY: <GlobeIcon />,
  CHEM: <FlaskIcon />,
  MATH: <CalculatorIcon />,
  BIO: <AtomIcon />,
};
const DEFAULT_ICON = <LayersIcon />;

/**
 * Part of step 1, for goals that do not imply their subjects (CUET, Boards). JEE, NEET and "both" skip it.
 */
export default function SelectSubjectPage() {
  const router = useRouter();
  const { draft, ready, update } = useOnboardingDraft();
  const completeStep = useStepTelemetry(1, "goal_subjects");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const examId = draft.goal.examId;

  useEffect(() => {
    if (!ready) return;
    if (!examId) {
      router.replace(stepPath(1));
      return;
    }
    getSubjectsByExam(examId)
      .then(({ data }) => setSubjects(data))
      .catch(() => setError("We couldn't load the subjects. Please refresh and try again."))
      .finally(() => setLoading(false));
  }, [ready, examId, router]);

  const selected = draft.goal.subjectIds;
  const toggle = (id: number) =>
    update((d) => ({
      ...d,
      goal: {
        ...d.goal,
        subjectIds: d.goal.subjectIds.includes(id) ? d.goal.subjectIds.filter((x) => x !== id) : [...d.goal.subjectIds, id],
      },
      // The syllabus changes with the subjects, so any chapters already ticked are cleared.
      chapters: { completedIds: [] },
    }));

  const handleNext = () => {
    if (selected.length === 0) return;
    update((d) => ({ ...d, step: Math.max(d.step, 2) }));
    completeStep();
    router.push(stepPath(2));
  };

  return (
    <AuthCard>
      <StepProgress step={1} totalSteps={ONBOARDING_TOTAL_STEPS} />

      <div className="mt-4 flex flex-col gap-3 py-2 sm:mt-5">
        <h1 className="text-[24px] font-extrabold leading-tight text-ink sm:text-[32px]">
          Pick your {draft.goal.examName ? `${draft.goal.examName} ` : ""}subjects
        </h1>
        <p className="text-[14px] font-semibold leading-snug text-muted sm:text-[16px]">
          We build your syllabus and your progress tracking from the subjects you choose.
        </p>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">
          {error}
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2" role="group" aria-label="Subjects">
        {(isLoading || !ready) && Array.from({ length: 4 }).map((_, index) => <OptionCardSkeleton key={index} compact />)}
        {!isLoading &&
          ready &&
          subjects.map((subject) => (
            <OptionCard
              key={subject.id}
              compact
              icon={SUBJECT_ICONS[subject.code] ?? DEFAULT_ICON}
              title={toTitleCase(subject.name)}
              selected={selected.includes(subject.id)}
              onClick={() => toggle(subject.id)}
            />
          ))}
      </div>

      <OnboardingNav
        backHref={stepPath(1)}
        onNext={handleNext}
        nextDisabled={selected.length === 0}
        hint={selected.length === 0 && !isLoading && !error ? "Pick at least one subject to continue." : undefined}
      />
    </AuthCard>
  );
}
