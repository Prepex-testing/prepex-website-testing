"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/layout/AuthCard";
import { Button } from "@/components/ui/Button";
import { DateInput } from "@/components/ui/DateInput";
import { Input } from "@/components/ui/Input";
import { OptionCard } from "@/components/ui/OptionCard";
import { StepProgress } from "@/components/ui/StepProgress";
import { GraduationCapIcon, StarIcons, LayersIcon } from "@/assets/icons";
import { getOnboardingProgress, saveAcademicProfile, skipOnboardingStep } from "@/lib/api/onboarding";
import { ApiError } from "@/lib/api/http";
import { useStoredFullName } from "@/lib/auth/useStoredFullName";

type CurrentLevel = "CLASS_11" | "CLASS_12" | "DROPPER_1" | "DROPPER_2" | "OTHER";

const CLASSES: Array<{
  id: CurrentLevel;
  title: string;
  subtitle?: string;
  icon: ReactNode;
}> = [
  {
    id: "CLASS_11",
    title: "Class 11",
    subtitle: "For IIT Aspirants",
    icon: <GraduationCapIcon />,
  },
  {
    id: "CLASS_12",
    title: "Class 12",
    subtitle: "For IIT Aspirants",
    icon: <GraduationCapIcon />,
  },
  {
    id: "DROPPER_1",
    title: "Dropper (1st year)",
    subtitle: "For IIT Aspirants",
    icon: <StarIcons />,
  },
  {
    id: "DROPPER_2",
    title: "Dropper (2nd year)",
    subtitle: "For IIT Aspirants",
    icon: <LayersIcon />,
  },
  { id: "OTHER", title: "Other", icon: <StarIcons /> },
];

function displayDateToIso(display: string): string | null {
  const match = display.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

function isoToDisplayDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split("-");
  if (!year || !month || !day) return "";
  return `${day}/${month}/${year}`;
}

function addYearsIso(years: number): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() + years);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Class 11 students are 2 years out from their target exam; everyone else
// (class 12, droppers, other) is assumed to be 1 year out.
function defaultExamDateIso(level: CurrentLevel): string {
  return addYearsIso(level === "CLASS_11" ? 2 : 1);
}

export default function TellUsAboutYouPage() {
  const router = useRouter();
  const storedFullName = useStoredFullName();
  const [fullNameInput, setFullNameInput] = useState("");
  const [fullNameTouched, setFullNameTouched] = useState(false);
  const [city, setCity] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [examDate, setExamDate] = useState("");
  const [selectedClass, setSelectedClass] = useState<CurrentLevel>("CLASS_11");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const [isSkipping, setSkipping] = useState(false);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    getOnboardingProgress()
      .then(({ data }) => {
        const profile = data.profile;
        if (profile?.currentLevel) setSelectedClass(profile.currentLevel);
        if (profile?.targetExamDate) setExamDate(isoToDisplayDate(profile.targetExamDate));
        if (profile?.city) setCity(profile.city);
        if (profile?.phoneNumber) setPhoneNumber(profile.phoneNumber);
      })
      .catch(() => {
        // Best-effort — fall back to a blank form if progress can't be loaded.
      })
      .finally(() => setLoading(false));
  }, []);

  const fullName = fullNameTouched ? fullNameInput : storedFullName;

  const handleContinue = async () => {
    if (!fullName.trim() || !city.trim() || !phoneNumber.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    let targetExamDate: string;
    if (examDate.trim()) {
      const parsed = displayDateToIso(examDate);
      if (!parsed) {
        setError("Enter a valid exam date (DD/MM/YYYY).");
        return;
      }
      targetExamDate = parsed;
    } else {
      targetExamDate = defaultExamDateIso(selectedClass);
    }

    setError(null);
    setSubmitting(true);
    try {
      await saveAcademicProfile({
        fullName,
        phoneNumber,
        city,
        targetExamDate,
        currentLevel: selectedClass,
      });
      router.push("/onboarding/where-do-you-study");
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
      await skipOnboardingStep(2);
      router.push("/onboarding/where-do-you-study");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Something went wrong. Please try again.",
      );
      setSkipping(false);
    }
  };

  return (
    <AuthCard>
      <StepProgress
        step={2}
        totalSteps={5}
        backHref="/onboarding/preparing-for"
        showSkip
        onSkip={handleSkip}
        skipDisabled={isSubmitting || isSkipping || isLoading}
      />

      <div className="mt-4 flex flex-col gap-1">
        <h1 className="text-h1 text-ink">Tell us about you</h1>
        <p className="text-sm text-muted">
          We&apos;ll personalize your plan to fit your life
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

      <div className="mt-6 flex flex-col gap-5">
        <Input
          label="Full Name"
          helperText="Used in your daily plan greetings"
          name="fullName"
          type="text"
          placeholder="Rohan Sharma"
          value={fullName}
          onChange={(event) => {
            setFullNameInput(event.target.value);
            setFullNameTouched(true);
          }}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="City"
            helperText="For partner matching by region"
            name="city"
            type="text"
            placeholder="Indore"
            value={city}
            onChange={(event) => setCity(event.target.value)}
          />
          <Input
            label="Phone Number"
            helperText="For account events and partner verification"
            name="phone"
            type="tel"
            placeholder="+91 9999888822"
            value={phoneNumber}
            onChange={(event) => setPhoneNumber(event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm font-semibold text-ink">Current class?</p>
            <p className="text-xs text-muted">
              Helps us understand your overall schedule and content depth
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {CLASSES.map((item) => (
              <OptionCard
                key={item.id}
                compact
                icon={item.icon}
                title={item.title}
                subtitle={item.subtitle}
                selected={selectedClass === item.id}
                onClick={() => setSelectedClass(item.id)}
                className={item.id === "OTHER" ? "sm:col-span-2" : undefined}
              />
            ))}
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted">Loading...</p>
        ) : (
          <DateInput
            label="When is your exam?"
            helperText="Optional — leave blank and we'll estimate this from your class."
            name="examDate"
            defaultValue={examDate}
            onDateChange={setExamDate}
          />
        )}
      </div>

      <Button
        variant="primary"
        onClick={handleContinue}
        disabled={isSubmitting || isSkipping || isLoading}
        className="mt-6 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Saving..." : "Continue"}
      </Button>
    </AuthCard>
  );
}
