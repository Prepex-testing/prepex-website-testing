"use client";

import dynamic from "next/dynamic";

/** The Phase 4 charts, loaded on demand (Recharts is large and browser-only). */
const placeholder = (height: string) =>
  function Placeholder() {
    return <div className={`${height} animate-pulse rounded-xl bg-tint-strong`} aria-hidden />;
  };

export const SeriesLine = dynamic(() => import("@/components/insights/charts").then((m) => m.SeriesLine), { ssr: false, loading: placeholder("h-52") });
export const SeriesBars = dynamic(() => import("@/components/insights/charts").then((m) => m.SeriesBars), { ssr: false, loading: placeholder("h-56") });
