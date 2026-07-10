"use client";

import { useState } from "react";
import { AuthCard } from "@/components/layout/AuthCard";
import { Button } from "@/components/ui/Button";
import { DateInput } from "@/components/ui/DateInput";
import { Input } from "@/components/ui/Input";
import { OptionCard } from "@/components/ui/OptionCard";
import { StepProgress } from "@/components/ui/StepProgress";
import { GraduationCapIcon, RefreshIcon, MoreIcon } from "@/components/ui/icons";

const CLASSES = [
  {
    id: "class-11",
    title: "Class 11",
    subtitle: "For IIT Aspirants",
    icon: <GraduationCapIcon />,
  },
  {
    id: "class-12",
    title: "Class 12",
    subtitle: "For IIT Aspirants",
    icon: <GraduationCapIcon />,
  },
  {
    id: "dropper-1",
    title: "Dropper (1st year)",
    subtitle: "For IIT Aspirants",
    icon: <RefreshIcon />,
  },
  {
    id: "dropper-2",
    title: "Dropper (2nd year)",
    subtitle: "For IIT Aspirants",
    icon: <RefreshIcon />,
  },
  { id: "other", title: "Other", icon: <MoreIcon /> },
];

export default function TellUsAboutYouPage() {
  const [selectedClass, setSelectedClass] = useState("class-11");

  return (
    <AuthCard>
      <StepProgress
        step={2}
        totalSteps={5}
        backHref="/onboarding/select-subject"
        showSkip
        skipHref="/onboarding/where-do-you-study"
      />

      <div className="mt-4 flex flex-col gap-1">
        <h1 className="text-h1 text-ink">Tell us about you</h1>
        <p className="text-sm text-muted">
          We&apos;ll personalize your plan to fit your life
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-5">
        <Input
          label="Full Name"
          helperText="Used in your daily plan greetings"
          name="fullName"
          type="text"
          placeholder="Rohan Sharma"
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="City"
            helperText="For partner matching by region"
            name="city"
            type="text"
            placeholder="Indore"
          />
          <Input
            label="Phone Number"
            helperText="For account events and partner verification"
            name="phone"
            type="tel"
            placeholder="+91 9999888822"
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
                className={item.id === "other" ? "sm:col-span-2" : undefined}
              />
            ))}
          </div>
        </div>

        <DateInput
          label="When is your exam?"
          helperText="We use this to calculate your daily pace and exam countdown."
          name="examDate"
          required
        />
      </div>

      <Button
        href="/onboarding/where-do-you-study"
        variant="primary"
        className="mt-6"
      >
        Continue
      </Button>
    </AuthCard>
  );
}
