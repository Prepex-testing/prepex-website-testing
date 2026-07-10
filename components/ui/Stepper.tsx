import { MinusIcon, PlusIcon } from "@/components/ui/icons";

type StepperProps = {
  label: string;
  value: number;
  unit?: string;
  min?: number;
  max?: number;
  disabled?: boolean;
  onChange: (value: number) => void;
};

export function Stepper({
  label,
  value,
  unit = "Hours",
  min = 1,
  max = 16,
  disabled = false,
  onChange,
}: StepperProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-ink">{label}</span>
      <div
        className={`flex items-center justify-between rounded-xl border px-2 py-1.5 ${
          disabled
            ? "border-brand/10 bg-tint-strong/60 opacity-60"
            : "border-brand/15 bg-surface"
        }`}
      >
        <button
          type="button"
          aria-label={`Decrease ${label.toLowerCase()}`}
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={disabled || value <= min}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-brand/15 text-ink disabled:opacity-40"
        >
          <MinusIcon />
        </button>
        <span className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-ink">{value}</span>
          <span className="text-[10px] font-medium uppercase text-muted">
            {unit}
          </span>
        </span>
        <button
          type="button"
          aria-label={`Increase ${label.toLowerCase()}`}
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={disabled || value >= max}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-brand/15 text-ink disabled:opacity-40"
        >
          <PlusIcon />
        </button>
      </div>
    </div>
  );
}
