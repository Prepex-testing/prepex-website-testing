"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { CalendarIcon, CalendarIcons } from "@/assets/icons";
import { ChevronRightIcon } from "@/components/ui/icons";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

type DateFieldProps = {
  label: string;
  helperText?: string;
  required?: boolean;
  id?: string;
  name?: string;
  placeholder?: string;
  defaultValue?: string;
  onDateChange?: (value: string) => void;
  disablePast?: boolean;
  labelClassName?: string;
};

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseDisplayDate(display: string): Date | null {
  const [day, month, year] = display.split("/").map(Number);

  if (!day || !month || !year) return null;

  const date = new Date(year, month - 1, day);

  if (
    Number.isNaN(date.getTime()) ||
    date.getDate() !== day ||
    date.getMonth() !== month - 1 ||
    date.getFullYear() !== year
  ) {
    return null;
  }

  return date;
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

function buildMonthGrid(viewDate: Date): Date[] {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const startOffset = new Date(year, month, 1).getDay();
  const gridStart = new Date(year, month, 1 - startOffset);

  return Array.from(
    { length: 42 },
    (_, index) =>
      new Date(
        gridStart.getFullYear(),
        gridStart.getMonth(),
        gridStart.getDate() + index,
      ),
  );
}

export function DateField({
  label,
  helperText,
  required,
  id,
  name,
  placeholder = "dd/mm/yyyy",
  defaultValue = "",
  onDateChange,
  disablePast = false,
  labelClassName = "text-body-lg font-medium leading-none text-body-text dark:text-ink",
}: DateFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  const [value, setValue] = useState(defaultValue);
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"days" | "years">("days");

  const [viewDate, setViewDate] = useState(
    () => parseDisplayDate(defaultValue) ?? new Date(),
  );

  const [yearRangeStart, setYearRangeStart] = useState(
    () => (parseDisplayDate(defaultValue) ?? new Date()).getFullYear() - 5,
  );

  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDate = parseDisplayDate(value);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
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

      if (isOpen) {
        setIsOpen(false);
      } else {
        openPicker();
      }
    }
  };

  const selectDate = (date: Date) => {
    if (disablePast && date < startOfDay(new Date())) {
      return;
    }

    const display = toDisplay(date);

    setValue(display);
    onDateChange?.(display);
    setIsOpen(false);
  };

  const changeMonth = (delta: number) => {
    setViewDate(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + delta, 1),
    );
  };

  const openYearGrid = () => {
    setYearRangeStart(viewDate.getFullYear() - 5);
    setMode("years");
  };

  const changeYearRange = (delta: number) => {
    setYearRangeStart(
      (current) => current + delta * YEARS_PER_PAGE,
    );
  };

  const selectYear = (year: number) => {
    setViewDate(
      (current) => new Date(year, current.getMonth(), 1),
    );
    setMode("days");
  };

  const displayText = value || placeholder;
  const gridDays = buildMonthGrid(viewDate);

  const today = new Date();
  const todayStart = startOfDay(today);

  const isAtCurrentMonth =
    viewDate.getFullYear() === today.getFullYear() &&
    viewDate.getMonth() === today.getMonth();

  const isPrevYearRangeAllPast =
    disablePast && yearRangeStart <= today.getFullYear();

  return (
    <div
      ref={containerRef}
      className="flex w-full flex-col gap-2"
    >
     <label htmlFor={inputId} className={labelClassName}>
        {label}
        {required && <span className="text-cta"> *</span>}
      </label>

      {helperText && (
        <p className="text-[12px] leading-none text-muted dark:text-[#9A9AB0]">
          {helperText}
        </p>
      )}

      <div className="relative w-full">
        <div
          id={inputId}
          role="button"
          tabIndex={0}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-label={label}
          onClick={() => (isOpen ? setIsOpen(false) : openPicker())}
          onKeyDown={handleKeyDown}
          className="flex h-12.25 w-full min-w-0 cursor-pointer items-center justify-between gap-3 rounded-xl border border-input-border bg-surface px-4 shadow-input transition-colors focus:outline-none focus-visible:border-input-border"
        >
          <span
            className={`min-w-0 flex-1 truncate font-['Plus_Jakarta_Sans'] text-[14px] font-medium leading-[14px] tracking-normal sm:text-[16px] sm:leading-[16px] ${value
                ? "text-ink"
                : "font-normal text-[#666666] dark:text-[#8B8998]"
              }`}
          >
            {displayText}
          </span>

          <span className="flex h-6 w-6 shrink-0 items-center justify-center text-muted">
            <CalendarIcon className="h-[21px] w-[21px] text-[#8FA0B8] dark:text-[#A9AAC5]" />
          </span>

          <input
            type="hidden"
            name={name}
            value={selectedDate ? toIso(selectedDate) : ""}
            readOnly
          />
        </div>

        {isOpen && (
          <div
            role="dialog"
            aria-label={`Choose ${label}`}
            className="absolute left-0 top-full z-50 mt-2 w-[272px] max-w-[calc(100vw-2rem)] max-h-[min(360px,calc(100vh-2rem))] overflow-y-auto rounded-2xl border-2 border-brand/20 bg-surface p-3 shadow-[0_10px_30px_0_rgba(26,26,78,0.25)]"
          >
            <div className="flex items-center justify-between px-1 pb-2">
              <button
                type="button"
                aria-label={mode === "days" ? "Previous month" : "Previous years"}
                onClick={() =>
                  mode === "days"
                    ? changeMonth(-1)
                    : changeYearRange(-1)
                }
                disabled={
                  disablePast &&
                  (mode === "days"
                    ? isAtCurrentMonth
                    : isPrevYearRangeAllPast)
                }
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink transition-colors hover:bg-brand/10 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronRightIcon className="h-4 w-4 rotate-180" />
              </button>

              <button
                type="button"
                onClick={() =>
                  mode === "days"
                    ? openYearGrid()
                    : setMode("days")
                }
                className="min-w-0 truncate rounded-lg px-2 py-1 text-[14px] font-bold text-ink transition-colors hover:bg-brand/10 sm:text-[16px]"
              >
                {mode === "days"
                  ? `${MONTH_LABELS[viewDate.getMonth()]} ${viewDate.getFullYear()}`
                  : `${yearRangeStart} – ${yearRangeStart + YEARS_PER_PAGE - 1}`}
              </button>

              <button
                type="button"
                aria-label={mode === "days" ? "Next month" : "Next years"}
                onClick={() =>
                  mode === "days"
                    ? changeMonth(1)
                    : changeYearRange(1)
                }
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink transition-colors hover:bg-brand/10"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>

            {mode === "years" ? (
              <div className="grid grid-cols-3 gap-2 px-1 py-1">
                {Array.from(
                  { length: YEARS_PER_PAGE },
                  (_, index) => yearRangeStart + index,
                ).map((year) => {
                  const selected =
                    selectedDate !== null &&
                    selectedDate.getFullYear() === year;

                  const isCurrentYear =
                    today.getFullYear() === year;

                  const isPastYear =
                    disablePast &&
                    year < today.getFullYear();

                  return (
                    <button
                      key={year}
                      type="button"
                      onClick={() => selectYear(year)}
                      disabled={isPastYear}
                      aria-pressed={selected}
                      className={`flex h-10 items-center justify-center rounded-lg text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:text-muted/40 disabled:hover:bg-transparent ${selected
                        ? "bg-cta text-white"
                        : "text-ink hover:bg-brand/10"
                        } ${isCurrentYear && !selected
                          ? "ring-1 ring-inset ring-cta"
                          : ""
                        }`}
                    >
                      {year}
                    </button>
                  );
                })}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-7 gap-1 pb-1 text-center text-[11px] font-semibold text-muted">
                  {WEEKDAY_LABELS.map((weekday, index) => (
                    <span key={index}>{weekday}</span>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {gridDays.map((date) => {
                    const inMonth =
                      date.getMonth() === viewDate.getMonth();

                    const selected =
                      selectedDate !== null &&
                      isSameDay(date, selectedDate);

                    const isToday =
                      isSameDay(date, today);

                    const isPast =
                      disablePast &&
                      date < todayStart;

                    return (
                      <button
                        key={toIso(date)}
                        type="button"
                        onClick={() => selectDate(date)}
                        disabled={isPast}
                        aria-current={
                          isToday ? "date" : undefined
                        }
                        aria-pressed={selected}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg text-[12px] font-medium transition-colors disabled:cursor-not-allowed disabled:text-muted/40 disabled:hover:bg-transparent ${selected
                          ? "bg-cta text-white"
                          : inMonth
                            ? "text-ink hover:bg-brand/10"
                            : "text-muted/50 hover:bg-brand/5"
                          } ${isToday && !selected
                            ? "ring-1 ring-inset ring-cta"
                            : ""
                          }`}
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