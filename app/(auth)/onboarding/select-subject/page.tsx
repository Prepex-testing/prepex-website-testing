"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/layout/AuthCard";
import { Button } from "@/components/ui/Button";
import { OptionCard } from "@/components/ui/OptionCard";
import { OptionCardSkeleton } from "@/components/ui/OptionCardSkeleton";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { GlobeIcon, FlaskIcon, CalculatorIcon, AtomIcon, LayersIcon } from "@/assets/icons";
import { getSubjects } from "@/lib/api/dashboard";
import { getOnboardingProgress, selectSubjects } from "@/lib/api/onboarding";
import { ApiError } from "@/lib/api/http";
import type { Subject } from "@/lib/api/dashboard";

const SUBJECT_ICONS: Record<string, ReactNode> = {
  PHY: <GlobeIcon />,
  CHEM: <FlaskIcon />,
  MATH: <CalculatorIcon />,
  BIO: <AtomIcon />,
};
const DEFAULT_ICON = <LayersIcon />;

export default function SelectSubjectPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([getSubjects(), getOnboardingProgress().catch(() => null)])
      .then(([{ data }, progress]) => {
        setSubjects(data);
        const savedSubjectIds = progress?.data.subjects.map((subject) => subject.subjectId);
        if (savedSubjectIds?.length) setSelected(savedSubjectIds);
      })
      .catch(() => setError("Couldn't load subjects. Please refresh and try again."))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (id: number) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((subjectId) => subjectId !== id) : [...current, id],
    );
  };

  const handleContinue = async () => {
    if (selected.length === 0) {
      setError("Select at least one subject.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await selectSubjects({ subjectIds: selected });
      router.push("/onboarding/tell-us-about-you");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Something went wrong. Please try again.",
      );
      setSubmitting(false);
    }
  };

  return (
    <AuthCard>
      <Link
        href="/onboarding/preparing-for"
        aria-label="Go back"
        className="w-fit text-ink"
      >
        <ArrowLeftIcon />
      </Link>

      <h1 className="mt-2 text-h1 text-ink">Select your subjects</h1>
      <p className="mt-1 text-sm text-muted">
        Choose your exam subjects to get a personalized study roadmap and
        progress tracking.
      </p>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger"
        >
          {error}
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {isLoading &&
          Array.from({ length: 4 }).map((_, index) => (
            <OptionCardSkeleton key={index} compact />
          ))}
        {!isLoading &&
          subjects.map((subject) => (
            <OptionCard
              key={subject.id}
              compact
              icon={SUBJECT_ICONS[subject.code] ?? DEFAULT_ICON}
              title={subject.name}
              selected={selected.includes(subject.id)}
              onClick={() => toggle(subject.id)}
            />
          ))}
      </div>

      <Button
        variant="primary"
        className="mt-6 disabled:cursor-not-allowed disabled:opacity-60"
        onClick={handleContinue}
        disabled={isSubmitting}
      >
        {isSubmitting ? "Saving..." : "Continue"}
      </Button>
    </AuthCard>
  );
}
