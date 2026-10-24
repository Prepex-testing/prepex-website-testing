"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { BarChart3, NotebookPen, PenLine, RotateCcw, Timer, Trophy } from "lucide-react";
import type { PlanDay } from "@/lib/api/plannerV2";
import { getMistakeStats, type MistakeStats } from "@/lib/api/mistakes";
import { formatClock, formatDuration } from "@/lib/planner/format";

type Tile = { key: string; label: string; href: string; subtitle: string; icon: ReactNode; tint: string; coach?: string };

/** The subtitle for each tile, from live data. Exported for tests. */
export function tileSubtitles(day: PlanDay | null, mistakes: MistakeStats | null | undefined): Record<"focus" | "practice" | "revision" | "mistakes" | "mocks" | "analytics", string> {
  const open = (kind: string) => (day?.tasks ?? []).filter((t) => t.kind === kind && (t.status === "pending" || t.status === "in_progress"));
  const practice = open("practice").length;
  const revision = open("revision").length;
  const mock = open("mock")[0];
  const focused = day?.summary.doneMinutes ?? 0;
  const unresolved = mistakes?.active ?? null;
  return {
    focus: focused > 0 ? `${formatDuration(focused)} done today` : "Start a timer",
    practice: practice > 0 ? `${practice} on today's plan` : "Solve questions",
    revision: revision > 0 ? `${revision} due today` : "Nothing due today",
    mistakes: unresolved === null ? "Review what went wrong" : unresolved === 0 ? "All clear" : `${unresolved} unresolved`,
    mocks: mock?.startMin != null ? `Mock at ${formatClock(mock.startMin)}` : "Log and review",
    analytics: "See your trends",
  };
}

/** 7. Quick Access: six large tiles in two columns, each with a live one-line status. */
export function QuickAccessGrid({ day }: { day: PlanDay | null }) {
  const [mistakes, setMistakes] = useState<MistakeStats | null | undefined>(undefined);

  useEffect(() => {
    let live = true;
    getMistakeStats().then(
      (res) => live && setMistakes(res.data),
      () => live && setMistakes(null),
    );
    return () => {
      live = false;
    };
  }, []);

  const s = tileSubtitles(day, mistakes);
  const tiles: Tile[] = [
    { key: "focus", label: "Focus", href: "/focus", subtitle: s.focus, icon: <Timer className="size-6" aria-hidden />, tint: "bg-[#EEF2FF] text-[#6366F1] dark:bg-[#6366F1]/20 dark:text-[#A5B4FC]" },
    { key: "practice", label: "Practice", href: "/practice/sessions", subtitle: s.practice, icon: <PenLine className="size-6" aria-hidden />, tint: "bg-[#ECFDF5] text-[#10B981] dark:bg-[#10B981]/20 dark:text-[#6EE7B7]", coach: "nav-practice" },
    { key: "revision", label: "Revision", href: "/home/revision", subtitle: s.revision, icon: <RotateCcw className="size-6" aria-hidden />, tint: "bg-[#FFFBEB] text-[#D97706] dark:bg-[#F59E0B]/20 dark:text-[#FCD34D]", coach: "quick-revision" },
    { key: "mistakes", label: "Mistakes", href: "/home/mistake-notebook", subtitle: s.mistakes, icon: <NotebookPen className="size-6" aria-hidden />, tint: "bg-[#FDF2F8] text-[#EC4899] dark:bg-[#EC4899]/20 dark:text-[#F9A8D4]", coach: "quick-mistakes" },
    { key: "mocks", label: "Mocks", href: "/home/mock-analysis", subtitle: s.mocks, icon: <Trophy className="size-6" aria-hidden />, tint: "bg-[#FFF5F3] text-cta dark:bg-cta/20 dark:text-[#FDBA9F]", coach: "quick-mock" },
    { key: "analytics", label: "Analytics", href: "/analytics", subtitle: s.analytics, icon: <BarChart3 className="size-6" aria-hidden />, tint: "bg-[#F5F3FF] text-[#8B5CF6] dark:bg-[#8B5CF6]/20 dark:text-[#C4B5FD]" },
  ];

  return (
    <section aria-label="Quick access" data-testid="quick-access" className="flex flex-col gap-3">
      <h2 className="text-[16px] font-extrabold text-ink">Quick Access</h2>
      <ul className="grid grid-cols-2 gap-3">
        {tiles.map((t) => (
          <li key={t.key}>
            <Link
              href={t.href}
              data-testid={`tile-${t.key}`}
              {...(t.coach ? { "data-coach": t.coach } : {})}
              className="flex min-h-[112px] flex-col justify-between gap-3 rounded-2xl border border-brand/10 bg-surface p-4 shadow-hover transition-all hover:border-brand/30 active:scale-[0.98]"
            >
              <span className={`flex size-11 items-center justify-center rounded-xl ${t.tint}`}>{t.icon}</span>
              <span className="min-w-0">
                <span className="block text-[16px] font-extrabold leading-tight text-ink">{t.label}</span>
                <span className="mt-0.5 block truncate text-[12px] text-muted" data-testid={`tile-${t.key}-subtitle`}>
                  {t.subtitle}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
