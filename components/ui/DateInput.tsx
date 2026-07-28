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
    <div className="flex flex-col gap-2">
      <label
        htmlFor={inputId}
        className="text-[14px] font-bold leading-[100%] text-body-text dark:text-ink sm:text-[16px]"
      >
        {label}
        {required && <span className="text-cta"> *</span>}
      </label>
      {helperText && <p className="text-[12px] leading-[100%] text-body-text dark:text-muted">
        {helperText}
      </p>}
      {/* Input box — 681x56, radius Medium, border 1px */}
      <div
        className="relative flex h-14 items-center gap-2 rounded-xl border border-ink px-4 py-[16.5px] focus-within:border-focus-ring dark:border-muted"
        onClick={openPicker}
      >
        <input
          id={inputId}
          name={name}
          type="text"
          inputMode="numeric"
          value={value}
          onChange={handleTextChange}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm text-body-text outline-none placeholder:text-muted/70"
          {...props}
        />

        <span className="pointer-events-none shrink-0 text-muted">
          <CalendarIcon />
        </span>

        <input
          ref={nativeDateRef}
          type="date"
          tabIndex={-1}
          aria-hidden="true"
          onChange={handleNativeChange}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
      <p id={`${inputId}-format`} className="text-[11px] text-muted/70">
        Format: {DISPLAY_FORMAT}
      </p>
    </div>
  );
}