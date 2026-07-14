"use client";

import { useId, useRef, useState } from "react";
import type { ChangeEvent, InputHTMLAttributes } from "react";
import { CalendarIcon } from "@/components/ui/icons";

const DISPLAY_FORMAT = "DD/MM/YYYY";

type DateInputProps = {
  label: string;
  helperText?: string;
  required?: boolean;
  defaultValue?: string;
  onDateChange?: (value: string) => void;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange" | "defaultValue">;

function isoToDisplay(iso: string): string {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return "";
  return `${day}/${month}/${year}`;
}

export function DateInput({
  label,
  helperText,
  required,
  id,
  name,
  placeholder = DISPLAY_FORMAT,
  defaultValue = "",
  onDateChange,
  ...props
}: DateInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [value, setValue] = useState(defaultValue);
  const nativeDateRef = useRef<HTMLInputElement>(null);

  const openPicker = () => {
    const nativeInput = nativeDateRef.current;
    if (!nativeInput) return;
    if (typeof nativeInput.showPicker === "function") {
      nativeInput.showPicker();
    } else {
      nativeInput.focus();
    }
  };

  const handleNativeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const display = isoToDisplay(event.target.value);
    setValue(display);
    onDateChange?.(display);
  };

  const handleTextChange = (event: ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value);
    onDateChange?.(event.target.value);
  };

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={inputId}
        className="text-[14px] font-semibold leading-[20px] text-[#334155]"
      >
        {label}
        {required && <span className="text-cta"> *</span>}
      </label>
      {helperText && <p className="text-xs text-muted">{helperText}</p>}
      <div className="relative mt-1 flex items-center gap-2 rounded-xl border border-brand/15 px-4 py-3 focus-within:border-focus-ring">
        <input
          id={inputId}
          name={name}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={value}
          onChange={handleTextChange}
          placeholder={placeholder}
          aria-describedby={`${inputId}-format`}
          className="flex-1 bg-transparent text-sm text-body-text outline-none placeholder:text-muted/70"
          {...props}
        />
        <button
          type="button"
          onClick={openPicker}
          aria-label={`Pick a date for ${label}`}
          className="shrink-0 text-muted hover:text-ink"
        >
          <CalendarIcon />
        </button>
        <input
          ref={nativeDateRef}
          type="date"
          tabIndex={-1}
          aria-hidden="true"
          onChange={handleNativeChange}
          className="pointer-events-none absolute inset-y-0 right-4 w-0 opacity-0"
        />
      </div>
      <p id={`${inputId}-format`} className="text-[11px] text-muted/70">
        Format: {DISPLAY_FORMAT}
      </p>
    </div>
  );
}
