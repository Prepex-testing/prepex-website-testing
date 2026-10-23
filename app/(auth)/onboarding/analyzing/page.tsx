"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/layout/AuthCard";
import { AnimatedCircularProgress } from "@/components/ui/AnimatedCircularProgress";
import { useOnboardingDraft } from "@/lib/onboarding/draft-context";
import { useStoredFullName } from "@/lib/auth/useStoredFullName";
import { GraduationCapIcon, BookIcon, ClockIcon, CalendarIcon } from "@/assets/icons";
import { formatDuration } from "@/lib/timetable/grid";

const REDIRECT_DELAY_MS = 2000;
const DAY_MS = 86_400_000;

function daysUntil(iso: string, now: Date = new Date()): number {
  const target = Date.parse(`${iso}T00:00:00Z`);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / DAY_MS);
}

/**
 * The closing screen. The one save already happened on the last step, so this only shows what was saved — the
 * real figures from the student's own answers — before moving on.
 */
export default function AnalyzingPage() {
  const router = useRouter();
  const name = useStoredFullName();
  const { summary, reset } = useOnboardingDraft();

  // Everything is saved; the on-device copy of the answers is no longer needed.
  useEffect(() => {
    reset();
    const timer = setTimeout(() => router.push("/onboarding/welcome-to-prepex"), REDIRECT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [router, reset]);

  const items = useMemo(() => {
    if (!summary) return [];
    const list: Array<{ icon: React.ReactNode; text: string }> = [];
    if (summary.examDateIso) {
      const days = daysUntil(summary.examDateIso);
      const exam = summary.examName ?? "Your exam";
      list.push({ icon: <CalendarIcon />, text: days > 0 ? `${exam} is in ${days} day${days === 1 ? "" : "s"}` : `${exam} is coming up` });
    }
    if (summary.weeklyStudyMinutes > 0) {
      list.push({ icon: <ClockIcon />, text: `${formatDuration(summary.weeklyStudyMinutes)} of study time a week` });
    }
    list.push({
      icon: <BookIcon />,
      text:
        summary.chaptersCompleted > 0
          ? `${summary.chaptersCompleted} chapter${summary.chaptersCompleted === 1 ? "" : "s"} finished, ready for revision`
          : "Starting fresh: every chapter is still to learn",
    });
    if (summary.coachingLabel) list.push({ icon: <GraduationCapIcon />, text: summary.coachingLabel });
    return list;
  }, [summary]);

  return (
    <AuthCard>
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-h2 text-ink">All set{name ? `, ${name.trim().split(/\s+/)[0]}` : ""}</h1>
        <p className="text-sm text-muted">Building your first plan…</p>
      </div>

      <div className="mt-6 flex justify-center">
        <AnimatedCircularProgress targetPercent={100} durationMs={REDIRECT_DELAY_MS} label="Planning" />
      </div>

      {items.length > 0 && (
        <>
          <p className="mt-6 text-center text-sm font-bold text-ink">Based on what you told us</p>
          <div className="mt-3 flex flex-col gap-2">
            {items.map((item) => (
              <div key={item.text} className="flex items-center gap-3 rounded-lg bg-tint-strong px-3 py-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-ink">{item.icon}</span>
                <span className="text-sm text-body-text">{item.text}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="mt-4 text-center text-xs font-medium text-processing-text">This takes a few seconds.</p>
    </AuthCard>
  );
}
