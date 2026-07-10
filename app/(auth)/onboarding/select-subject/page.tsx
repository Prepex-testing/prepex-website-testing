"use client";

import { useState } from "react";
import { AuthCard } from "@/components/layout/AuthCard";
import { Button } from "@/components/ui/Button";
import { OptionCard } from "@/components/ui/OptionCard";
import {
  GlobeIcon,
  FlaskIcon,
  CalculatorIcon,
  AtomIcon,
} from "@/components/ui/icons";

const SUBJECTS = [
  { id: "physics", label: "Physics", icon: <GlobeIcon /> },
  { id: "chemistry", label: "Chemistry", icon: <FlaskIcon /> },
  { id: "maths", label: "Maths", icon: <CalculatorIcon /> },
  { id: "biology", label: "Biology", icon: <AtomIcon /> },
];

export default function SelectSubjectPage() {
  const [selected, setSelected] = useState<string[]>(["physics", "maths"]);

  const toggle = (id: string) => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((subjectId) => subjectId !== id)
        : [...current, id],
    );
  };

  return (
    <AuthCard>
      <h1 className="text-h1 text-ink">Select your CUET subjects</h1>
      <p className="mt-1 text-sm text-muted">
        Choose your exam subjects to get a personalized study roadmap and
        progress tracking.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SUBJECTS.map((subject) => (
          <OptionCard
            key={subject.id}
            compact
            icon={subject.icon}
            title={subject.label}
            selected={selected.includes(subject.id)}
            onClick={() => toggle(subject.id)}
          />
        ))}
      </div>

      <Button
        href="/onboarding/tell-us-about-you"
        variant="primary"
        className="mt-6"
      >
        Continue
      </Button>
    </AuthCard>
  );
}
