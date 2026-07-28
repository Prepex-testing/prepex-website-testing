"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/layout/AuthCard";
import { AnimatedCircularProgress } from "@/components/ui/AnimatedCircularProgress";
// import { CalendarIcon, ClockIcon} from "@/components/ui/icons";
import { confirmOnboarding } from "@/lib/api/onboarding";
import { useStoredFullName } from "@/lib/auth/useStoredFullName";
import { GraduationCapIcon, BookIcon, ClockIcon, CalendarIcon } from "@/assets/icons";
const REDIRECT_DELAY_MS = 2000;

const PROFILE_SUMMARY = [
  { icon: <CalendarIcon />, text: "JEE Main 2026 in 284 days" },
  { icon: <ClockIcon />, text: "6-7 hours daily study target" },
  { icon: <BookIcon />, text: "42 chapters already studied" },
  { icon: <GraduationCapIcon />, text: "Allen Coaching (Evening Batch) schedule" },
];

export default function AnalyzingPage() {
  const router = useRouter();
  const name = useStoredFullName();

  useEffect(() => {
    confirmOnboarding().catch(() => {
      // Best-effort — the welcome screen doesn't block on this succeeding.
    });

    const timer = setTimeout(() => {
      router.push("/onboarding/welcome-to-prepex");
    }, REDIRECT_DELAY_MS);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <AuthCard>
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-h2 text-ink">All set{name ? `, ${name}` : ""}</h1>
        <p className="text-sm text-muted">Generating your first plan...</p>
      </div>

      <div className="mt-6 flex justify-center">
        <AnimatedCircularProgress
          targetPercent={100}
          durationMs={REDIRECT_DELAY_MS}
          label="Optimizing"
        />
      </div>

      <p className="mt-6 text-center text-sm font-bold text-ink">
        Based on your academic profile
      </p>

      <div className="mt-3 flex flex-col gap-2">
        {PROFILE_SUMMARY.map((item) => (
          <div
            key={item.text}
            className="flex items-center gap-3 rounded-lg bg-tint-strong px-3 py-2.5"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-ink">
              {item.icon}
            </span>
            <span className="text-sm text-body-text">{item.text}</span>
          </div>
        ))}
      </div>

      <p className="mt-4 text-center text-xs font-medium text-processing-text">
        Processing academic data... This takes about 5 seconds.
      </p>
    </AuthCard>
  );
}
