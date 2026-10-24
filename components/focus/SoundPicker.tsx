"use client";

import { SOUND_OPTIONS, isSoundId, type SoundId } from "@/lib/focus/soundscape";

type Props = {
  value: SoundId;
  onChange: (id: SoundId) => void;
};

/** The background sound for the session. Switching it while the timer runs changes it straight away. */
export function SoundPicker({ value, onChange }: Props) {
  return (
    <label className="flex flex-col gap-1.5 text-[14px] font-semibold text-body-text dark:text-ink" htmlFor="focus-sound">
      Background sound
      <select
        id="focus-sound"
        data-testid="focus-sound"
        value={value}
        onChange={(e) => {
          if (isSoundId(e.target.value)) onChange(e.target.value);
        }}
        className="h-12 w-full rounded-xl border border-input-border bg-surface px-3 text-[16px] text-body-text outline-none focus:border-brand dark:text-ink"
      >
        {SOUND_OPTIONS.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
