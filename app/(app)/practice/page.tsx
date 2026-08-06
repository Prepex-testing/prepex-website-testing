"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { BellIcon, ArrowLeftIcon, ClockIcon, BookmarkIcon } from "@/components/ui/icons";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";

type Question = {
  breadcrumb: string;
  difficulty: "Easy" | "Medium" | "Hard";
  text: string;
  options: string[];
  correctIndex: number;
};

const QUESTIONS: Question[] = [
  {
    breadcrumb: "Maths · Coordinate Geometry · Circles",
    difficulty: "Easy",
    text: "Find the equation of a circle with center (0, 0) and radius 5.",
    options: ["x² + y² = 25", "x² + y² = 10", "x² + y² = 5", "x² + y² = 50"],
    correctIndex: 0,
  },
  {
    breadcrumb: "Maths · Coordinate Geometry · Circles",
    difficulty: "Easy",
    text: "Find the equation of a circle with center (1, -2) and radius 3.",
    options: [
      "(x - 1)² + (y + 2)² = 9",
      "(x + 1)² + (y - 2)² = 9",
      "(x - 1)² + (y + 2)² = 3",
      "(x - 1)² + (y - 2)² = 9",
    ],
    correctIndex: 0,
  },
  {
    breadcrumb: "Maths · Coordinate Geometry · Circles",
    difficulty: "Medium",
    text: "Find the equation of the circle whose center is at (2, 3) and which passes through the point (5, 7).",
    options: [
      "(x - 2)² + (y - 3)² = 25",
      "(x - 2)² + (y - 3)² = 16",
      "(x + 2)² + (y + 3)² = 25",
      "(x - 2)² + (y - 3)² = 5",
    ],
    correctIndex: 0,
  },
  {
    breadcrumb: "Maths · Coordinate Geometry · Circles",
    difficulty: "Medium",
    text: "Find the radius of the circle x² + y² - 4x - 6y - 12 = 0.",
    options: ["5", "4", "6", "3"],
    correctIndex: 0,
  },
  {
    breadcrumb: "Maths · Coordinate Geometry · Tangents",
    difficulty: "Medium",
    text: "How many tangents can be drawn from an external point to a circle?",
    options: ["2", "1", "3", "0"],
    correctIndex: 0,
  },
  {
    breadcrumb: "Maths · Coordinate Geometry · Tangents",
    difficulty: "Hard",
    text: "Find the length of the tangent from point (4, 5) to the circle x² + y² = 9.",
    options: ["4", "5", "3", "6"],
    correctIndex: 0,
  },
  {
    breadcrumb: "Maths · Coordinate Geometry · Circles",
    difficulty: "Medium",
    text: "Find the center of the circle x² + y² + 6x - 8y + 9 = 0.",
    options: ["(-3, 4)", "(3, -4)", "(-3, -4)", "(3, 4)"],
    correctIndex: 0,
  },
  {
    breadcrumb: "Maths · Coordinate Geometry · Common Tangents",
    difficulty: "Hard",
    text: "Two circles of radii 5 and 3 have centers 10 units apart. How many common tangents do they have?",
    options: ["4", "2", "3", "1"],
    correctIndex: 0,
  },
  {
    breadcrumb: "Maths · Coordinate Geometry · Family of Circles",
    difficulty: "Medium",
    text: "The equation x² + y² + λx = 0 represents a family of circles passing through which point?",
    options: ["(0, 0)", "(1, 0)", "(0, 1)", "(1, 1)"],
    correctIndex: 0,
  },
  {
    breadcrumb: "Maths · Coordinate Geometry · Circles",
    difficulty: "Easy",
    text: "What is the diameter of the circle x² + y² = 36?",
    options: ["12", "6", "36", "18"],
    correctIndex: 0,
  },
  {
    breadcrumb: "Maths · Coordinate Geometry · Equations",
    difficulty: "Medium",
    text: "Find the value of c if x² + y² + 4x + 6y + c = 0 passes through the origin.",
    options: ["0", "4", "6", "-10"],
    correctIndex: 0,
  },
  {
    breadcrumb: "Maths · Coordinate Geometry · Circles",
    difficulty: "Medium",
    text: "A circle touches the x-axis and has center (3, 4). What is its radius?",
    options: ["4", "3", "5", "7"],
    correctIndex: 0,
  },
];

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function PracticeModePage() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(
    () => Array(QUESTIONS.length).fill(null),
  );
  const [marked, setMarked] = useState<boolean[]>(() => Array(QUESTIONS.length).fill(false));
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const question = QUESTIONS[currentIndex];
  const selectedOption = answers[currentIndex];

  const finishSession = (finalAnswers: (number | null)[]) => {
    const correct = finalAnswers.filter(
      (answer, index) => answer === QUESTIONS[index].correctIndex,
    ).length;
    router.push(
      `/practice/complete?correct=${correct}&total=${QUESTIONS.length}&time=${elapsed}`,
    );
  };

  const goToNext = () => {
    if (currentIndex < QUESTIONS.length - 1) {
      setCurrentIndex((value) => value + 1);
    } else {
      finishSession(answers);
    }
  };

  const handleSelect = (optionIndex: number) => {
    setAnswers((current) => {
      const next = [...current];
      next[currentIndex] = optionIndex;
      return next;
    });
  };

  const handleToggleMark = () => {
    setMarked((current) => {
      const next = [...current];
      next[currentIndex] = !next[currentIndex];
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h1 text-ink">Practice Mode</h1>
        <div className="flex shrink-0 items-center gap-4">
          <ThemeToggle />
          <button
            type="button"
            aria-label="Notifications"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-icon-action-bg text-icon-action-text transition-colors hover:bg-tint-strong"
          >
            <BellIcon />
          </button>
          <UserMenu />
        </div>
      </div>

      <div className="flex h-8 w-full items-center justify-between">
        {/* Left Section */}
        <div className="flex h-7 items-center gap-3">
          {/* Back Button */}
          <button
            type="button"
            aria-label="Previous question"
            onClick={() => setCurrentIndex((value) => Math.max(0, value - 1))}
            disabled={currentIndex === 0}
            className="flex h-8 w-8 items-center justify-center rounded-full p-1 text-ink disabled:opacity-30"
          >
            <ArrowLeftIcon />
          </button>

          {/* Question + Difficulty */}
          <div className="flex h-7 items-center gap-3">
            <p className="text-[20px] font-bold leading-7 text-ink whitespace-nowrap">
              Question {currentIndex + 1} of {QUESTIONS.length}
            </p>

            <span className="flex h-4 items-center rounded-sm bg-tint px-2 text-[12px] font-semibold uppercase tracking-[0.6px] leading-4 text-ink">
              {question.difficulty}
            </span>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex h-7 items-center gap-8">
          {/* Timer */}
          <div className="flex items-center gap-2">
            <ClockIcon />

            <span className="text-[18px] font-semibold leading-7 text-ink whitespace-nowrap">
              {formatTime(elapsed)} elapsed
            </span>
          </div>

          {/* End Session */}
          <button
            type="button"
            onClick={() => finishSession(answers)}
            className="text-[14px] font-bold uppercase leading-5 tracking-[1.4px] text-muted whitespace-nowrap"
          >
            End Session
          </button>
        </div>
      </div>

      <div className="flex h-2 w-[261px] items-center gap-[15px]">
        {QUESTIONS.map((_, index) => {
          const isActive = index === currentIndex;
          const isAnswered = answers[index] !== null;

          return (
            <span
              key={index}
              className={`h-2 w-2 rounded-full transition-colors duration-200 ${isActive || isAnswered
                ? "bg-question-dot-active"
                : "bg-question-dot-inactive"
                }`}
            />
          );
        })}
      </div>

      <div className="flex h-8 w-full items-center gap-4">
        {question.breadcrumb.split(" > ").map((item, index) => (
          <React.Fragment key={`${item}-${index}`}>
            {index === 0 ? (
              <span
                className="flex h-8 items-center rounded-lg px-4 text-[14px] font-semibold leading-5
                     bg-subject-bg text-subject-text"
              >
                {item}
              </span>
            ) : (
              <>
                <span className="h-[6px] w-[6px] rounded-full bg-muted" />

                <span className="text-[14px] font-semibold leading-5 text-ink">
                  {item}
                </span>
              </>
            )}
          </React.Fragment>
        ))}
      </div>

      <h2 className="text-h2 text-ink">{question.text}</h2>

      <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-2">
        {question.options.map((option, index) => {
          const optionLetter = String.fromCharCode(65 + index);
          const isSelected = selectedOption === index;

          return (
            <button
              key={option}
              type="button"
              onClick={() => handleSelect(index)}
              aria-pressed={isSelected}
              className={`flex min-h-[98px] w-full items-center rounded-xl border p-6 text-left transition-all duration-200 ${isSelected
                ? "border-brand bg-tint-strong"
                : "border-brand/20 bg-transparent"
                }`}
            >
              {/* Option Letter */}
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${isSelected
                  ? "bg-brand text-background"
                  : "bg-tint text-ink"
                  }`}
              >
                <span className="text-[18px] font-bold leading-7">
                  {optionLetter}
                </span>
              </div>

              {/* Formula */}
              <span
                className="ml-6 text-[24px] font-medium italic leading-8 text-ink"
                style={{ fontFamily: "Liberation Serif, serif" }}
              >
                {option}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex h-[120px] w-full items-center justify-between rounded-2xl border border-brand/10 bg-surface px-10 py-8">

        <div className="flex items-center gap-12">

          <button
            type="button"
            onClick={handleToggleMark}
            aria-pressed={marked[currentIndex]}
            className={`flex h-8 items-center gap-3 transition-colors ${marked[currentIndex] ? "text-ink" : "text-muted"
              }`}
          >
            <BookmarkIcon
              filled={marked[currentIndex]}
            />

            <span className="text-[16px] font-bold leading-6">
              Mark for review
            </span>
          </button>

          {/* Skip Question */}
          <button
            type="button"
            onClick={goToNext}
            className="flex h-8 items-center gap-3 text-muted transition-colors hover:text-ink"
          >
            <span className="text-xl font-semibold">»</span>

            <span className="text-[16px] font-bold leading-6">
              Skip Question
            </span>
          </button>
        </div>

        {/* Submit */}
        <button
          type="button"
          onClick={goToNext}
          className="flex h-14 w-[200px] items-center justify-center rounded-xl bg-cta text-[18px] font-bold leading-7 text-white transition-opacity hover:opacity-90"
        >
          Submit
        </button>
      </div>
    </div>
  );
}
