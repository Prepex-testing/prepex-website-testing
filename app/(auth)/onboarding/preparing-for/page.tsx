"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/layout/AuthCard";
import { Button } from "@/components/ui/Button";
import { OptionCard } from "@/components/ui/OptionCard";
import { StepProgress } from "@/components/ui/StepProgress";
import {
  // TargetIcon,
  // RadarIcon,
  // BriefcaseIcon,
  // LayersIcon,
  // BookIcon,
} from "@/components/ui/icons";
import {LayersIcon,BookIcon,RadarIcons,BriefcaseIcons,CuteIcon} from "@/assets/icons";

const GOALS = [
  {
    id: "jee-main-advanced",
    title: "JEE Main + Advanced",
    subtitle: "NITs, IIITs & GFTIs",
    icon: <LayersIcon />,
  },
  {
    id: "jee-main",
    title: "JEE Main",
    subtitle: "NITs, IIITs & GFTIs",
    icon: <RadarIcons />,
  },
  {
    id: "neet",
    title: "NEET",
    subtitle: "Medical Entrance Exam",
    icon: <BriefcaseIcons />,
  },
  {
    id: "jee-cuet",
    title: "JEE + CUET",
    subtitle: "Combined entrance track",
    icon: <CuteIcon />,
  },
  {
    id: "cuet",
    title: "CUET",
    subtitle: "Central University Entrance Test",
    icon: <CuteIcon />,
  },
  { id: "boards", title: "Boards", subtitle: "Class 12 Boards", icon: <BookIcon /> },
];

const DIRECT_TO_TELL_US_ABOUT_YOU = new Set(["jee-main-advanced", "jee-main", "neet"]);

export default function PreparingForPage() {
  const router = useRouter();
  const [selected, setSelected] = useState("jee-main-advanced");

  const handleContinue = () => {
    if (DIRECT_TO_TELL_US_ABOUT_YOU.has(selected)) {
      router.push("/onboarding/tell-us-about-you");
    } else {
      router.push("/onboarding/select-subject");
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

      <div className="mt-6 flex flex-col gap-3">
        {GOALS.map((goal) => (
          <OptionCard
            key={goal.id}
            icon={goal.icon}
            title={goal.title}
            subtitle={goal.subtitle}
            selected={selected === goal.id}
            onClick={() => setSelected(goal.id)}
          />
        ))}
      </div>

      <div className="mt-6 flex flex-col items-center gap-2">
        <Button variant="primary" onClick={handleContinue}>
          Continue
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
