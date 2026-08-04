"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/layout/AuthCard";
import { Button } from "@/components/ui/Button";
import { OptionCard } from "@/components/ui/OptionCard";
import { OptionCardSkeleton } from "@/components/ui/OptionCardSkeleton";
import { StepProgress } from "@/components/ui/StepProgress";
import { LayersIcon, BookIcon, RadarIcons, BriefcaseIcons, CuteIcon } from "@/assets/icons";
import { getExams } from "@/lib/api/dashboard";
import { getOnboardingProgress, selectExam } from "@/lib/api/onboarding";
import { ApiError } from "@/lib/api/http";
import type { Exam } from "@/lib/api/dashboard";

const EXAM_META: Record<string, { subtitle: string; icon: ReactNode }> = {
  JEE_MAIN: { subtitle: "NITs, IIITs & GFTIs", icon: <RadarIcons /> },
  "JEE_MAIN+ADVANCED": { subtitle: "NITs, IIITs & GFTIs", icon: <LayersIcon /> },
  NEET: { subtitle: "Medical Entrance Exam", icon: <BriefcaseIcons /> },
  CUET: { subtitle: "Central University Entrance Test", icon: <CuteIcon /> },
  BOARDS: { subtitle: "Class 12 Boards", icon: <BookIcon /> },
};
const DEFAULT_META = { subtitle: "Personalized prep plan", icon: <CuteIcon /> };

// Exams that always need a subject pick, regardless of what the API reports —
// covers combo exams like JEE+CUET that share Boards/CUET's subject-selection flow.
const SUBJECT_SELECTION_EXAM_CODES = new Set(["CUET", "BOARDS", "JEE+CUET"]);

export default function PreparingForPage() {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([getExams(), getOnboardingProgress().catch(() => null)])
      .then(([{ data }, progress]) => {
        setExams(data);
        const savedExamId = progress?.data.profile?.examId;
        setSelected(
          savedExamId && data.some((exam) => exam.id === savedExamId)
            ? savedExamId
            : (data[0]?.id ?? null),
        );
      })
      .catch(() => setError("Couldn't load exams. Please refresh and try again."))
      .finally(() => setLoading(false));
  }, []);

  const handleContinue = async () => {
    if (!selected) return;
    setError(null);
    setSubmitting(true);
    try {
      const { requiresSubjectSelection } = await selectExam({ examId: selected });
      const selectedExam = exams.find((exam) => exam.id === selected);
      const needsSubjectSelection =
        requiresSubjectSelection ||
        (selectedExam ? SUBJECT_SELECTION_EXAM_CODES.has(selectedExam.code.toUpperCase()) : false);
      router.push(
        needsSubjectSelection
          ? "/onboarding/select-subject"
          : "/onboarding/tell-us-about-you",
      );
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Something went wrong. Please try again.",
      );
      setSubmitting(false);
    }
  };

  return (
    <AuthCard>
      <StepProgress step={1} totalSteps={5} />

      <div className="mt-4 flex flex-col gap-4 py-2 sm:mt-5">
        <h1 className="text-[24px] font-extrabold leading-[100%] text-ink sm:text-[32px]">
          What are you preparing for?
        </h1>
        <p className="text-[14px] font-semibold leading-[100%] text-muted sm:text-[16px]">
          This filters your syllabus, mocks, and partner matching to match
          your goal
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

      <div className="mt-6 flex flex-col gap-3">
        {isLoading &&
          Array.from({ length: 4 }).map((_, index) => (
            <OptionCardSkeleton key={index} />
          ))}
        {!isLoading &&
          exams.map((exam) => {
            const meta = EXAM_META[exam.code.toUpperCase()] ?? DEFAULT_META;
            return (
              <OptionCard
                key={exam.id}
                icon={meta.icon}
                title={exam.name}
                subtitle={meta.subtitle}
                selected={selected === exam.id}
                onClick={() => setSelected(exam.id)}
              />
            );
          })}
      </div>

      <div className="mt-6 flex flex-col items-center gap-2">
        <Button
          variant="primary"
          onClick={handleContinue}
          disabled={!selected || isSubmitting}
          className="disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Saving..." : "Continue"}
        </Button>
        <p className="px-4 text-center text-[12px] leading-[18px] text-muted sm:px-0 sm:text-xs sm:leading-5">
          By continuing, you agree to our{" "}
          <button
            type="button"
            className="whitespace-nowrap font-semibold text-ink"
          >
            Terms of Service
          </button>
        </p>
      </div>
    </AuthCard>
  );
}
