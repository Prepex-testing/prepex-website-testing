"use client";

import { useState } from "react";
import { AuthCard } from "@/components/layout/AuthCard";
import { Button } from "@/components/ui/Button";
import { RadioOption } from "@/components/ui/RadioOption";
import { Select } from "@/components/ui/Select";
import { StepProgress } from "@/components/ui/StepProgress";
import { UploadDropzone } from "@/components/ui/UploadDropzone";
import { CheckIcon } from "@/components/ui/icons";

type CoachingStatus = "coaching" | "self-study" | "self-prep";

const COACHING_NAME_OPTIONS = [
  { value: "aakash", label: "Aakash Institute" },
  { value: "allen", label: "Allen Career Institute" },
  { value: "fiitjee", label: "FIITJEE" },
  { value: "resonance", label: "Resonance" },
  { value: "other", label: "Other" },
];

const BATCH_OPTIONS = [
  { value: "morning", label: "Morning Batch" },
  { value: "evening", label: "Evening Batch" },
  { value: "weekend", label: "Weekend Batch" },
  { value: "online", label: "Online Batch" },
];

export default function WhereDoYouStudyPage() {
  const [status, setStatus] = useState<CoachingStatus>("coaching");

  return (
    <AuthCard>
      <StepProgress
        step={3}
        totalSteps={5}
        backHref="/onboarding/tell-us-about-you"
        showSkip
        skipHref="/onboarding/time-selection"
      />

      <div className="mt-4 flex flex-col gap-1">
        <h1 className="text-h1 text-ink">Do you attend coaching?</h1>
        <p className="text-sm text-muted">
          Tells us when you&apos;re in lecture vs free for self-study.
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-3" role="radiogroup" aria-label="Coaching status">
        <RadioOption
          name="coachingStatus"
          value="coaching"
          label="Yes, I'm in a coaching"
          selected={status === "coaching"}
          onSelect={() => setStatus("coaching")}
        >
          <Select
            label="Coaching Name"
            required
            placeholder="Select Coaching"
            options={COACHING_NAME_OPTIONS}
            name="coachingName"
          />
          <Select
            label="Batch"
            required
            placeholder="Select Batch"
            options={BATCH_OPTIONS}
            name="batch"
          />
        </RadioOption>

        <RadioOption
          name="coachingStatus"
          value="self-study"
          label="Online courses + self-study"
          selected={status === "self-study"}
          onSelect={() => setStatus("self-study")}
        />

        <RadioOption
          name="coachingStatus"
          value="self-prep"
          label="Self-prep only"
          selected={status === "self-prep"}
          onSelect={() => setStatus("self-prep")}
        />
      </div>

      <p className="mt-4 text-center text-xs text-muted">or</p>

      <div className="mt-4 rounded-xl  p-4">
        <p className="text-sm font-semibold text-ink">
          Got a schedule screenshot?
        </p>
        <p className="text-xs text-muted">
          Lets us auto-build your timetable in 30 seconds instead of 5 minutes.
        </p>

        <div className="mt-3">
          <UploadDropzone />
        </div>

        <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-success">
          <CheckIcon />
          Saves 5 mins vs manual entry
        </p>
      </div>

      <Button href="/onboarding/time-selection" variant="primary" className="mt-6">
        Continue
      </Button>
    </AuthCard>
  );
}
