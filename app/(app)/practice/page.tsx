"use client";

import { useEffect, useState } from "react";
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Previous question"
            onClick={() => setCurrentIndex((value) => Math.max(0, value - 1))}
            disabled={currentIndex === 0}
            className="text-ink disabled:opacity-30"
          >
            <ArrowLeftIcon />
          </button>
          <p className="text-base font-bold text-ink">
            Question {currentIndex + 1} of {QUESTIONS.length}
          </p>
          <span className="rounded-full bg-tint px-2 py-0.5 text-[10px] font-bold uppercase text-ink">
            {question.difficulty}
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1 text-muted">
            <ClockIcon />
            {formatTime(elapsed)} elapsed
          </span>
          <button
            type="button"
            onClick={() => finishSession(answers)}
            className="text-xs font-semibold uppercase tracking-wide text-muted"
          >
            End Session
          </button>
        </div>
      </div>

      <div className="flex gap-1.5">
        {QUESTIONS.map((_, index) => (
          <span
            key={index}
            className={`h-1.5 flex-1 rounded-full ${
              index === currentIndex
                ? "bg-cta"
                : answers[index] !== null
                  ? "bg-brand"
                  : "bg-brand/10"
            }`}
          />
        ))}
      </div>

      <p className="text-xs text-muted">{question.breadcrumb}</p>

      <h2 className="text-h2 text-ink">{question.text}</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {question.options.map((option, index) => {
          const optionLetter = String.fromCharCode(65 + index);
          const isSelected = selectedOption === index;
          return (
            <button
              key={option}
              type="button"
              onClick={() => handleSelect(index)}
              aria-pressed={isSelected}
              className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                isSelected ? "border-brand bg-tint-strong" : "border-brand/10 bg-surface"
              }`}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-tint text-sm font-bold text-ink">
                {optionLetter}
              </span>
              <span className="text-sm text-body-text">{option}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-brand/10 bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={handleToggleMark}
            aria-pressed={marked[currentIndex]}
            className={`flex items-center gap-1 text-sm font-semibold ${
              marked[currentIndex] ? "text-ink" : "text-muted"
            }`}
          >
            <BookmarkIcon filled={marked[currentIndex]} />
            Mark for review
          </button>
          <button
            type="button"
            onClick={goToNext}
            className="flex items-center gap-1 text-sm font-semibold text-muted"
          >
            » Skip Question
          </button>
        </div>
        <Button variant="primary" size="sm" onClick={goToNext}>
          Submit
        </Button>
      </div>
    </div>
  );
}
