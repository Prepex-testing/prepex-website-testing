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

/* ============================================================
   CHANGED: entire CheckboxRow component restyled to match Figma
   - checkbox: h-4 w-4 (16px) -> h-[18px] w-[18px]
   - checkbox: rounded -> rounded-[4px]  (square corners per spec)
   - row: added h-6 (24px fixed height per "inside row size")
   - label: text-sm text-body-text -> text-[14px] font-medium
     leading-[21px] + var(--text-primary)
   ============================================================ */
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
    <label className="flex h-6 w-fit cursor-pointer items-center gap-2"> {/* CHANGED: added h-6 */}
      <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
      <span
        className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] border-2 border-brand/25 peer-checked:border-brand peer-checked:bg-brand"
      /* CHANGED: h-4 w-4 -> h-[18px] w-[18px], rounded -> rounded-[4px] */
      >
        {checked && <CheckIcon />} {/* CHANGED: sized icon */}
      </span>
      <span
        className="text-[14px] font-medium leading-[21px]" /* CHANGED: was text-sm text-body-text */
        style={{ color: "var(--text-primary, #FAF7F2)" }} /* CHANGED: color now via CSS var */
      >
        {label}
      </span>
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
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Select label="Subject" options={SUBJECT_OPTIONS} defaultValue="mathematics" />
          <Select label="Chapter" options={CHAPTER_OPTIONS} defaultValue="coordinate-geometry" />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Select label="Topic" options={TOPIC_OPTIONS} defaultValue="circle" />
          <Input label="Sub-topic (optional)" name="subTopic" placeholder="Tangents (optional)" />
        </div>

        <div className="mt-6 border-t border-brand/10 pt-6">
          <p className="text-[12px] font-semibold uppercase tracking-[0.6px] text-muted">
            Difficulty
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {DIFFICULTIES.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setDifficulty(level)}
                aria-pressed={difficulty === level}
                className={`flex h-[39px] w-[105px] items-center justify-center rounded-full border text-[14px] font-semibold transition-all duration-200 ${difficulty === level
                  ? "border-white bg-white text-[#111145]"
                  : "border-[#8B8998] bg-transparent text-[#FAF7F2] hover:bg-white hover:text-[#111145]"
                  }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 w-full">
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.6px] text-muted">
            Question Type
          </p>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {QUESTION_TYPES.map((type) => {
              const checked = questionTypes.includes(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggle(questionTypes, setQuestionTypes, type)}
                  className={`flex h-[55px] w-full items-center justify-between rounded-xl border px-[15px] ${checked ? "border-white bg-white/10" : "border-white bg-transparent"
                    }`}
                >
                  <span className="text-[14px] font-medium text-ink">{type}</span>
                  <div
                    className={`flex h-[22px] w-[22px] items-center justify-center rounded-[4px] border ${checked ? "border-white bg-white" : "border-[#8B8998] bg-transparent"
                      }`}
                  >
                    {checked && (
                      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none">
                        <path
                          d="M5 10L8.5 13.5L15 7"
                          stroke="#111145"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 border-t border-brand/10 pt-6"> {/* CHANGED */}
          <p
            className="text-[12px] font-semibold uppercase tracking-[0.6px]" /* CHANGED */
            style={{ color: "var(--text-secondary, #8B8998)" }} /* CHANGED */
          >
            Source
          </p>
          <div className="mt-3 flex flex-col gap-2"> {/* CHANGED: mt-2 -> mt-3 */}
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

        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-2">

  {/* Number of Questions */}
  <div className="w-full max-w-[248px]">

    <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.6px] text-muted">
      Number of Questions
    </p>

    <Stepper
      value={questionCount}
      min={5}
      max={50}
      onChange={setQuestionCount}
    />

  </div>

  {/* Time Limit */}
  <div className="w-full max-w-[248px]">

    <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.6px] text-muted">
      Time Limit
    </p>

    <div className="flex items-center gap-4">

      <label
        className="flex cursor-pointer items-center gap-3"
        onClick={() => setTimeLimit("60")}
      >
        <div
          className={`flex h-[22px] w-[22px] items-center justify-center rounded-full border ${
            timeLimit === "60"
              ? "border-white bg-white"
              : "border-[#8B8998]"
          }`}
        >
          {timeLimit === "60" && (
            <div className="h-[10px] w-[10px] rounded-full bg-[#111145]" />
          )}
        </div>

        <span className="text-[14px] text-muted">
          60 min
        </span>
      </label>

      <label
        className="flex cursor-pointer items-center gap-3"
        onClick={() => setTimeLimit("none")}
      >
        <div
          className={`flex h-[22px] w-[22px] items-center justify-center rounded-full border ${
            timeLimit === "none"
              ? "border-white bg-white"
              : "border-[#8B8998]"
          }`}
        >
          {timeLimit === "none" && (
            <div className="h-[10px] w-[10px] rounded-full bg-[#111145]" />
          )}
        </div>

        <span className="text-[14px] text-muted">
          No limit
        </span>
      </label>

    </div>

  </div>

</div>
      </div>
      <div className="mt-6 flex w-full justify-end">
        <Button
          variant="primary"
          onClick={() => router.push("/practice")}
          className="
      !flex
      !h-[60px]
      !w-[309px]
      !min-w-[309px]
      !items-center
      !justify-center
      !rounded-2xl
      !px-12
      !py-4
      text-center
      !text-[20px]
      !font-semibold
      !leading-7
      whitespace-nowrap
      transition-all
      hover:bg-[#FF7A59]
      hover:shadow-[0px_4px_20px_0px_#00000008]
    "
        >
          Start Custom Practice
        </Button>
      </div>
    </div>
  );
}