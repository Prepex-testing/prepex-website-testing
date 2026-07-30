"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { CalendarIcons } from "@/assets/icons";
import { ChevronRightIcon } from "@/components/ui/icons";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type DateInputProps = {
  label: string;
  helperText?: string;
  required?: boolean;
  id?: string;
  name?: string;
  /** Text shown before a date is chosen */
  placeholder?: string;
  defaultValue?: string;
  /** Returns the display date string (DD/MM/YYYY) — same as the old component */
  onDateChange?: (value: string) => void;
};

function parseDisplayDate(display: string): Date | null {
  const [day, month, year] = display.split("/").map(Number);
  if (!day || !month || !year) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDisplay(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

function toIso(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const YEARS_PER_PAGE = 12;

/** 6 weeks (42 days) starting on the Sunday on/before the 1st of the month */
function buildMonthGrid(viewDate: Date): Date[] {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const startOffset = new Date(year, month, 1).getDay();
  const gridStart = new Date(year, month, 1 - startOffset);
  return Array.from(
    { length: 42 },
    (_, i) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i),
  );
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
  const [value, setValue] = useState(defaultValue);
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"days" | "years">("days");
  const [viewDate, setViewDate] = useState(() => parseDisplayDate(defaultValue) ?? new Date());
  const [yearRangeStart, setYearRangeStart] = useState(() => (parseDisplayDate(defaultValue) ?? new Date()).getFullYear() - 5);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDate = parseDisplayDate(value);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const openPicker = () => {
    setViewDate(selectedDate ?? new Date());
    setMode("days");
    setIsOpen(true);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (isOpen) setIsOpen(false);
      else openPicker();
    }
  };

  const selectDate = (date: Date) => {
    const display = toDisplay(date);
    setValue(display);
    onDateChange?.(display);
    setIsOpen(false);
  };

  const changeMonth = (delta: number) => {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  };

  const openYearGrid = () => {
    setYearRangeStart(viewDate.getFullYear() - 5);
    setMode("years");
  };

  const changeYearRange = (delta: number) => {
    setYearRangeStart((current) => current + delta * YEARS_PER_PAGE);
  };

  const selectYear = (year: number) => {
    setViewDate((current) => new Date(year, current.getMonth(), 1));
    setMode("days");
  };

  const displayText = value || placeholder;
  const gridDays = buildMonthGrid(viewDate);
  const today = new Date();

  return (
    <div className="flex w-full flex-col gap-2" ref={containerRef}>
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

      <div className="relative w-full max-w-[681px]">
        {/*
          Input box — Figma: 681 x ~92, radius Large (16px), border 1px, padding 20px, gap 24px
          Light: border #1A1A4E · shadow 0 2 8 #1A1A4E14
          Dark:  border #1A1A4E33 · shadow 0 2 8 #1A1A4E14
        */}
        <div
          id={inputId}
          role="button"
          tabIndex={0}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-label={label}
          onClick={() => (isOpen ? setIsOpen(false) : openPicker())}
          onKeyDown={handleKeyDown}
          className="
            relative flex w-full cursor-pointer items-center
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

          {/* Carries the ISO value for native form submission, if ever needed */}
          <input
            type="hidden"
            name={name}
            value={selectedDate ? toIso(selectedDate) : ""}
            readOnly
          />
        </div>

        {/* Calendar popover — anchored above the field so it always stays within the viewport */}
        {isOpen && (
          <div
            role="dialog"
            aria-label={`Choose ${label}`}
            className="
              absolute bottom-full left-0 z-30 mb-2 w-[272px] max-w-[calc(100vw-2rem)]
              max-h-[min(360px,calc(100vh-2rem))] overflow-y-auto rounded-2xl
              border-2 border-brand/20 bg-surface p-3 shadow-[0_10px_30px_0_rgba(26,26,78,0.25)]
            "
          >
            {/* Month / year header */}
            <div className="flex items-center justify-between px-1 pb-2">
              <button
                type="button"
                aria-label={mode === "days" ? "Previous month" : "Previous years"}
                onClick={() => (mode === "days" ? changeMonth(-1) : changeYearRange(-1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink transition-colors hover:bg-brand/10"
              >
                <ChevronRightIcon className="h-4 w-4 rotate-180" />
              </button>
              <button
                type="button"
                onClick={() => (mode === "days" ? openYearGrid() : setMode("days"))}
                className="rounded-lg px-2 py-1 text-[14px] font-bold text-ink transition-colors hover:bg-brand/10 sm:text-[16px]"
              >
                {mode === "days"
                  ? `${MONTH_LABELS[viewDate.getMonth()]} ${viewDate.getFullYear()}`
                  : `${yearRangeStart} – ${yearRangeStart + YEARS_PER_PAGE - 1}`}
              </button>
              <button
                type="button"
                aria-label={mode === "days" ? "Next month" : "Next years"}
                onClick={() => (mode === "days" ? changeMonth(1) : changeYearRange(1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink transition-colors hover:bg-brand/10"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>

            {mode === "years" ? (
              /* Year grid */
              <div className="grid grid-cols-3 gap-2 px-1 py-1">
                {Array.from({ length: YEARS_PER_PAGE }, (_, i) => yearRangeStart + i).map((year) => {
                  const selected = selectedDate !== null && selectedDate.getFullYear() === year;
                  const isCurrentYear = today.getFullYear() === year;
                  return (
                    <button
                      key={year}
                      type="button"
                      onClick={() => selectYear(year)}
                      aria-pressed={selected}
                      className={`flex h-10 items-center justify-center rounded-lg text-[13px] font-medium transition-colors ${
                        selected ? "bg-cta text-white" : "text-ink hover:bg-brand/10"
                      } ${isCurrentYear && !selected ? "ring-1 ring-inset ring-cta" : ""}`}
                    >
                      {year}
                    </button>
                  );
                })}
              </div>
            ) : (
              <>
                {/* Weekday labels */}
                <div className="grid grid-cols-7 gap-1 pb-1 text-center text-[11px] font-semibold text-muted">
                  {WEEKDAY_LABELS.map((weekday, index) => (
                    <span key={index}>{weekday}</span>
                  ))}
                </div>

                {/* Day grid */}
                <div className="grid grid-cols-7 gap-1">
                  {gridDays.map((date) => {
                    const inMonth = date.getMonth() === viewDate.getMonth();
                    const selected = selectedDate !== null && isSameDay(date, selectedDate);
                    const isToday = isSameDay(date, today);
                    return (
                      <button
                        key={toIso(date)}
                        type="button"
                        onClick={() => selectDate(date)}
                        aria-current={isToday ? "date" : undefined}
                        aria-pressed={selected}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg text-[12px] font-medium transition-colors ${
                          selected
                            ? "bg-cta text-white"
                            : inMonth
                              ? "text-ink hover:bg-brand/10"
                              : "text-muted/50 hover:bg-brand/5"
                        } ${isToday && !selected ? "ring-1 ring-inset ring-cta" : ""}`}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
