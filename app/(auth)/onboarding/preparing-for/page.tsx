"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/layout/AuthCard";
import { Button } from "@/components/ui/Button";
import { OptionCard } from "@/components/ui/OptionCard";
import { StepProgress } from "@/components/ui/StepProgress";
import { LayersIcon, BookIcon, RadarIcons, BriefcaseIcons, CuteIcon } from "@/assets/icons";
import { getExams } from "@/lib/api/dashboard";
import { getOnboardingProgress, selectExam } from "@/lib/api/onboarding";
import { ApiError } from "@/lib/api/http";
import type { Exam } from "@/lib/api/dashboard";

const EXAM_META: Record<string, { subtitle: string; icon: ReactNode }> = {
  JEE_MAIN: { subtitle: "NITs, IIITs & GFTIs", icon: <RadarIcons /> },
  JEE_ADVANCED: { subtitle: "NITs, IIITs & GFTIs", icon: <LayersIcon /> },
  NEET: { subtitle: "Medical Entrance Exam", icon: <BriefcaseIcons /> },
  CUET: { subtitle: "Central University Entrance Test", icon: <CuteIcon /> },
  BOARDS: { subtitle: "Class 12 Boards", icon: <BookIcon /> },
};
const DEFAULT_META = { subtitle: "Personalized prep plan", icon: <LayersIcon /> };

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
      router.push(
        requiresSubjectSelection
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

      <div className="mt-4 flex flex-col gap-1">
        <h1 className="text-h1 text-ink">What are you preparing for?</h1>
        <p className="text-sm text-muted">
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
        {isLoading && <p className="text-sm text-muted">Loading exams...</p>}
        {!isLoading &&
          exams.map((exam) => {
            const meta = EXAM_META[exam.code] ?? DEFAULT_META;
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
        <p className="text-xs text-muted">
          By continuing, you agree to our{" "}
          <Link href="/terms" className="text-ink underline">
            Terms of Service
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}
