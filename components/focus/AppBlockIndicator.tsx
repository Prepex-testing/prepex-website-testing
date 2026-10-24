"use client";

import { BLOCKABLE_APPS, appBlockMode, type BlockableAppId } from "@/lib/focus/appBlock";

type Props = {
  blocked: BlockableAppId[];
  /** Setup: the chips are toggles. While running they are just a reminder. */
  onToggle?: (id: BlockableAppId) => void;
  disabled?: boolean;
};

/**
 * Which distracting apps are on the block list. On the Android app they are really blocked for the session; on the
 * web the timer cannot block anything, so it says so honestly and nudges the student when they come back.
 */
export function AppBlockIndicator({ blocked, onToggle, disabled = false }: Props) {
  const native = appBlockMode() === "native";
  const interactive = Boolean(onToggle);
  return (
    <div className="flex flex-col gap-2" data-testid="app-block">
      <p className="text-[12px] font-semibold text-muted">
        {native ? "Blocked during this session" : "Stay away from these. We'll remind you if you leave"}
      </p>
      <div className="flex flex-wrap gap-2">
        {BLOCKABLE_APPS.map((app) => {
          const on = blocked.includes(app.id);
          const common = `inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-[12px] font-bold transition-colors ${
            on ? "border-brand/30 bg-tint-strong text-ink dark:border-[#FAF7F233] dark:bg-[#FAF7F214]" : "border-brand/10 text-muted line-through"
          }`;
          return interactive ? (
            <button key={app.id} type="button" role="switch" aria-checked={on} data-testid={`block-${app.id}`} disabled={disabled} onClick={() => onToggle?.(app.id)} className={`${common} min-h-11`}>
              <span aria-hidden>{on ? "🚫" : "○"}</span>
              {app.label}
            </button>
          ) : (
            <span key={app.id} data-testid={`block-${app.id}`} data-blocked={on} className={common}>
              <span aria-hidden>{on ? "🚫" : "○"}</span>
              {app.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
