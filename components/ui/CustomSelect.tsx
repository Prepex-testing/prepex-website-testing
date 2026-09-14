"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "@/components/ui/icons";

type CustomSelectOption = {
  value: string;
  label: string;
};

type CustomSelectProps = {
  label: string;
  options: CustomSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  labelClassName?: string;
  /** Replaces the trigger's font-size class once a value is picked. */
  valueTextClassName?: string;
  /** Replaces the trigger's font-size class while the placeholder shows. */
  placeholderTextClassName?: string;
  /** Replaces the trigger's box metrics — height, gap, radius and padding. */
  triggerClassName?: string;
  /** Replaces the chevron's size classes. */
  chevronClassName?: string;
  /** Extra classes for the root wrapper, e.g. a fixed width. */
  className?: string;
};

export function CustomSelect({
  label,
  options,
  value,
  onChange,
  placeholder,
  labelClassName = "text-body-lg font-medium leading-none text-body-text dark:text-ink",
  valueTextClassName = "text-[16px]",
  placeholderTextClassName = "text-[14px]",
  triggerClassName = "h-12.25 gap-2 rounded-xl px-4 py-3",
  chevronClassName = "h-6 w-3",
  className = "",
}: CustomSelectProps) {
  const [isOpen, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedLabel = options.find((option) => option.value === value)?.label;

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative flex min-w-0 max-w-full flex-col gap-2 ${className}`}>
      <label className={labelClassName}>
        {label}
      </label>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setOpen((open) => !open)}
        className={`flex min-w-0 w-full max-w-full items-center justify-between border border-input-border bg-surface text-left font-['Plus_Jakarta_Sans'] outline-none transition-colors focus:border-input-border ${triggerClassName} ${selectedLabel ? `${valueTextClassName} font-medium text-ink` : `${placeholderTextClassName} font-normal text-[#666666] dark:text-[#8B8998]`}`}
      >
        <span className="min-w-0 flex-1 truncate">{selectedLabel ?? placeholder}</span>
        <ChevronDownIcon className={`shrink-0 text-muted ${chevronClassName}`} />
      </button>
      {isOpen && (
        <div
          role="listbox"
          className="absolute inset-x-0 top-full z-30 mt-1 max-h-56 max-w-full overflow-y-auto rounded-xl border border-input-border bg-surface p-1 shadow-modal"
        >
          {options.length > 0 ? options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className="block w-full min-w-0 truncate rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-tint-strong"
              title={option.label}
            >
              {option.label}
            </button>
          )) : (
            <p className="px-3 py-2 text-sm text-muted">No options available</p>
          )}
        </div>
      )}
    </div>
  );
}
