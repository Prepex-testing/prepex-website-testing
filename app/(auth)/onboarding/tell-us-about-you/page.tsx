"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/layout/AuthCard";
import { OnboardingNav } from "@/components/onboarding/OnboardingNav";
import { DateInput } from "@/components/ui/DateInput";
import { Input } from "@/components/ui/Input";
import { OptionCard } from "@/components/ui/OptionCard";
import { StepProgress } from "@/components/ui/StepProgress";
import { GraduationCapIcon, StarIcons, LayersIcon } from "@/assets/icons";
import { aboutError, aboutValid, type CurrentLevel } from "@/lib/onboarding/draft";
import { useOnboardingDraft, useStepGuard } from "@/lib/onboarding/draft-context";
import { isClassTwelveOnly, needsSubjectPick } from "@/lib/onboarding/goal";
import { ONBOARDING_TOTAL_STEPS, SELECT_SUBJECT_PATH, stepPath } from "@/lib/onboarding/steps";
import { useStepTelemetry } from "@/lib/onboarding/useStepTelemetry";

const CLASSES: Array<{ id: CurrentLevel; title: string; subtitle?: string; icon: ReactNode }> = [
  { id: "CLASS_11", title: "Class 11", subtitle: "Two years to go", icon: <GraduationCapIcon /> },
  { id: "CLASS_12", title: "Class 12", subtitle: "Final school year", icon: <GraduationCapIcon /> },
  { id: "DROPPER_1", title: "Dropper (1st year)", subtitle: "Full-time preparation", icon: <StarIcons /> },
  { id: "DROPPER_2", title: "Dropper (2nd year)", subtitle: "Full-time preparation", icon: <LayersIcon /> },
  { id: "OTHER", title: "Other", icon: <StarIcons /> },
];

export default function TellUsAboutYouPage() {
  const router = useRouter();
  const allowed = useStepGuard(2);
  const { draft, update } = useOnboardingDraft();
  const completeStep = useStepTelemetry(2, "about_you");
  const { about, goal } = draft;

  const exam = goal.examCode ? { code: goal.examCode, name: goal.examName ?? "" } : null;
  // Boards and CUET are Class 12 exams: lock the picker to Class 12 rather than save a mismatched level.
  const classLocked = isClassTwelveOnly(exam);
  const hasSubjectScreen = exam ? needsSubjectPick(exam) : false;

  useEffect(() => {
    if (allowed && classLocked && about.currentLevel !== "CLASS_12") {
      update((d) => ({ ...d, about: { ...d.about, currentLevel: "CLASS_12" } }));
    }
  }, [allowed, classLocked, about.currentLevel, update]);

  if (!allowed) return null;

  const setAbout = (patch: Partial<typeof about>) => update((d) => ({ ...d, about: { ...d.about, ...patch } }));
  const valid = aboutValid(about);

  const handleNext = () => {
    if (!valid) return;
    update((d) => ({ ...d, step: Math.max(d.step, 3) }));
    completeStep();
    router.push(stepPath(3));
  };

  return (
    <AuthCard>
      <StepProgress step={2} totalSteps={ONBOARDING_TOTAL_STEPS} />

      <div className="mt-4 flex flex-col gap-3 py-2 sm:mt-5">
        <h1 className="text-[24px] font-extrabold leading-tight text-ink sm:text-[32px]">Tell us about you</h1>
        <p className="text-[14px] font-semibold leading-snug text-neutral-text sm:text-[16px]">
          We use this to fit your plan to your year and your exam date.
        </p>
      </div>

      <div className="mt-5 flex flex-col gap-6 sm:mt-6">
        <Input
          label="Full name"
          helperText="Used to greet you in your daily plan"
          name="fullName"
          type="text"
          placeholder="Rohan Sharma"
          value={about.fullName}
          onChange={(event) => setAbout({ fullName: event.target.value })}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="City"
            helperText="Used to match you with study partners nearby"
            name="city"
            type="text"
            placeholder="City"
            value={about.city}
            onChange={(event) => setAbout({ city: event.target.value })}
          />
          <Input
            label="Phone number (optional)"
            helperText="10 digits, only for account alerts"
            name="phone"
            type="tel"
            inputMode="numeric"
            maxLength={10}
            placeholder="Phone number"
            value={about.phoneNumber}
            onChange={(event) => setAbout({ phoneNumber: event.target.value.replace(/\D/g, "").slice(0, 10) })}
          />
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <p className="text-[14px] font-bold leading-tight text-body-text dark:text-ink sm:text-[16px]">Which class are you in?</p>
            <p className="mt-1 text-xs text-muted">
              {classLocked
                ? "Boards and CUET are Class 12 exams, so this is set to Class 12."
                : "This shapes how much of your day is school and how deep your plan goes."}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" role="group" aria-label="Current class">
            {CLASSES.map((item) => {
              const isDisabled = classLocked && item.id !== "CLASS_12";
              return (
                <OptionCard
                  key={item.id}
                  compact
                  icon={item.icon}
                  title={item.title}
                  subtitle={item.subtitle}
                  selected={about.currentLevel === item.id}
                  disabled={isDisabled}
                  onClick={isDisabled ? undefined : () => setAbout({ currentLevel: item.id })}
                  className={`${
                    about.currentLevel === item.id ? "dark:border! dark:border-[#FAF7F2]!" : "dark:border-[#8B8998]!"
                  } dark:shadow-[0px_2px_8px_0px_#1A1A4E14] ${item.id === "OTHER" ? "sm:col-span-2" : ""}`}
                />
              );
            })}
          </div>
        </div>

        <DateInput
          label="When is your exam?"
          helperText="Leave it blank and we will use the usual date for your year. It sets your countdown and your daily pace."
          name="examDate"
          defaultValue={about.examDate}
          onDateChange={(value) => setAbout({ examDate: value })}
          disablePast
        />
      </div>

      <OnboardingNav
        backHref={hasSubjectScreen ? SELECT_SUBJECT_PATH : stepPath(1)}
        onNext={handleNext}
        nextDisabled={!valid}
        hint={aboutError(about) ?? undefined}
      />
    </AuthCard>
  );
}
