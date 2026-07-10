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
    <div
      className={`rounded-xl border p-4 transition-colors ${
        selected ? "border-brand bg-tint-strong" : "border-brand/15 bg-surface"
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
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-brand/25 peer-checked:border-brand peer-focus-visible:ring-2 peer-focus-visible:ring-focus-ring">
          {selected && <span className="h-2.5 w-2.5 rounded-full bg-brand" />}
        </span>
        <span className="text-sm font-semibold text-ink">{label}</span>
      </label>

      {selected && children && (
        <div className="mt-4 flex flex-col gap-3 pl-8">{children}</div>
      )}
    </div>
  );
}
