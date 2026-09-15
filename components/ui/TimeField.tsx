"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

type Period = "AM" | "PM";

type TimeFieldProps = {
  label: string;
  /** 24-hour "HH:MM", the same shape a native time input uses. */
  value: string;
  onChange: (value: string) => void;
  id?: string;
  icon?: ReactNode;
  /** Which edge of the field the popover lines up with — use "right" for a
   *  field near the right edge so the popover can't run off a narrow screen. */
  align?: "left" | "right";
  className?: string;
  labelClassName?: string;
  triggerClassName?: string;
  textClassName?: string;
};

const HOURS = Array.from({ length: 12 }, (_, index) => index + 1);
const STEP_MINUTES = Array.from({ length: 12 }, (_, index) => index * 5);
const PERIODS: Period[] = ["AM", "PM"];

/** Rough open height (header + 160px wheel + Done + padding), used to decide
 *  whether the popover fits below the field or should open above it. */
const POPOVER_HEIGHT = 260;

/**
 * Every column is the same fixed-height wheel. The 64px top/bottom padding
 * (half of 160px minus half a 32px row) lets any option scroll to the exact
 * middle, so the selected hour, minute and AM/PM always sit on one shared row.
 * The scrollbar is hidden and the top/bottom rows fade out instead of being
 * cut in half.
 */
const WHEEL =
  "flex h-40 flex-col gap-1 overflow-y-auto overscroll-contain py-16 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_bottom,transparent,black_28%,black_72%,transparent)] [-webkit-mask-image:linear-gradient(to_bottom,transparent,black_28%,black_72%,transparent)]";

function parseTime(value: string): { hour: number; minute: number; period: Period } {
  const [rawHour, rawMinute] = value.split(":").map(Number);
  const hour24 = Number.isFinite(rawHour) ? (((rawHour ?? 0) % 24) + 24) % 24 : 0;
  const minute = Number.isFinite(rawMinute) ? Math.min(59, Math.max(0, rawMinute ?? 0)) : 0;
  return { hour: hour24 % 12 === 0 ? 12 : hour24 % 12, minute, period: hour24 >= 12 ? "PM" : "AM" };
}

function toValue(hour: number, minute: number, period: Period): string {
  const hour24 = period === "AM" ? (hour === 12 ? 0 : hour) : hour === 12 ? 12 : hour + 12;
  return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** "23:00" -> "11:00 PM", matching how the native field displayed it. */
export function formatTime12(value: string): string {
  const { hour, minute, period } = parseTime(value);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${period}`;
}

function optionClass(selected: boolean): string {
  return `flex h-8 w-full shrink-0 items-center justify-center rounded-lg text-[13px] font-semibold transition-colors ${
    selected ? "bg-cta text-white" : "text-ink hover:bg-brand/10"
  }`;
}

/**
 * A time field with its own picker, replacing the browser's native time
 * popup — that one can't be sized or positioned, so on a narrow phone it could
 * open partly off-screen. This popover is capped to the viewport width, lines
 * up with whichever edge of the field keeps it on screen, and opens above the
 * field when there isn't room below.
 */
export function TimeField({
  label,
  value,
  onChange,
  id,
  icon,
  align = "left",
  className = "",
  labelClassName = "",
  triggerClassName = "",
  textClassName = "",
}: TimeFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const [isOpen, setOpen] = useState(false);
  const [openAbove, setOpenAbove] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const hasCentred = useRef(false);

  const { hour, minute, period } = parseTime(value);
  // A saved minute off the 5-minute grid (e.g. 10:07) still shows as selected.
  const minutes = STEP_MINUTES.includes(minute)
    ? STEP_MINUTES
    : [...STEP_MINUTES, minute].sort((a, b) => a - b);

  const toggle = () => {
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenAbove(spaceBelow < POPOVER_HEIGHT && rect.top > spaceBelow);
    }
    setOpen((open) => !open);
  };

  // Close on an outside click or Escape.
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      hasCentred.current = false;
    };
  }, [isOpen]);

  // Centre the selected option in each wheel — instantly when the popover
  // opens, smoothly after that as the student picks. Scrolls the wheels only,
  // never the page.
  useEffect(() => {
    if (!isOpen) return;
    const behavior: ScrollBehavior = hasCentred.current ? "smooth" : "auto";
    popoverRef.current?.querySelectorAll<HTMLElement>('[aria-selected="true"]').forEach((option) => {
      const wheel = option.parentElement;
      if (!wheel) return;
      const top = option.offsetTop - wheel.offsetTop - (wheel.clientHeight - option.offsetHeight) / 2;
      wheel.scrollTo({ top, behavior });
    });
    hasCentred.current = true;
  }, [isOpen, hour, minute, period]);

  const column = (name: string, children: ReactNode) => (
    <div className="flex min-w-0 flex-col">
      <span className="mb-1 h-4 text-center text-[10px] font-bold uppercase leading-4 tracking-wide text-muted">
        {name}
      </span>
      <div role="listbox" aria-label={name || "AM or PM"} className={WHEEL}>
        {children}
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <label htmlFor={fieldId} className={labelClassName}>
        {label}
      </label>

      <button
        ref={triggerRef}
        id={fieldId}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={toggle}
        className={triggerClassName}
      >
        {icon}
        <span className={textClassName}>{formatTime12(value)}</span>
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label={`Choose ${label} time`}
          className={`absolute z-50 w-56 max-w-[calc(100vw-2rem)] rounded-2xl border-2 border-brand/20 bg-surface p-2.5 shadow-[0_10px_30px_0_rgba(26,26,78,0.25)] sm:w-60 sm:p-3 ${
            openAbove ? "bottom-full mb-2" : "top-full mt-2"
          } ${align === "right" ? "right-0" : "left-0"}`}
        >
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_3rem] gap-1.5 sm:gap-2">
            {column(
              "Hour",
              HOURS.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="option"
                  aria-selected={option === hour}
                  onClick={() => onChange(toValue(option, minute, period))}
                  className={optionClass(option === hour)}
                >
                  {String(option).padStart(2, "0")}
                </button>
              )),
            )}
            {column(
              "Min",
              minutes.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="option"
                  aria-selected={option === minute}
                  onClick={() => onChange(toValue(hour, option, period))}
                  className={optionClass(option === minute)}
                >
                  {String(option).padStart(2, "0")}
                </button>
              )),
            )}
            {column(
              "",
              PERIODS.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="option"
                  aria-selected={option === period}
                  onClick={() => onChange(toValue(hour, minute, option))}
                  className={optionClass(option === period)}
                >
                  {option}
                </button>
              )),
            )}
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-2.5 flex h-9 w-full items-center justify-center rounded-lg bg-[#1A1A4E] text-[13px] font-bold text-[#FAF7F2] transition-opacity hover:opacity-90 dark:bg-[#FAF7F2] dark:text-[#1A1A4E]"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
