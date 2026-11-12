"use client";

import Link from "next/link";
import { Pexo } from "@/components/pexo/Pexo";
import { usePexo } from "@/lib/pexo/store";

/**
 * "Your climb" on Home and the profile: today's step, steps climbed, days to JEE and a tiny path. It reads the Climb
 * summary that already rides the XP summary: no request of its own. Nothing when Pexo or the Climb is off.
 */
export function ClimbStrip({ variant = "home" }: { variant?: "home" | "profile" }) {
  const { enabled, state } = usePexo();
  const c = state?.climb;
  if (!enabled || !c) return null;
  return (
    <Link href="/home/climb" className="flex items-center gap-3 rounded-2xl border border-border-subtle bg-surface p-4 transition-colors hover:bg-tint-strong focus-visible:ring-2 focus-visible:ring-brand" data-testid={variant === "home" ? "home-climb-strip" : "profile-climb-card"} aria-label={`Your climb: ${c.steps} steps climbed. ${c.todayStudied ? "Today's step is done." : "Today's step is waiting."} View climb`}>
      <Pexo size={48} mood={c.todayStudied ? "proud" : "curious"} />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-bold text-ink">Your climb</p>
        <p className="text-[13px] text-muted">
          {c.steps} steps climbed · today {c.todayStudied ? "done" : "waiting"}
          {c.daysToExam !== null ? ` · ${c.daysToExam} days to JEE` : ""}
        </p>
      </div>
      {/* a tiny path: six steps behind, today on top (filled once today's step is done) */}
      <svg viewBox="0 0 70 34" className="h-9 w-[74px] shrink-0" aria-hidden>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={i} x={i * 10} y={28 - i * 4} width={8} height={4} rx={2} fill="var(--brand)" opacity={0.25 + i * 0.1} />
        ))}
        <rect x={60} y={4} width={8} height={4} rx={2} fill={c.todayStudied ? "var(--cta)" : "none"} stroke="var(--cta)" strokeWidth={1.2} />
      </svg>
      {variant === "profile" && <span className="text-[13px] font-semibold text-brand underline">View climb</span>}
    </Link>
  );
}
