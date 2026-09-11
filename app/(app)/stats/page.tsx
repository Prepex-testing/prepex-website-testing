"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import { EffortStats } from "@/components/stats/EffortStats";
import { AccuracyStats } from "@/components/stats/AccuracyStats";
import { ProgressStats } from "@/components/stats/ProgressStats";

const TABS = [
  { id: "effort", label: "Effort", Panel: EffortStats },
  { id: "accuracy", label: "Accuracy", Panel: AccuracyStats },
  { id: "progress", label: "Progress", Panel: ProgressStats },
] as const;

type TabId = (typeof TABS)[number]["id"];

// Quick out, gentler in — the switch reads as one smooth beat, not a pause.
const FADE_OUT_MS = 150;
const FADE_IN_MS = 250;

/**
 * Stats is a single page at a single URL. The three tabs are plain components
 * switched by state — no routes and no URL change — so the header and tab bar
 * are never replaced when switching.
 *
 * All three panels mount together on entry (each fetches its own data, as
 * before) and the inactive ones are hidden, so after the first load a switch
 * is instant and each tab keeps its scroll position and open sections.
 */
export default function StatsPage() {
  // `activeId` is the tab that was picked — it drives the title and the
  // highlighted pill straight away. `shownId` is the panel actually on screen;
  // it follows once the outgoing panel has finished fading out, so the two
  // never overlap and the switch never cuts.
  const [activeId, setActiveId] = useState<TabId>("effort");
  const [shownId, setShownId] = useState<TabId>("effort");
  const activeTab = TABS.find((tab) => tab.id === activeId) ?? TABS[0];

  // Hand over once the fade-out has run. A timer rather than the animation's
  // completion callback: a fade with nothing left to animate never reports
  // completing, which could leave the panel area blank. Clicking again
  // restarts it, and clicking back to the shown tab cancels it.
  useEffect(() => {
    if (activeId === shownId) return;
    const handOver = setTimeout(() => setShownId(activeId), FADE_OUT_MS);
    return () => clearTimeout(handOver);
  }, [activeId, shownId]);

  return (
    <div className="flex flex-col gap-8 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-h1 text-ink">{activeTab.label}</h1>

        <div className="flex shrink-0 items-center gap-4">
          <ThemeToggle />
          <NotificationBell />
          <UserMenu />
        </div>
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Stats"
        className="inline-flex h-[41px] w-full max-w-[299px] items-center gap-1 rounded-[8px] bg-[#1A1A4E] p-1"
      >
        {TABS.map((tab) => {
          const active = tab.id === activeId;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`stats-tab-${tab.id}`}
              aria-selected={active}
              aria-controls={`stats-panel-${tab.id}`}
              onClick={() => setActiveId(tab.id)}
              className={`
                flex h-[33px] flex-1 items-center justify-center
                rounded-[6px]
                px-5
                text-[14px]
                leading-[21px]
                transition-all
                duration-300
                ease-out
                ${active
                  ? "bg-[#FAF7F2] font-bold text-[#1A1A4E]"
                  : "font-medium text-[#FAF7F2] hover:bg-white/10"
                }
              `}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* A cross-fade, opacity only: the current panel fades out, then the
          picked one fades in, so nothing slides and nothing cuts. All three
          stay mounted (inactive ones hidden), so each keeps its data and
          scroll position. `min-h-screen` keeps the page taller than the
          viewport, so a long-to-short switch never drops the scrollbar and
          shifts the page sideways. */}
      <div className="min-h-screen">
        {TABS.map(({ id, Panel }) => {
          const shown = id === shownId;
          // Visible only once it's both picked and handed over; a panel that's
          // shown but no longer picked is the one fading out.
          const visible = shown && id === activeId;

          return (
            <motion.div
              key={id}
              role="tabpanel"
              id={`stats-panel-${id}`}
              aria-labelledby={`stats-tab-${id}`}
              hidden={!shown}
              initial={false}
              animate={{ opacity: visible ? 1 : 0 }}
              transition={{
                duration: visible ? FADE_IN_MS / 1000 : FADE_OUT_MS / 1000,
                ease: "easeOut",
              }}
            >
              <Panel />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
