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
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);

  // Convert backend total minutes → hours + minutes
  useEffect(() => {
    if (value == null || value <= 0) {
      setHours(0);
      setMinutes(0);
      return;
    }

    setHours(Math.min(Math.floor(value / 60), MAX_HOURS));
    setMinutes(Math.min(value % 60, MAX_MINUTES));
  }, [value]);

  const updateDuration = (
    nextHours: number,
    nextMinutes: number,
  ) => {
    const totalMinutes =
      nextHours * 60 + nextMinutes;

    onChange(
      totalMinutes > 0
        ? totalMinutes
        : undefined,
    );
  };

  const handleHoursChange = (
    inputValue: string,
  ) => {
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

  return (
    <div className="flex flex-col gap-2">
      <label className="text-body-lg font-medium leading-none text-body-text dark:text-ink">
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