"use client";

import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/layout/AuthCard";
import { OnboardingNav } from "@/components/onboarding/OnboardingNav";
import { RadioOption } from "@/components/ui/RadioOption";
import { Select } from "@/components/ui/Select";
import { StepProgress } from "@/components/ui/StepProgress";
import { coachingValid, type CoachingType } from "@/lib/onboarding/draft";
import { useOnboardingDraft, useStepGuard } from "@/lib/onboarding/draft-context";
import { ONBOARDING_TOTAL_STEPS, stepPath } from "@/lib/onboarding/steps";
import { useStepTelemetry } from "@/lib/onboarding/useStepTelemetry";

// The saved value is the label itself: it is what the profile page and the planner show.
const COACHING_NAME_OPTIONS = ["Aakash Institute", "Allen Career Institute", "FIITJEE", "Resonance", "PW", "Unacademy", "Narayana", "Other"].map(
  (label) => ({ value: label, label }),
);

const BATCH_OPTIONS = ["Morning Batch", "Evening Batch", "Weekend Batch", "Online Batch"].map((label) => ({ value: label, label }));

const RADIO_STYLE = {
  unselectedLabelClassName: "text-[#333333] dark:text-ink",
  unselectedBoxClassName: "dark:border-[#D1D5DB]! dark:shadow-[0px_1px_2px_0px_#1A1A4E0F]!",
  selectedBoxClassName: "dark:border-[#FFFFFF]!",
};

export default function WhereDoYouStudyPage() {
  const router = useRouter();
  const allowed = useStepGuard(3);
  const { draft, update } = useOnboardingDraft();
  const completeStep = useStepTelemetry(3, "coaching");
  const { coaching } = draft;

  if (!allowed) return null;

  const setType = (type: CoachingType) =>
    update((d) => ({
      ...d,
      // Only a coaching student has a coaching name and batch to keep.
      coaching: type === "COACHING" ? { ...d.coaching, type } : { type, name: "", batch: "" },
    }));
  const setField = (patch: Partial<typeof coaching>) => update((d) => ({ ...d, coaching: { ...d.coaching, ...patch } }));
  const valid = coachingValid(coaching);

  const handleNext = () => {
    if (!valid) return;
    update((d) => ({ ...d, step: Math.max(d.step, 4) }));
    completeStep();
    router.push(stepPath(4));
  };

  return (
    <AuthCard>
      <StepProgress step={3} totalSteps={ONBOARDING_TOTAL_STEPS} />

      <div className="mt-4 flex flex-col gap-3 py-2 sm:mt-5">
        <h1 className="text-[24px] font-extrabold leading-tight text-ink sm:text-[32px]">Do you attend coaching?</h1>
        <p className="text-[14px] font-semibold leading-snug text-neutral-text sm:text-[16px]">
          This tells us when you are in class and when you are free to study. Next, we will hand you a starter week that fits.
        </p>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:mt-6" role="radiogroup" aria-label="Coaching status">
        <RadioOption
          name="coachingStatus"
          value="coaching"
          label="Yes, I attend coaching"
          selected={coaching.type === "COACHING"}
          onSelect={() => setType("COACHING")}
          {...RADIO_STYLE}
        >
          <Select
            label="Coaching name"
            placeholder="Select your coaching"
            options={COACHING_NAME_OPTIONS}
            name="coachingName"
            value={coaching.name}
            onChange={(event) => setField({ name: event.target.value })}
          />
          <Select
            label="Batch (optional)"
            placeholder="Select your batch"
            options={BATCH_OPTIONS}
            name="batch"
            value={coaching.batch}
            onChange={(event) => setField({ batch: event.target.value })}
          />
        </RadioOption>

        <RadioOption
          name="coachingStatus"
          value="self-study"
          label="Online courses and self-study"
          selected={coaching.type === "ONLINE_SELF_PREP"}
          onSelect={() => setType("ONLINE_SELF_PREP")}
          {...RADIO_STYLE}
        />

        <RadioOption
          name="coachingStatus"
          value="self-prep"
          label="Self-prep only"
          selected={coaching.type === "SELF_PREP"}
          onSelect={() => setType("SELF_PREP")}
          {...RADIO_STYLE}
        />
      </div>

      <OnboardingNav
        backHref={stepPath(2)}
        onNext={handleNext}
        nextDisabled={!valid}
        hint={!valid ? "Choose your coaching to continue." : undefined}
      />
    </AuthCard>
  );
}
