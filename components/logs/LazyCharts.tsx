"use client";

import dynamic from "next/dynamic";

/** The Phase 3 charts, loaded on demand (Recharts is large and browser-only). */
const placeholder = (height: string) => function Placeholder() {
  return <div className={`${height} animate-pulse rounded-xl bg-tint-strong`} aria-hidden />;
};

export const AccuracyBars = dynamic(() => import("@/components/logs/charts").then((m) => m.AccuracyBars), { ssr: false, loading: placeholder("h-64") });
export const BacklogTimeline = dynamic(() => import("@/components/logs/charts").then((m) => m.BacklogTimeline), { ssr: false, loading: placeholder("h-56") });
export const WeeklyAccuracyLine = dynamic(() => import("@/components/logs/charts").then((m) => m.WeeklyAccuracyLine), { ssr: false, loading: placeholder("h-52") });
export const SpeedLine = dynamic(() => import("@/components/logs/charts").then((m) => m.SpeedLine), { ssr: false, loading: placeholder("h-52") });
export const SourceDonut = dynamic(() => import("@/components/logs/charts").then((m) => m.SourceDonut), { ssr: false, loading: placeholder("h-56") });
