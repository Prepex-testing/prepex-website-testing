"use client";

import { postOnboardingEvents, type OnboardingMetric } from "@/lib/api/onboarding";
import { trackOnboarding } from "@/lib/onboarding/telemetry";

/**
 * C6: per-question metrics for the canvas, batched and sent in the background (a failed send is dropped: metrics
 * never get in a student's way). Also mirrored to the existing telemetry so the old funnel tooling sees v2 too.
 */
let queue: OnboardingMetric[] = [];
let cohort: "account" | "guest" = "account";
let timer: ReturnType<typeof setTimeout> | undefined;
const shownAt = new Map<string, number>();

export function setMetricsCohort(c: "account" | "guest") {
  cohort = c;
}

export function flushMetrics(): void {
  clearTimeout(timer);
  if (queue.length === 0) return;
  const events = queue.slice(0, 50);
  queue = queue.slice(50);
  void postOnboardingEvents({ flowVersion: "v2", cohort, events }).catch(() => undefined);
  if (queue.length) flushMetrics();
}

function push(m: OnboardingMetric) {
  queue.push(m);
  clearTimeout(timer);
  timer = setTimeout(flushMetrics, 1500);
}

export function questionShown(question: string) {
  shownAt.set(question, Date.now());
  push({ question, kind: "view" });
  trackOnboarding("onboarding_step_view", { stepNumber: 0, stepName: `v2:${question}` });
}

export function questionDone(question: string, kind: "answer" | "skip" | "back", input: "tap" | "voice" = "tap") {
  const at = shownAt.get(question);
  push({ question, kind, ...(at ? { ms: Math.min(3_600_000, Date.now() - at) } : {}), ...(kind === "answer" ? { input } : {}) });
  if (kind !== "back") trackOnboarding("onboarding_step_complete", { stepNumber: 0, stepName: `v2:${question}` });
}
