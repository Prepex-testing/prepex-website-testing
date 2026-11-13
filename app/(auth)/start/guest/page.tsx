"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PexoSpeaks } from "@/components/onboardingV2/PexoSpeaks";
import { createGuest, ApiError } from "@/lib/api/auth";
import { getExams } from "@/lib/api/dashboard";
import { completeOnboarding, getDefaultExamDates } from "@/lib/api/onboarding";
import { markOnboardingComplete } from "@/lib/auth/onboardingGate";
import { saveSession } from "@/lib/auth/session";
import { examForOption, goalOption } from "@/lib/onboarding/goal";
import { buildFor, buildPayload } from "@/lib/onboardingV2/canvas";
import { useAuthFlags } from "@/lib/onboardingV2/flags";
import { GUEST_DEFAULTS, saveGuest } from "@/lib/onboardingV2/guest";
import { sayLocal } from "@/lib/onboardingV2/lines";
import { flushMetrics, setMetricsCohort } from "@/lib/onboardingV2/metrics";
import { postOnboardingEvents } from "@/lib/api/onboarding";

/**
 * Onboarding v2, Part D (D1): "Try Prepex first". Creates a guest account and onboards it with defaults (JEE Main +
 * Advanced, Class 12, no school, self-study, 6 h in the evening and night, a generated week, no chapters), then opens
 * Home. Only while GUEST_MODE is on; otherwise this address sends people to the sign-in screen.
 */
export default function GuestStartPage() {
  const router = useRouter();
  const { flags, ready } = useAuthFlags();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!ready) return;
    if (!flags.guestMode) {
      router.replace("/start");
      return;
    }
    if (started.current) return;
    started.current = true;
    void (async () => {
      try {
        const { data } = await createGuest();
        saveSession(data.tokens, data.user);
        setMetricsCohort("guest");
        const [{ data: exams }, { data: dates }] = await Promise.all([getExams(), getDefaultExamDates("CLASS_12", "JEE_BOTH")]);
        const exam = examForOption(goalOption("JEE_BOTH")!, exams);
        if (!exam) throw new Error("exam");
        const answers = { ...GUEST_DEFAULTS, examDates: dates.dates.map(({ kind, label, date, days, isDefault }) => ({ kind, label, date, days, isDefault })) };
        answers.week = buildFor(answers).blocks;
        await completeOnboarding(buildPayload(answers, exam.id) as Parameters<typeof completeOnboarding>[0]);
        void postOnboardingEvents({ flowVersion: "v2", cohort: "guest", events: [{ question: "finale", kind: "complete" }] }).catch(() => undefined);
        flushMetrics();
        markOnboardingComplete();
        saveGuest(data.user.id, { answers, asked: [] });
        router.replace("/home");
      } catch (err) {
        setError(err instanceof ApiError && err.status === 429 ? err.message : "We couldn't start a guest session. Please try again, or sign in.");
      }
    })();
  }, [ready, flags.guestMode, router]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col items-center justify-center gap-6 px-4" data-testid="guest-start">
      <PexoSpeaks pick={sayLocal("onb.building")} />
      {error && (
        <div className="flex flex-col items-center gap-3">
          <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-[14px] font-medium text-danger">
            {error}
          </p>
          <button type="button" onClick={() => router.replace("/start")} className="min-h-11 font-semibold text-ink underline">
            Back to sign in
          </button>
        </div>
      )}
    </main>
  );
}
