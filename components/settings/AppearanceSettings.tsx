"use client";

import { useState } from "react";
import { GlidePill } from "@/components/motion/GlidePill";
import { MOTION_STORAGE_KEY, type Theme } from "@/components/theme/constants";
import { useTheme } from "@/components/theme/ThemeProvider";

type MotionPref = "auto" | "full" | "lite";

function readMotionPref(): MotionPref {
  try {
    const v = localStorage.getItem(MOTION_STORAGE_KEY);
    return v === "full" || v === "lite" ? v : "auto";
  } catch {
    return "auto";
  }
}

/** Applies a motion choice at once (the same rule the pre-paint script uses on the next load). */
export function applyMotionPref(pref: MotionPref): void {
  try {
    if (pref === "auto") localStorage.removeItem(MOTION_STORAGE_KEY);
    else localStorage.setItem(MOTION_STORAGE_KEY, pref);
  } catch {
    /* private mode: applies to this page only */
  }
  const n = navigator as Navigator & { deviceMemory?: number };
  const lowEnd = (n.deviceMemory !== undefined && n.deviceMemory <= 4) || (n.hardwareConcurrency !== undefined && n.hardwareConcurrency <= 4);
  const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.setAttribute("data-motion", reduce ? "reduce" : pref === "lite" || (pref === "auto" && lowEnd) ? "lite" : "full");
}

function Segmented<T extends string>({ name, value, options, onChange }: { name: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={name} className="grid gap-1 rounded-xl bg-tint-strong p-1 dark:bg-[#FAF7F214]" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id} onClick={() => onChange(o.id)} className={`relative min-h-11 rounded-lg px-2 text-[14px] font-bold transition-colors ${value === o.id ? "text-ink" : "text-muted hover:text-ink"}`} data-testid={`${name.toLowerCase()}-${o.id}`}>
          {value === o.id && <GlidePill id={`appearance-${name}`} className="rounded-lg bg-surface shadow-sm" />}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

/** Settings → Appearance (P6): theme (light is the default for a new device) and how much the app moves. */
export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const [motion, setMotion] = useState<MotionPref>(readMotionPref);

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-brand/10 bg-surface p-4 shadow-sm sm:p-6" aria-labelledby="appearance-title" data-testid="appearance-settings">
      <div>
        <h2 id="appearance-title" className="text-[15px] font-bold leading-6 text-ink sm:text-[16px]">
          Appearance
        </h2>
        <p className="text-[12px] leading-4 text-muted">How Prepex looks and moves on this device.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-[13px] font-semibold text-ink">Theme</p>
        <Segmented<Theme>
          name="Theme"
          value={theme}
          onChange={setTheme}
          options={[
            { id: "light", label: "Light" },
            { id: "dark", label: "Dark" },
            { id: "system", label: "System" },
          ]}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-[13px] font-semibold text-ink">Motion</p>
        <Segmented<MotionPref>
          name="Motion"
          value={motion}
          onChange={(v) => {
            setMotion(v);
            applyMotionPref(v);
          }}
          options={[
            { id: "auto", label: "Auto" },
            { id: "full", label: "Full" },
            { id: "lite", label: "Lite" },
          ]}
        />
        <p className="text-[12px] text-muted">Lite keeps animations short and skips blur, for older phones. Auto picks Lite on phones with 4 GB of memory or less. Your device&apos;s reduce-motion setting always wins.</p>
      </div>
    </section>
  );
}
