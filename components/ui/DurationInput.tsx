"use client";

import { useEffect, useState } from "react";

type DurationInputProps = {
  label: string;
  value?: number;
  onChange: (minutes: number | undefined) => void;
  disabled?: boolean;
};

const MAX_HOURS = 24;
const MAX_MINUTES = 59;

const INPUT_CLASS =
  "min-w-0 flex-1 bg-transparent font-['Plus_Jakarta_Sans'] text-[14px] font-medium leading-[14px] tracking-normal text-ink outline-none placeholder:font-normal placeholder:text-[#666666] focus:outline-none dark:placeholder:text-[#8B8998] sm:text-[16px] sm:leading-[16px]";

const INPUT_BOX_CLASS =
  "flex h-12.25 w-full min-w-0 items-center gap-3 rounded-xl border border-input-border bg-surface px-4 shadow-input transition-colors focus-within:border-input-border";

const UNIT_CLASS =
  "shrink-0 font-['Plus_Jakarta_Sans'] text-[12px] font-normal leading-5 text-muted";

export function DurationInput({
  label,
  value,
  onChange,
  disabled = false,
}: DurationInputProps) {
  // Changed only these from 0 → ""
  const [hours, setHours] = useState<number | "">("");
  const [minutes, setMinutes] = useState<number | "">("");

  // Convert backend total minutes → hours + minutes
  useEffect(() => {
    if (value == null || value <= 0) {
      setHours("");
      setMinutes("");
      return;
    }

    setHours(Math.min(Math.floor(value / 60), MAX_HOURS));
    setMinutes(Math.min(value % 60, MAX_MINUTES));
  }, [value]);

  const updateDuration = (
    nextHours: number | "",
    nextMinutes: number | "",
  ) => {
    const totalMinutes =
      (nextHours === "" ? 0 : nextHours) * 60 +
      (nextMinutes === "" ? 0 : nextMinutes);

    onChange(
      totalMinutes > 0
        ? totalMinutes
        : undefined,
    );
  };

  const handleHoursChange = (
    inputValue: string,
  ) => {
    // Keep placeholder when field is empty
    if (inputValue === "") {
      setHours("");
      updateDuration("", minutes);
      return;
    }

    const nextHours = Math.min(
      Math.max(Number(inputValue) || 0, 0),
      MAX_HOURS,
    );

    setHours(nextHours);

    updateDuration(
      nextHours,
      minutes,
    );
  };

  const handleMinutesChange = (
    inputValue: string,
  ) => {
    // Keep placeholder when field is empty
    if (inputValue === "") {
      setMinutes("");
      updateDuration(hours, "");
      return;
    }

    const nextMinutes = Math.min(
      Math.max(Number(inputValue) || 0, 0),
      MAX_MINUTES,
    );

    setMinutes(nextMinutes);

    updateDuration(
      hours,
      nextMinutes,
    );
  };

  // Filling one field syncs the other to 0 (e.g. 2 hours → "0" min). That 0 is
  // only a display: clear it on focus so typing "15" doesn't read "015", and
  // show it again on blur if the field is left empty. The total is unchanged
  // either way ("" and 0 both count as zero), so no onChange is needed.
  const clearZeroOnFocus = (current: number | "", set: (next: number | "") => void) => {
    if (current === 0) set("");
  };
  const restoreZeroOnBlur = (
    current: number | "",
    other: number | "",
    set: (next: number | "") => void,
  ) => {
    if (current === "" && other !== "" && other > 0) set(0);
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-[13px] font-medium leading-none text-body-text dark:text-ink sm:text-[14px]">
        {label}
      </label>

      <div className="grid grid-cols-2 gap-2">
        {/* Hours */}
        <div className={INPUT_BOX_CLASS}>
          <input
            type="number"
            min={0}
            max={MAX_HOURS}
            step={1}
            value={hours}
            disabled={disabled}
            aria-label={`${label} hours`}
            placeholder="Hours"
            onChange={(event) =>
              handleHoursChange(event.target.value)
            }
            onFocus={() => clearZeroOnFocus(hours, setHours)}
            onBlur={() => restoreZeroOnBlur(hours, minutes, setHours)}
            className={`${INPUT_CLASS} disabled:cursor-not-allowed disabled:opacity-60`}
          />

          <span className={UNIT_CLASS}>
            hours
          </span>
        </div>

        {/* Minutes */}
        <div className={INPUT_BOX_CLASS}>
          <input
            type="number"
            min={0}
            max={MAX_MINUTES}
            step={1}
            value={minutes}
            disabled={disabled}
            aria-label={`${label} minutes`}
            placeholder="Minutes"
            onChange={(event) =>
              handleMinutesChange(event.target.value)
            }
            onFocus={() => clearZeroOnFocus(minutes, setMinutes)}
            onBlur={() => restoreZeroOnBlur(minutes, hours, setMinutes)}
            className={`${INPUT_CLASS} disabled:cursor-not-allowed disabled:opacity-60`}
          />

          <span className={UNIT_CLASS}>
            min
          </span>
        </div>
      </div>
    </div>
  );
}