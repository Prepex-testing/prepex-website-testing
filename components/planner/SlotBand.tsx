"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Circle, Coffee, Dumbbell, Flower2, GraduationCap, Presentation, UtensilsCrossed, Users } from "lucide-react";
import type { Band } from "@/lib/api/plannerV2";
import { formatClock, formatDuration } from "@/lib/planner/format";

const SLOT: Record<string, { label: string; icon: typeof Circle }> = {
  school: { label: "School", icon: GraduationCap },
  coaching: { label: "Coaching", icon: Presentation },
  meal: { label: "Meal", icon: UtensilsCrossed },
  break: { label: "Break", icon: Coffee },
  prayer: { label: "Prayer", icon: Flower2 },
  family: { label: "Family time", icon: Users },
  exercise: { label: "Exercise", icon: Dumbbell },
};

export const slotLabel = (chip: string): string => SLOT[chip]?.label ?? chip.charAt(0).toUpperCase() + chip.slice(1);

/**
 * A slot that is not study time (a meal, school, coaching, a break). Context only: thin, dimmed, with no Start button,
 * no tick and no menu. Tapping it opens a small note with the slot's details and a way to change it in the timetable.
 * TODO(planner): editing the slot's time and label right here needs a timetable write; for now the note links to the
 * timetable screen, which owns the slot.
 */
export function SlotBand({ band }: { band: Band }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const { label, icon: Icon } = SLOT[band.chip] ?? { label: slotLabel(band.chip), icon: Circle };
  const range = `${formatClock(band.startMin)} – ${formatClock(band.endMin)}`;
  const length = formatDuration(band.endMin - band.startMin);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const esc = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={root} className="relative" data-testid="slot-band" data-slot={band.chip}>
      <button
        type="button"
        aria-expanded={open}
        aria-label={`${label}, ${length}, ${range}. Show details.`}
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-full items-center gap-2.5 rounded-lg bg-black/[0.03] px-3 text-left text-[12px] text-slate-500 hover:bg-black/[0.05] dark:bg-white/[0.03] dark:text-slate-400 dark:hover:bg-white/[0.05]"
      >
        <Icon className="size-4 shrink-0" aria-hidden />
        <span className="min-w-0 truncate font-medium">
          {label} · {length} · {range}
        </span>
      </button>
      {open && (
        <div role="dialog" aria-label={`${label} details`} className="absolute left-0 top-12 z-20 w-64 rounded-xl border border-brand/10 bg-surface p-4 shadow-modal" data-testid="slot-popover">
          <p className="text-[14px] font-extrabold text-ink">{label}</p>
          <p className="mt-1 text-[13px] text-muted">{range}</p>
          <p className="text-[13px] text-muted">{length}</p>
          <Link href="/timetable" className="mt-3 flex min-h-11 items-center text-[13px] font-semibold text-ink underline">
            Change this in your timetable
          </Link>
        </div>
      )}
    </div>
  );
}
