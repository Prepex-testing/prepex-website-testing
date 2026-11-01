"use client";

import { StatsPanel } from "@/components/notebooks/StatsPanel";
import { StudyShell } from "@/components/study/StudyShell";
import { useSubjects } from "@/components/study/useSubjects";
import Link from "next/link";

/** Mistake patterns across every notebook. */
export default function NotebookStatsPage() {
  const { lookup } = useSubjects();
  return (
    <StudyShell current="/notebooks" testId="notebooks-stats">
      <div className="flex items-center gap-3">
        <Link href="/notebooks" className="text-[14px] font-semibold text-ink underline">
          All notebooks
        </Link>
        <h2 className="text-[20px] font-extrabold text-ink">Your mistake patterns</h2>
      </div>
      <StatsPanel lookup={lookup} />
    </StudyShell>
  );
}
