import type { ReactNode } from "react";

type RadioOptionProps = {
  name: string;
  value: string;
  label: string;
  selected: boolean;
  onSelect: () => void;
  children?: ReactNode;
  /** Text color classes applied to the label when this option is NOT selected. Defaults to the standard ink color. */
  unselectedLabelClassName?: string;
  /** Extra classes merged onto the box border/shadow when NOT selected. */
  unselectedBoxClassName?: string;
  /** Extra classes merged onto the box border when selected. */
  selectedBoxClassName?: string;
};

export function RadioOption({
  name,
  value,
  label,
  selected,
  onSelect,
  children,
  unselectedLabelClassName = "text-ink",
  unselectedBoxClassName = "",
  selectedBoxClassName = "",
}: RadioOptionProps) {
  return (
    // Box — 681x56 min, radius Medium, border 1.5px, shadow when selected
    <div
      className={`rounded-xl border-[1.5px] bg-surface p-4 shadow-[0_1px_2px_0_rgba(26,26,78,0.06)] transition-colors ${
        selected
          ? `border-ink ${selectedBoxClassName}`
          : `border-brand/15 dark:border-white/15 ${unselectedBoxClassName}`
      }`}
    >
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="radio"
          name={name}
          value={value}
          checked={selected}
          onChange={onSelect}
          className="peer sr-only"
        />
        {/* Indicator — 24x24 */}
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 peer-focus-visible:ring-2 peer-focus-visible:ring-focus-ring ${
            selected ? "border-ink" : "border-brand/25 dark:border-white/25"
          }`}
        >
          {selected && <span className="h-3 w-3 rounded-full bg-ink" />}
        </span>
        <span
          className={`text-[14px] font-semibold leading-[100%] sm:text-[16px] ${
            selected ? "text-ink" : unselectedLabelClassName
          }`}
        >
          {label}
        </span>
      </label>

      {children && (
        <div
          aria-hidden={!selected}
          className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-500 ease-in-out ${
            selected ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="min-h-0">
            <div className="flex flex-col gap-6 pl-9 pt-4">{children}</div>
          </div>
        </div>
      )}
    </div>
  );
}