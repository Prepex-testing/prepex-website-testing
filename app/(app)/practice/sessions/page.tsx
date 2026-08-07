"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlanTaskRow } from "@/components/home/PlanTaskRow";
import type { PlanTask } from "@/components/home/PlanTaskRow";
import { TodaysPracticeModal } from "@/components/practice/TodaysPracticeModal";
import { BellIcon } from "@/components/ui/icons";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";

const SESSIONS: PlanTask[] = Array.from({ length: 5 }, (_, index) => ({
  id: `calculus-practice-${index + 1}`,
  subjectLabel: "M",
  subjectName: "Maths",
  type: "practice",
  title: "Calculus Practice",
  meta: "NCERT Ex. 7.1 • PYQ Sets",
  duration: "75 min",
  estimatedMinutes: 75,
  timeRange: "12:00 - 1:15 PM",
  difficulty: "medium",
  actionLabel: "Start Practice",
}));

export default function PracticeSessionsPage() {
  const router = useRouter();
  const [isPracticeModalOpen, setPracticeModalOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h1 text-ink">Practice Sessions</h1>
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

      <div className="flex flex-col gap-3">
        {SESSIONS.map((task) => (
          <PlanTaskRow
            key={task.id}
            task={task}
            onStartPractice={() => setPracticeModalOpen(true)}
          />
        ))}
      </div>

      <TodaysPracticeModal
        open={isPracticeModalOpen}
        onClose={() => setPracticeModalOpen(false)}
        onStart={() => {
          setPracticeModalOpen(false);
          router.push("/practice");
        }}
      />
    </div>
  );
}
