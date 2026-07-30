"use client";

import { useId, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { CalendarIcons } from "@/assets/icons";

const DISPLAY_FORMAT = "DD/MM/YYYY";

type DateInputProps = {
  label: string;
  helperText?: string;
  required?: boolean;
  id?: string;
  name?: string;
  /** Text shown before a date is chosen */
  placeholder?: string;
  /** ISO date string, e.g. "2026-05-14" */
  defaultValue?: string;
  /** Returns the ISO date string (YYYY-MM-DD) */
  onDateChange?: (value: string) => void;
};

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
  placeholder = "Pick your exam date",
  defaultValue = "",
  onDateChange,
}: DateInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [value, setValue] = useState(
    defaultValue ? isoToDisplay(defaultValue) : ""
  );
  const nativeDateRef = useRef<HTMLInputElement>(null);

  const openPicker = () => {
    const el = nativeDateRef.current;
    if (!el) return;
    if (typeof el.showPicker === "function") el.showPicker();
    else el.focus();
  };

  const handleNativeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const iso = event.target.value;
    setValue(isoToDisplay(iso));
    onDateChange?.(iso);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPicker();
    }
  };

  const displayText = value || placeholder;

  return (
    <div className="flex w-full flex-col gap-2">
      {/* Label */}
      <label
        htmlFor={inputId}
        className="text-[14px] font-bold leading-none text-[#333333] dark:text-[#FAF7F2] sm:text-[16px]"
      >
        {label}
        {required && <span className="text-cta"> *</span>}
      </label>

      {/* Helper text */}
      {helperText && (
        <p className="text-[12px] leading-none text-[#6B6B7B] dark:text-[#9A9AB0]">
          {helperText}
        </p>
      )}

      <div
        role="button"
        tabIndex={0}
        aria-label={label}
        onClick={openPicker}
        onKeyDown={handleKeyDown}
        className="
          relative flex w-full max-w-[681px] cursor-pointer items-center
          gap-4 rounded-2xl border p-4 transition-colors sm:gap-6 sm:p-5
          border-[#1A1A4E] shadow-[0px_2px_8px_0px_#1A1A4E14]
          dark:border-[#1A1A4E33]
          focus:outline-none focus-visible:border-focus-ring
          focus-visible:ring-2 focus-visible:ring-[#1A1A4E33]
        "
      >
        {/*
          Icon box — Figma: 48 x 50.37, radius 8px, padding 13.35px
          Light bg #EEF0F8 · Dark bg #242453
        */}
        <span
          className="
            flex h-[50.37px] w-12 shrink-0 items-center justify-center rounded-lg
            bg-[#EEF0F8] text-[#1A1A4E]
            dark:bg-[#242453] dark:text-[#FAF7F2]
          "
        >
          {/* Icon uses currentColor: light #1A1A4E · dark #FAF7F2 */}
          <CalendarIcons className="h-[23.68px] w-[21.31px]" />
        </span>

        {/*
          Text — Figma: Plus Jakarta Sans, 600, 18px, line-height 100%
          Light #333333 · Dark #FAF7F2
        */}
        <span
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          className="flex-1 truncate text-[16px] font-semibold leading-none text-[#333333] dark:text-[#FAF7F2] sm:text-[18px]"
        >
          {displayText}
        </span>

        {/* Hidden native date input that drives the picker */}
        <input
          ref={nativeDateRef}
          id={inputId}
          name={name}
          type="date"
          defaultValue={defaultValue}
          tabIndex={-1}
          aria-hidden="true"
          onChange={handleNativeChange}
          className="pointer-events-none absolute bottom-0 left-4 h-0 w-0 opacity-0"
        />
      </div>
    </div>
  );
}