"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Stepper } from "@/components/ui/Stepper";
import { BellIcon, CheckIcon } from "@/components/ui/icons";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";

const SUBJECT_OPTIONS = [
  { value: "mathematics", label: "Mathematics" },
  { value: "physics", label: "Physics" },
  { value: "chemistry", label: "Chemistry" },
];

const CHAPTER_OPTIONS = [
  { value: "coordinate-geometry", label: "Coordinate geometry" },
  { value: "calculus", label: "Calculus" },
  { value: "algebra", label: "Algebra" },
];

const TOPIC_OPTIONS = [
  { value: "circle", label: "Circle" },
  { value: "parabola", label: "Parabola" },
  { value: "ellipse", label: "Ellipse" },
];

const DIFFICULTIES = ["Easy", "Medium", "Hard", "Very Hard"];

const QUESTION_TYPES = ["Single correct", "Multiple correct", "Integer", "Assertion-Reason"];

const SOURCES = ["Curated questions", "JEE Main PYQs", "JEE Advanced PYQs"];

function CheckboxRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex w-fit cursor-pointer items-center gap-2">
      <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 border-brand/25 text-white peer-checked:border-brand peer-checked:bg-brand">
        {checked && <CheckIcon />}
      </span>
      <span className="text-sm text-body-text">{label}</span>
    </label>
  );
}

export default function CustomPracticeBuilderPage() {
  const router = useRouter();
  const [difficulty, setDifficulty] = useState("Easy");
  const [questionTypes, setQuestionTypes] = useState<string[]>([
    "Single correct",
    "Multiple correct",
  ]);
  const [sources, setSources] = useState<string[]>(["Curated questions", "JEE Main PYQs"]);
  const [questionCount, setQuestionCount] = useState(10);
  const [timeLimit, setTimeLimit] = useState<"60" | "none">("none");

  const toggle = (list: string[], setList: (value: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter((value) => value !== item) : [...list, item]);
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h1 text-ink">Custom Practice Builder</h1>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <button
            type="button"
            aria-label="Notifications"
            className="flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-tint-strong"
          >
            <BellIcon />
          </button>
          <UserMenu />
        </div>
      </div>

      <div className="rounded-2xl border border-brand/10 bg-surface p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select label="Subject" options={SUBJECT_OPTIONS} defaultValue="mathematics" />
          <Select label="Chapter" options={CHAPTER_OPTIONS} defaultValue="coordinate-geometry" />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select label="Topic" options={TOPIC_OPTIONS} defaultValue="circle" />
          <Input label="Sub-topic (optional)" name="subTopic" placeholder="Tangents (optional)" />
        </div>

        <div className="mt-6 border-t border-brand/10 pt-5">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">
            Difficulty
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {DIFFICULTIES.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setDifficulty(level)}
                aria-pressed={difficulty === level}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                  difficulty === level
                    ? "border-brand bg-brand text-white"
                    : "border-brand/15 text-body-text hover:bg-tint-strong"
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">
            Question Type
          </p>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {QUESTION_TYPES.map((type) => (
              <CheckboxRow
                key={type}
                label={type}
                checked={questionTypes.includes(type)}
                onChange={() => toggle(questionTypes, setQuestionTypes, type)}
              />
            ))}
          </div>
        </div>

        <div className="mt-5">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Source</p>
          <div className="mt-2 flex flex-col gap-2">
            {SOURCES.map((source) => (
              <CheckboxRow
                key={source}
                label={source}
                checked={sources.includes(source)}
                onChange={() => toggle(sources, setSources, source)}
              />
            ))}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Stepper
            label="Number of Questions"
            value={questionCount}
            unit=""
            min={5}
            max={50}
            onChange={setQuestionCount}
          />

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted">
              Time Limit
            </p>
            <div className="mt-2 flex items-center gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-body-text">
                <input
                  type="radio"
                  name="time-limit"
                  checked={timeLimit === "60"}
                  onChange={() => setTimeLimit("60")}
                  className="h-4 w-4 accent-primary"
                />
                60 min
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-body-text">
                <input
                  type="radio"
                  name="time-limit"
                  checked={timeLimit === "none"}
                  onChange={() => setTimeLimit("none")}
                  className="h-4 w-4 accent-primary"
                />
                No limit
              </label>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button variant="primary" size="sm" onClick={() => router.push("/practice")}>
            Start Custom Practice
          </Button>
        </div>
      </div>
    </div>
  );
}
