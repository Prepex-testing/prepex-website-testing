"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/layout/AuthCard";
import { Button } from "@/components/ui/Button";
import { RadioOption } from "@/components/ui/RadioOption";
import { Select } from "@/components/ui/Select";
import { StepProgress } from "@/components/ui/StepProgress";
import { UploadDropzone } from "@/components/ui/UploadDropzone";
import { CheckIcon } from "@/components/ui/icons";
import {
  getOnboardingProgress,
  saveCoachingProfile,
  skipOnboardingStep,
  uploadScheduleImage,
} from "@/lib/api/onboarding";
import type { OnboardingProfile } from "@/lib/api/onboarding";
import { ApiError } from "@/lib/api/http";
import { useScheduleSuggestion } from "@/lib/onboarding/schedule-suggestion-context";

type CoachingStatus = "coaching" | "self-study" | "self-prep";

const COACHING_TYPE_MAP: Record<CoachingStatus, "COACHING" | "SELF_PREP" | "ONLINE_SELF_PREP"> = {
  coaching: "COACHING",
  "self-study": "ONLINE_SELF_PREP",
  "self-prep": "SELF_PREP",
};

const COACHING_STATUS_FROM_TYPE: Record<
  NonNullable<OnboardingProfile["coachingType"]>,
  CoachingStatus
> = {
  COACHING: "coaching",
  ONLINE_SELF_PREP: "self-study",
  SELF_PREP: "self-prep",
};

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
  const router = useRouter();
  const [status, setStatus] = useState<CoachingStatus>("coaching");
  const [coachingName, setCoachingName] = useState("");
  const [batch, setBatch] = useState("");
  const [hasScheduleUpload, setHasScheduleUpload] = useState(false);
  const [hadScheduleUploadOnFile, setHadScheduleUploadOnFile] = useState(false);
  const [isUploadingSchedule, setUploadingSchedule] = useState(false);
  const [uploadSummary, setUploadSummary] = useState<string | null>(null);
  const [uploadParsed, setUploadParsed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const [isSkipping, setSkipping] = useState(false);
  const { setSuggestion } = useScheduleSuggestion();

  useEffect(() => {
    getOnboardingProgress()
      .then(({ data }) => {
        const profile = data.profile;
        if (!profile) return;

        if (profile.coachingType) setStatus(COACHING_STATUS_FROM_TYPE[profile.coachingType]);
        if (profile.coachingName) {
          const matched = COACHING_NAME_OPTIONS.find(
            (option) => option.label === profile.coachingName,
          );
          if (matched) setCoachingName(matched.value);
        }
        if (profile.batchName) {
          const matched = BATCH_OPTIONS.find((option) => option.label === profile.batchName);
          if (matched) setBatch(matched.value);
        }
        setHasScheduleUpload(profile.hasScheduleUpload);
        setHadScheduleUploadOnFile(profile.hasScheduleUpload);
      })
      .catch(() => {
        // Best-effort — fall back to a blank form if progress can't be loaded.
      });
  }, []);

  const handleContinue = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await saveCoachingProfile({
        coachingType: COACHING_TYPE_MAP[status],
        ...(status === "coaching" && {
          coachingName: COACHING_NAME_OPTIONS.find((o) => o.value === coachingName)?.label,
          batchName: BATCH_OPTIONS.find((o) => o.value === batch)?.label,
        }),
        hasScheduleUpload,
      });
      router.push("/onboarding/time-selection");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Something went wrong. Please try again.",
      );
      setSubmitting(false);
    }
  };

  const handleSkip = async () => {
    setError(null);
    setSkipping(true);
    try {
      await skipOnboardingStep(3);
      router.push("/onboarding/time-selection");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Something went wrong. Please try again.",
      );
      setSkipping(false);
    }
  };

  const handleFileSelect = async (file: File | null) => {
    if (!file) {
      setHasScheduleUpload(false);
      return;
    }

    setError(null);
    setUploadSummary(null);
    setUploadParsed(false);
    setUploadingSchedule(true);
    try {
      const { data } = await uploadScheduleImage(file);
      const { suggestedChronotype: chronotype, suggestedStudyWindows: studyWindows } = data;
      setHasScheduleUpload(true);
      setUploadSummary(data.summary);

      if (chronotype !== null && studyWindows !== null) {
        setUploadParsed(true);
        setSuggestion({ chronotype, studyWindows });
      } else {
        setUploadParsed(false);
      }
    } catch (err) {
      setHasScheduleUpload(false);
      setError(
        err instanceof ApiError ? err.message : "Couldn't read that schedule. Please try again.",
      );
    } finally {
      setUploadingSchedule(false);
    }
  };

  const showScheduleUpload = status === "coaching" || status === "self-study";

  return (
    <AuthCard>
      <StepProgress
        step={3}
        totalSteps={5}
        backHref="/onboarding/tell-us-about-you"
        showSkip
        onSkip={handleSkip}
        skipDisabled={isSubmitting || isSkipping}
      />

      <div className="mt-4 flex flex-col gap-1">
        <h1 className="text-h1 text-ink">Do you attend coaching?</h1>
        <p className="text-sm text-muted">
          Tells us when you&apos;re in lecture vs free for self-study.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger"
        >
          {error}
        </p>
      )}

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
            value={coachingName}
            onChange={(event) => setCoachingName(event.target.value)}
          />
          <Select
            label="Batch"
            required
            placeholder="Select Batch"
            options={BATCH_OPTIONS}
            name="batch"
            value={batch}
            onChange={(event) => setBatch(event.target.value)}
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

      {showScheduleUpload && (
        <>
          <p className="mt-4 text-center text-xs text-muted">or</p>

          <div className="mt-4 rounded-xl  p-4">
            <p className="text-sm font-semibold text-ink">
              Got a schedule screenshot?
            </p>
            <p className="text-xs text-muted">
              Lets us auto-build your timetable in 30 seconds instead of 5 minutes.
            </p>

            <div className="mt-3">
              <UploadDropzone onFileSelect={handleFileSelect} />
            </div>

            {isUploadingSchedule && (
              <p className="mt-2 text-xs text-muted">Reading your schedule...</p>
            )}

            {uploadSummary && (
              <p
                className={`mt-2 text-xs font-medium ${uploadParsed ? "text-success" : "text-danger"}`}
              >
                {uploadSummary}
              </p>
            )}

            {!uploadSummary && hadScheduleUploadOnFile && (
              <p className="mt-2 text-xs font-medium text-success">
                Schedule already on file from a previous step
              </p>
            )}

            <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-success">
              <CheckIcon />
              Saves 5 mins vs manual entry
            </p>
          </div>
        </>
      )}

      <Button
        variant="primary"
        onClick={handleContinue}
        disabled={isSubmitting || isSkipping || isUploadingSchedule}
        className="mt-6 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Saving..." : "Continue"}
      </Button>
    </AuthCard>
  );
}
