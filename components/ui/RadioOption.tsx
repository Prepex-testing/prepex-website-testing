import type { ReactNode } from "react";

type RadioOptionProps = {
  name: string;
  value: string;
  label: string;
  selected: boolean;
  onSelect: () => void;
  children?: ReactNode;
};

export function RadioOption({
  name,
  value,
  label,
  selected,
  onSelect,
  children,
}: RadioOptionProps) {
  return (
    // Box — 681x56 min, radius Medium, border 1.5px, shadow when selected
    <div
      className={`rounded-xl border-[1.5px] bg-surface p-4 shadow-[0_1px_2px_0_rgba(26,26,78,0.06)] transition-colors ${
        selected ? "border-ink" : "border-brand/15 dark:border-white/15"
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
        <span className="text-[14px] font-semibold leading-[100%] text-ink sm:text-[16px]">
          {label}
        </span>
      </label>

      {selected && children && (
        <div className="mt-4 flex flex-col gap-6 pl-9">{children}</div>
      )}
    </div>
  );
}